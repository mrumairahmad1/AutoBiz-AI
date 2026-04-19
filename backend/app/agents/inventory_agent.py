"""
Inventory Agent — FIXED
- REMOVED set_active_source("db") after writes — source stays as user set it
- Writes always go to DB; active source is never auto-changed
"""
import math, json, re
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from langchain_core.messages import AIMessage
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


def calculate_eoq(annual_demand, ordering_cost, holding_cost):
    if holding_cost <= 0:
        return 0
    return math.sqrt((2 * annual_demand * ordering_cost) / holding_cost)


def get_inventory_summary(db: Session = None) -> str:
    close = db is None
    if close:
        db = get_session()
    try:
        if get_active_source() == "csv":
            items = load_csv_data("inventory")
            if not items:
                return "No inventory data available."
            ctx      = "INVENTORY STATUS:\n"
            low_list = []
            for item in items:
                qty = item.get("quantity", 0)
                rp  = item.get("reorder_point", 0)
                st  = "LOW STOCK" if qty <= rp else "OK"
                if st == "LOW STOCK":
                    low_list.append(item.get("name", ""))
                ctx += (
                    f"  - {item.get('name')} (SKU:{item.get('sku','?')}, ID:{item.get('id','?')})\n"
                    f"    Status:{st} | Stock:{qty} | Reorder at:{rp} | "
                    f"Cost:${item.get('unit_cost',0):.2f} | Supplier:{item.get('supplier','?')}\n"
                )
            if low_list:
                ctx += f"\nLOW STOCK: {', '.join(low_list)}\n"
            return ctx

        items = db.query(Inventory).all()
        if not items:
            return "No inventory data available."
        ctx      = "INVENTORY STATUS:\n"
        low_list = []
        for item in items:
            st = "OK"
            if item.quantity <= item.reorder_point:
                st = "LOW STOCK"
                low_list.append(item.name)
            eoq = calculate_eoq(item.quantity * 12, item.ordering_cost, item.holding_cost)
            ctx += (
                f"  - {item.name} (SKU:{item.sku}, ID:{item.id})\n"
                f"    Status:{st} | Stock:{item.quantity} | Reorder at:{item.reorder_point} | "
                f"Reorder qty:{item.reorder_quantity} | Cost:${item.unit_cost:.2f} | "
                f"Supplier:{item.supplier} (Lead:{item.supplier_lead_days}d) | EOQ:{eoq:.0f}\n"
            )
        if low_list:
            ctx += f"\nLOW STOCK: {', '.join(low_list)}\n"
        return ctx
    finally:
        if close:
            db.close()


WRITE_KEYWORDS = [
    "add", "create", "new item", "restock", "update", "change quantity",
    "set quantity", "delete", "remove", "edit", "increase stock",
    "decrease stock", "adjust",
]

def is_write_intent(user_input: str) -> bool:
    return any(kw in user_input.lower() for kw in WRITE_KEYWORDS)


