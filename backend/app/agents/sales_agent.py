"""
Sales Agent - FIXED
- When CSV source is active: reads AND writes the actual CSV file so pages
  refresh with live data immediately
- When DB source is active: reads and writes DB as before
- Every successful write prefixes response with __ACTION__:sales_write
  so the frontend dispatches an immediate page refresh event
- Date filtering applied consistently to both CSV and DB paths
"""
import json, re, csv, os
from datetime import datetime, date
from typing import Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from langchain_core.messages import AIMessage
from app.models.sales import Sales
from app.models.inventory import Inventory
from app.graph.state import AgentState
from app.core.llm import get_llm, invoke_with_fallback
from app.core.db_config import (
    get_current_db_url, get_active_source, load_csv_data
)


def get_session() -> Session:
    url    = get_current_db_url()
    engine = create_engine(url, pool_pre_ping=True)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)()


def _parse_date(val) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    try:
        clean = str(val).split("T")[0].split(" ")[0].strip()
        return datetime.strptime(clean, "%Y-%m-%d").date()
    except Exception:
        return None


def _get_csv_path(data_type: str) -> str:
    try:
        from app.core.db_config import get_csv_path
        return get_csv_path(data_type)
    except Exception:
        base = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        for candidate in [
            os.path.join(base, "data", f"{data_type}.csv"),
            os.path.join(base, f"{data_type}.csv"),
            os.path.join(base, "app", "data", f"{data_type}.csv"),
        ]:
            if os.path.exists(candidate):
                return candidate
        return os.path.join(base, "data", f"{data_type}.csv")


