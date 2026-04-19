"""
Sales Agent — OLD PROJECT (LLM-based)
FIXED: get_session() uses current DB URL. Writes always to DB.
"""
import json, re
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from langchain_core.messages import AIMessage
from app.models.sales import Sales
from app.models.inventory import Inventory
from app.graph.state import AgentState
from app.core.llm import get_llm, invoke_with_fallback
from app.core.db_config import (
    get_current_db_url, get_active_source, load_csv_data, set_active_source
)


def get_session() -> Session:
    url    = get_current_db_url()
    engine = create_engine(url, pool_pre_ping=True)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def get_sales_summary(db: Session = None) -> str:
    close = db is None
    if close: db = get_session()
    try:
        if get_active_source() == "csv":
            sales = load_csv_data("sales")
        else:
            raw   = db.query(Sales).all()
            sales = [{"product":s.product,"sku":s.sku,"quantity":s.quantity,
                      "amount":s.amount,"category":s.category,"sale_date":str(s.sale_date)} for s in raw]

        if not sales: return "No sales data available."
        total_rev  = sum(float(s.get("amount") or 0) for s in sales)
        total_units= sum(int(s.get("quantity") or 0) for s in sales)
        pr = {}; pu = {}; cr = {}
        for s in sales:
            p   = s.get("product","Unknown")
            amt = float(s.get("amount") or 0)
            qty = int(s.get("quantity") or 0)
            pr[p] = pr.get(p,0) + amt
            pu[p] = pu.get(p,0) + qty
            cat = s.get("category") or ""
            if cat: cr[cat] = cr.get(cat,0) + amt
        ctx = (f"SALES SUMMARY:\nTotal Revenue:${total_rev:,.2f}\nUnits:{total_units}\nTransactions:{len(sales)}\n\n"
               "BY PRODUCT:\n")
        for p,r in sorted(pr.items(),key=lambda x:x[1],reverse=True):
            ctx += f"  {p}: ${r:,.2f} ({pu[p]} units)\n"
        ctx += "\nBY CATEGORY:\n"
        for c,r in sorted(cr.items(),key=lambda x:x[1],reverse=True):
            ctx += f"  {c}: ${r:,.2f}\n"
        ctx += "\nRECENT:\n"
        recent = sorted(sales,key=lambda x:str(x.get("sale_date") or ""),reverse=True)[:5]
        for s in recent:
            ctx += f"  {s.get('product')}: {s.get('quantity')} units @ ${float(s.get('amount') or 0):,.2f}\n"
        return ctx
    finally:
        if close: db.close()


def generate_sql(user_input: str, llm) -> str:
    try:
        sql_prompt = f"""Generate a PostgreSQL SELECT query.
Table: sales | Columns: id,product,sku,quantity,amount,category,sale_date
Return ONLY the SQL, no markdown. Question: {user_input}"""
        r   = llm.invoke(sql_prompt)
        sql = r.content.strip().replace('```sql','').replace('```','').strip()
        return sql if sql.upper().startswith('SELECT') else None
    except: return None


def execute_sql(sql: str, db: Session) -> str:
    try:
        result = db.execute(text(sql)); rows = result.fetchall(); cols = list(result.keys())
        if not rows: return ""
        out = " | ".join(cols) + "\n" + "-"*40 + "\n"
        for row in rows[:20]: out += " | ".join(str(v) for v in row) + "\n"
        return out
    except: return ""


def execute_sales_action(user_message: str, db: Session, inv_db: Session, llm, history_ctx: str = "") -> str:
    inv_items = inv_db.query(Inventory).all()
    inv_list  = "\n".join(f"  ID={i.id}|Name={i.name}|SKU={i.sku}|Qty={i.quantity}" for i in inv_items)
    parse_prompt = f"""Parse this sale request and output ONLY valid JSON.
INVENTORY:
{inv_list}
{history_ctx}
REQUEST: {user_message}
JSON: {{"product":"<name>","sku":"<sku or null>","quantity":<int>,"amount":<float total>,"category":"<category or null>"}}
quantity must be positive. amount is TOTAL (not unit price). ONLY JSON."""

    raw = invoke_with_fallback(llm, parse_prompt)
    try:
        match  = re.search(r'\{.*\}', raw.strip(), re.DOTALL)
        if not match: return "Could not parse sale details."
        parsed = json.loads(match.group())
    except Exception as e:
        return f"Failed to parse sale: {str(e)}"

    product  = parsed.get("product","").strip()
    quantity = int(parsed.get("quantity",0))
    amount   = float(parsed.get("amount",0.0))
    if not product or quantity<=0 or amount<=0:
        return "Invalid sale details: need product name, quantity, and amount."

    sale = Sales(product=product,sku=parsed.get("sku") or None,quantity=quantity,
                 amount=amount,category=parsed.get("category") or None,sale_date=datetime.utcnow())
    db.add(sale); db.commit(); db.refresh(sale)

    inv_item = None
    if parsed.get("sku"):
        inv_item = inv_db.query(Inventory).filter(Inventory.sku==parsed["sku"]).first()
    if not inv_item:
        for i in inv_items:
            if product.lower() in i.name.lower() or i.name.lower() in product.lower():
                inv_item = inv_db.query(Inventory).filter(Inventory.id==i.id).first(); break

    inv_result = "No matching inventory item to deduct."
    if inv_item:
        old = inv_item.quantity; inv_item.quantity = max(0, inv_item.quantity-quantity)
        inv_db.commit(); inv_db.refresh(inv_item)
        st  = "LOW STOCK" if inv_item.quantity<=inv_item.reorder_point else "OK"
        inv_result = f"Inventory '{inv_item.name}' updated: {old} to {inv_item.quantity}. Status:{st}."

    set_active_source("db")
    return f"Sale recorded: {quantity} units of '{product}' for ${amount:,.2f} (ID:{sale.id}). {inv_result}"


def sales_agent(state: AgentState) -> AgentState:
    messages = state["messages"]
    db  = get_session(); llm = get_llm()
    sql_results = ""
    try:
        sql = generate_sql(messages[-1].content, llm)
        if sql: sql_results = execute_sql(sql, db)
    except: pass
    context = get_sales_summary(db); db.close()
    data    = f"QUERY RESULTS:\n{sql_results}\n\nSALES DATA:\n{context}" if sql_results else f"SALES DATA:\n{context}"
    prompt  = f"""You are a sales analysis assistant.
{data}
Question: {messages[-1].content}
Reply in 1-3 plain English sentences. Include key numbers. No *, **, #, - symbols."""
    r = invoke_with_fallback(llm, prompt)
    return {"messages":messages+[AIMessage(content=r)],"next":"end","response":r}