def execute_inventory_action(
    user_message: str,
    db: Session,
    llm,
    history_ctx: str = "",
) -> str:
    # Always read from DB for action context (need IDs)
    items      = db.query(Inventory).all()
    items_list = "\n".join(
        f"  ID={i.id} | Name={i.name} | SKU={i.sku} | Qty={i.quantity} | "
        f"ReorderPoint={i.reorder_point} | ReorderQty={i.reorder_quantity} | "
        f"Cost={i.unit_cost} | Supplier={i.supplier}"
        for i in items
    )
    parse_prompt = f"""Parse the inventory request and output ONLY valid JSON.

INVENTORY:
{items_list}

{history_ctx}

REQUEST: {user_message}

Output one of:
{{"action":"restock","item_id":<int>,"new_quantity":<int or null>,"reason":"<why>"}}
{{"action":"update","item_id":<int>,"fields":{{"quantity":<int>,"reorder_point":<int>,"unit_cost":<float>}},"reason":"<why>"}}
{{"action":"delete","item_id":<int>,"reason":"<why>"}}
{{"action":"create","name":"<str>","sku":"<str>","quantity":<int>,"reorder_point":<int>,"reorder_quantity":<int>,"unit_cost":<float>,"supplier":"<str or null>","reason":"<why>"}}
{{"action":"unknown","reason":"<why>"}}

ONLY JSON. Nothing else."""

    raw = invoke_with_fallback(llm, parse_prompt)
    try:
        match = re.search(r'\{.*\}', raw.strip(), re.DOTALL)
        if not match:
            return "Could not parse action from request."
        parsed = json.loads(match.group())
    except Exception as e:
        return f"Failed to parse action: {str(e)}"

    action = parsed.get("action", "unknown")
    active = get_active_source()
    # Note appended when csv is active so user knows where data was saved
    csv_note = " (Switch source to DB to see this change in the Inventory page.)" if active == "csv" else ""

    if action == "restock":
        item = db.query(Inventory).filter(Inventory.id == parsed.get("item_id")).first()
        if not item:
            return f"Item ID {parsed.get('item_id')} not found."
        old = item.quantity
        nq  = parsed.get("new_quantity") or max(
            item.reorder_quantity, item.reorder_point + item.reorder_quantity
        )
        item.quantity = nq
        db.commit()
        db.refresh(item)
        # NOT switching active source
        return (
            f"Restocked '{item.name}': {old} to {nq} units. "
            f"Status: {'LOW STOCK' if item.quantity <= item.reorder_point else 'OK'}.{csv_note}"
        )

    elif action == "update":
        item = db.query(Inventory).filter(Inventory.id == parsed.get("item_id")).first()
        if not item:
            return f"Item ID {parsed.get('item_id')} not found."
        changes = []
        for field, value in (parsed.get("fields") or {}).items():
            if hasattr(item, field) and value is not None:
                old = getattr(item, field)
                setattr(item, field, value)
                changes.append(f"{field}: {old} to {value}")
        db.commit()
        db.refresh(item)
        # NOT switching active source
        return (
            f"Updated '{item.name}'. Changes: {', '.join(changes)}. "
            f"Current quantity: {item.quantity}.{csv_note}"
        )

    elif action == "delete":
        item = db.query(Inventory).filter(Inventory.id == parsed.get("item_id")).first()
        if not item:
            return f"Item ID {parsed.get('item_id')} not found."
        name, sku = item.name, item.sku
        db.delete(item)
        db.commit()
        # NOT switching active source
        return f"Deleted '{name}' (SKU:{sku}) from inventory.{csv_note}"

    elif action == "create":
        sku = (parsed.get("sku") or "").strip()
        if not sku:
            return "Cannot create item: SKU is required."
        if db.query(Inventory).filter(Inventory.sku == sku).first():
            return f"Item with SKU '{sku}' already exists."
        ni = Inventory(
            name=parsed.get("name", "New Item"), sku=sku,
            quantity=parsed.get("quantity", 0),
            reorder_point=parsed.get("reorder_point", 10),
            reorder_quantity=parsed.get("reorder_quantity", 50),
            unit_cost=parsed.get("unit_cost", 0.0),
            holding_cost=1.0, ordering_cost=50.0,
            supplier=parsed.get("supplier"), supplier_lead_days=7,
        )
        db.add(ni)
        db.commit()
        db.refresh(ni)
        # NOT switching active source
        return (
            f"Created '{ni.name}' (SKU:{ni.sku}, ID:{ni.id}) with "
            f"{ni.quantity} units at ${ni.unit_cost}/unit.{csv_note}"
        )

    return f"Action not recognized. Reason: {parsed.get('reason', 'unknown')}"


def inventory_agent(state: AgentState) -> AgentState:
    messages = state["messages"]
    db  = get_session()
    llm = get_llm()
    if is_write_intent(messages[-1].content):
        result = execute_inventory_action(messages[-1].content, db, llm)
        db.close()
        return {"messages": messages + [AIMessage(content=result)], "next": "end", "response": result}
    context = get_inventory_summary(db)
    db.close()
    prompt = f"""You are an inventory management assistant.
{context}
Question: {messages[-1].content}
Reply in 1-3 plain English sentences. Include key numbers. No *, **, #, - symbols."""
    r = invoke_with_fallback(llm, prompt)
    return {"messages": messages + [AIMessage(content=r)], "next": "end", "response": r}