def _write_csv(data_type: str, items: list):
    if not items:
        return
    path = _get_csv_path(data_type)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fieldnames = list(items[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(items)


def _next_csv_id(items: list) -> int:
    try:
        return max(int(i.get("id", 0)) for i in items) + 1
    except Exception:
        return 1


def get_sales_summary(
    db: Session = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> str:
    close = db is None
    if close:
        db = get_session()
    try:
        if get_active_source() == "csv":
            all_sales = load_csv_data("sales")
        else:
            raw = db.query(Sales).all()
            all_sales = [
                {
                    "product":   s.product,
                    "sku":       s.sku,
                    "quantity":  s.quantity,
                    "amount":    s.amount,
                    "category":  s.category,
                    "sale_date": str(s.sale_date) if s.sale_date else None,
                }
                for s in raw
            ]

        if not all_sales:
            return "No sales data available."

        if date_from or date_to:
            filtered = []
            for s in all_sales:
                sd = _parse_date(s.get("sale_date"))
                if sd is None:
                    continue
                if date_from and sd < date_from:
                    continue
                if date_to and sd > date_to:
                    continue
                filtered.append(s)
            sales = filtered
        else:
            sales = all_sales

        if not sales:
            period = ""
            if date_from and date_to:
                period = f" between {date_from} and {date_to}"
            elif date_from:
                period = f" from {date_from} onwards"
            elif date_to:
                period = f" up to {date_to}"
            return f"No sales data available{period}."

        total_rev   = sum(float(s.get("amount") or 0) for s in sales)
        total_units = sum(int(s.get("quantity") or 0) for s in sales)
        pr = {}; pu = {}; cr = {}
        for s in sales:
            p   = s.get("product", "Unknown")
            amt = float(s.get("amount") or 0)
            qty = int(s.get("quantity") or 0)
            pr[p] = pr.get(p, 0) + amt
            pu[p] = pu.get(p, 0) + qty
            cat = s.get("category") or ""
            if cat:
                cr[cat] = cr.get(cat, 0) + amt

        period_label = ""
        if date_from and date_to:
            period_label = f" ({date_from} to {date_to})"
        elif date_from:
            period_label = f" (from {date_from})"
        elif date_to:
            period_label = f" (up to {date_to})"

        ctx = (
            f"SALES SUMMARY{period_label}:\n"
            f"Total Revenue: ${total_rev:,.2f}\n"
            f"Units: {total_units}\n"
            f"Transactions: {len(sales)}\n\n"
            "BY PRODUCT:\n"
        )
        for p, r in sorted(pr.items(), key=lambda x: x[1], reverse=True):
            ctx += f"  {p}: ${r:,.2f} ({pu[p]} units)\n"
        ctx += "\nBY CATEGORY:\n"
        for c, r in sorted(cr.items(), key=lambda x: x[1], reverse=True):
            ctx += f"  {c}: ${r:,.2f}\n"
        ctx += "\nRECENT:\n"
        recent = sorted(
            sales, key=lambda x: str(x.get("sale_date") or ""), reverse=True
        )[:5]
        for s in recent:
            ctx += f"  {s.get('product')}: {s.get('quantity')} units @ ${float(s.get('amount') or 0):,.2f}\n"
        return ctx
    finally:
        if close:
            db.close()


def generate_sql(user_input: str, llm) -> str:
    try:
        sql_prompt = f"""Generate a PostgreSQL SELECT query.
Table: sales | Columns: id,product,sku,quantity,amount,category,sale_date
Return ONLY the SQL, no markdown. Question: {user_input}"""
        r   = llm.invoke(sql_prompt)
        sql = r.content.strip().replace('```sql', '').replace('```', '').strip()
        return sql if sql.upper().startswith('SELECT') else None
    except Exception:
        return None


def execute_sql(sql: str, db: Session) -> str:
    try:
        result = db.execute(text(sql))
        rows   = result.fetchall()
        cols   = list(result.keys())
        if not rows:
            return ""
        out = " | ".join(cols) + "\n" + "-" * 40 + "\n"
        for row in rows[:20]:
            out += " | ".join(str(v) for v in row) + "\n"
        return out
    except Exception:
        return ""


def execute_sales_action(
    user_message: str,
    db: Session,
    llm,
    history_ctx: str = "",
) -> str:
    active = get_active_source()

    # Build current sales list for context (so LLM can match IDs for edit/delete)
    if active == "csv":
        all_sales_for_ctx = load_csv_data("sales")
    else:
        raw = db.query(Sales).all()
        all_sales_for_ctx = [
            {
                "id": s.id, "product": s.product, "sku": s.sku,
                "quantity": s.quantity, "amount": s.amount,
                "category": s.category,
                "sale_date": str(s.sale_date) if s.sale_date else None,
            }
            for s in raw
        ]

    # Build inventory list for deduction context
    inv_items = db.query(Inventory).all()
    inv_list  = "\n".join(
        f"  ID={i.id}|Name={i.name}|SKU={i.sku}|Qty={i.quantity}"
        for i in inv_items
    )
    sales_list = "\n".join(
        f"  ID={s.get('id')}|Product={s.get('product')}|SKU={s.get('sku','')}|"
        f"Qty={s.get('quantity')}|Amount={s.get('amount')}|Date={s.get('sale_date','')}"
        for s in all_sales_for_ctx[-30:]  # last 30 records for context
    )

    parse_prompt = f"""Parse this sales management request and output ONLY valid JSON.

CURRENT SALES (last 30):
{sales_list}

INVENTORY:
{inv_list}

{history_ctx}

REQUEST: {user_message}

Output ONE of these JSON formats:

For recording a new sale:
{{"action":"create","product":"<name>","sku":"<sku or null>","quantity":<int>,"amount":<float total>,"category":"<category or null>"}}

For editing/updating an existing sale:
{{"action":"update","sale_id":<int>,"fields":{{"product":"<str>","quantity":<int>,"amount":<float>,"category":"<str>"}}}}

For deleting a sale by ID:
{{"action":"delete","sale_id":<int>,"reason":"<why>"}}

For deleting sales by product name (bulk):
{{"action":"delete_by_product","product":"<name>","reason":"<why>"}}

Rules:
- quantity must be positive integer
- amount is TOTAL revenue (not unit price)
- For delete: match sale_id from the CURRENT SALES list above
- ONLY JSON, nothing else.
"""

    raw = invoke_with_fallback(llm, parse_prompt)
    try:
        match = re.search(r'\{.*\}', raw.strip(), re.DOTALL)
        if not match:
            return "Could not parse sale details."
        parsed = json.loads(match.group())
    except Exception as e:
        return f"Failed to parse sale request: {str(e)}"

    action = parsed.get("action", "create")

    # ── DELETE by ID ──────────────────────────────────────────────────────────
    if action == "delete":
        sale_id = parsed.get("sale_id")
        if not sale_id:
            return "Delete failed: no sale ID specified."

        if active == "csv":
            sales = load_csv_data("sales")
            target = next((s for s in sales if str(s.get("id")) == str(sale_id)), None)
            if not target:
                return f"Sale ID {sale_id} not found."
            product = target.get("product", "?")
            _write_csv("sales", [s for s in sales if str(s.get("id")) != str(sale_id)])
            return (
                f"__ACTION__:sales_write\n"
                f"Deleted sale record ID:{sale_id} for '{product}'."
            )
        else:
            sale = db.query(Sales).filter(Sales.id == sale_id).first()
            if not sale:
                return f"Sale ID {sale_id} not found."
            product = sale.product
            db.delete(sale)
            db.commit()
            return (
                f"__ACTION__:sales_write\n"
                f"Deleted sale record ID:{sale_id} for '{product}'."
            )

    # ── DELETE by product name ────────────────────────────────────────────────
    if action == "delete_by_product":
        product_name = parsed.get("product", "").strip().lower()
        if not product_name:
            return "Delete failed: no product name specified."

        if active == "csv":
            sales = load_csv_data("sales")
            to_delete = [s for s in sales if product_name in s.get("product", "").lower()]
            if not to_delete:
                return f"No sales found for product '{product_name}'."
            remaining = [s for s in sales if product_name not in s.get("product", "").lower()]
            _write_csv("sales", remaining)
            return (
                f"__ACTION__:sales_write\n"
                f"Deleted {len(to_delete)} sale record(s) for '{product_name}'."
            )
        else:
            from sqlalchemy import func
            rows = db.query(Sales).filter(
                func.lower(Sales.product).contains(product_name)
            ).all()
            if not rows:
                return f"No sales found for product '{product_name}'."
            count = len(rows)
            for row in rows:
                db.delete(row)
            db.commit()
            return (
                f"__ACTION__:sales_write\n"
                f"Deleted {count} sale record(s) for '{product_name}'."
            )

    # ── UPDATE existing sale ──────────────────────────────────────────────────
    if action == "update":
        sale_id = parsed.get("sale_id")
        fields  = parsed.get("fields", {})
        if not sale_id:
            return "Update failed: no sale ID specified."

        if active == "csv":
            sales  = load_csv_data("sales")
            target = next((s for s in sales if str(s.get("id")) == str(sale_id)), None)
            if not target:
                return f"Sale ID {sale_id} not found."
            changes = []
            for field, value in fields.items():
                if value is not None:
                    changes.append(f"{field}: {target.get(field)} → {value}")
                    target[field] = value
            _write_csv("sales", sales)
            return (
                f"__ACTION__:sales_write\n"
                f"Updated sale ID:{sale_id} ({target.get('product')}). Changes: {', '.join(changes)}."
            )
        else:
            sale = db.query(Sales).filter(Sales.id == sale_id).first()
            if not sale:
                return f"Sale ID {sale_id} not found."
            changes = []
            allowed = {"product", "sku", "quantity", "amount", "category"}
            for field, value in fields.items():
                if field in allowed and value is not None:
                    old = getattr(sale, field)
                    setattr(sale, field, value)
                    changes.append(f"{field}: {old} → {value}")
            db.commit()
            db.refresh(sale)
            return (
                f"__ACTION__:sales_write\n"
                f"Updated sale ID:{sale_id} ({sale.product}). Changes: {', '.join(changes)}."
            )

    # ── CREATE new sale (default) ─────────────────────────────────────────────
    product  = parsed.get("product", "").strip()
    quantity = int(parsed.get("quantity", 0))
    amount   = float(parsed.get("amount", 0.0))
    if not product or quantity <= 0 or amount <= 0:
        return "Invalid sale details: need product name, quantity > 0, and amount > 0."

    sale_date_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # Helper: find and deduct from inventory
    def _deduct_inventory(product_name: str, sku: Optional[str], qty: int) -> str:
        inv_item = None
        if sku:
            inv_item = db.query(Inventory).filter(Inventory.sku == sku).first()
        if not inv_item:
            for i in inv_items:
                if (
                    product_name.lower() in i.name.lower()
                    or i.name.lower() in product_name.lower()
                ):
                    inv_item = db.query(Inventory).filter(Inventory.id == i.id).first()
                    break
        if not inv_item:
            return "No matching inventory item to deduct."
        old = inv_item.quantity
        inv_item.quantity = max(0, inv_item.quantity - qty)
        db.commit()
        db.refresh(inv_item)

        # If CSV is active for inventory, also update CSV inventory
        if active == "csv":
            from app.core.db_config import load_csv_data as _lcd
            inv_csv = _lcd("inventory")
            for ci in inv_csv:
                if str(ci.get("id")) == str(inv_item.id):
                    ci["quantity"] = inv_item.quantity
                    break
            _write_csv("inventory", inv_csv)

        st = "LOW STOCK" if inv_item.quantity <= inv_item.reorder_point else "OK"
        return (
            f"Inventory '{inv_item.name}' updated: {old} → {inv_item.quantity}. Status: {st}."
        )

    if active == "csv":
        sales  = load_csv_data("sales")
        new_id = _next_csv_id(sales)
        new_sale = {
            "id":        new_id,
            "product":   product,
            "sku":       parsed.get("sku") or "",
            "quantity":  quantity,
            "amount":    amount,
            "category":  parsed.get("category") or "",
            "sale_date": sale_date_str,
        }
        sales.append(new_sale)
        _write_csv("sales", sales)
        inv_result = _deduct_inventory(product, parsed.get("sku"), quantity)
        return (
            f"__ACTION__:sales_write\n"
            f"Sale recorded: {quantity} units of '{product}' for "
            f"${amount:,.2f} (ID:{new_id}). {inv_result}"
        )

    # DB path
    sale = Sales(
        product=product,
        sku=parsed.get("sku") or None,
        quantity=quantity,
        amount=amount,
        category=parsed.get("category") or None,
        sale_date=datetime.utcnow(),
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    inv_result = _deduct_inventory(product, parsed.get("sku"), quantity)
    return (
        f"__ACTION__:sales_write\n"
        f"Sale recorded: {quantity} units of '{product}' for "
        f"${amount:,.2f} (ID:{sale.id}). {inv_result}"
    )


SALES_WRITE_KEYWORDS = [
    "record sale", "add sale", "log sale", "new sale",
    "delete sale", "remove sale", "delete sales", "remove sales",
    "update sale", "edit sale", "modify sale", "change sale",
    "mark as sold", "sold ", "record a sale",
]

def is_sales_write_intent(user_input: str) -> bool:
    msg = user_input.lower()
    return any(kw in msg for kw in SALES_WRITE_KEYWORDS)



def sales_agent(state: AgentState) -> AgentState:
    messages  = state["messages"]
    date_from: Optional[date] = state.get("date_from")
    date_to:   Optional[date] = state.get("date_to")
    db  = get_session()
    llm = get_llm()

    if is_sales_write_intent(messages[-1].content):
        result       = execute_sales_action(messages[-1].content, db, llm)
        clean_result = result.replace("__ACTION__:sales_write\n", "")
        db.close()
        return {
            "messages": messages + [AIMessage(content=clean_result)],
            "next":     "end",
            "response": result,
        }

    sql_results = ""
    try:
        sql = generate_sql(messages[-1].content, llm)
        if sql:
            sql_results = execute_sql(sql, db)
    except Exception:
        pass

    context = get_sales_summary(db, date_from=date_from, date_to=date_to)
    db.close()

    data = (
        f"QUERY RESULTS:\n{sql_results}\n\nSALES DATA:\n{context}"
        if sql_results
        else f"SALES DATA:\n{context}"
    )

    period_note = ""
    if date_from and date_to:
        period_note = (
            f" The user is asking about the period {date_from} to {date_to}."
            " Only use data from that range."
        )
    elif date_from:
        period_note = (
            f" The user is asking about data from {date_from} onwards."
            " Only use data from that range."
        )
    elif date_to:
        period_note = (
            f" The user is asking about data up to {date_to}."
            " Only use data from that range."
        )

    prompt = f"""You are a sales analysis assistant.{period_note}
{data}
Question: {messages[-1].content}
Reply in 1-3 plain English sentences. Include key numbers. No *, **, #, - symbols."""
    r = invoke_with_fallback(llm, prompt)
    return {"messages": messages + [AIMessage(content=r)], "next": "end", "response": r}