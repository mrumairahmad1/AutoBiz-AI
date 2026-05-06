"""
Inventory Agent - FIXED
- When CSV source is active: reads AND writes the actual CSV file so pages
  refresh with live data immediately
- When DB source is active: reads and writes DB as before
- Every successful write prefixes response with __ACTION__:inventory_write
  so the frontend dispatches an immediate page refresh event
- Date context passed through from manager agent
"""
import math, json, re, csv, os
from datetime import date
from typing import Optional
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


def _get_csv_path(data_type: str) -> str:
    """Resolve the CSV file path for inventory or sales."""
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
    """Write items list back to the CSV file, preserving all columns."""
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


def get_inventory_summary(
    db: Session = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> str:
    close = db is None
    if close:
        db = get_session()
    try:
        period_label = ""
        if date_from and date_to:
            period_label = f" (period {date_from} to {date_to})"
        elif date_from:
            period_label = f" (from {date_from})"
        elif date_to:
            period_label = f" (up to {date_to})"

        if get_active_source() == "csv":
            items = load_csv_data("inventory")
            if not items:
                return "No inventory data available."
            ctx      = f"INVENTORY STATUS{period_label}:\n"
            low_list = []
            for item in items:
                qty = int(item.get("quantity", 0))
                rp  = int(item.get("reorder_point", 0))
                st  = "LOW STOCK" if qty <= rp else "OK"
                if st == "LOW STOCK":
                    low_list.append(item.get("name", ""))
                ctx += (
                    f"  - {item.get('name')} (SKU:{item.get('sku','?')}, ID:{item.get('id','?')})\n"
                    f"    Status:{st} | Stock:{qty} | Reorder at:{rp} | "
                    f"Cost:${float(item.get('unit_cost', 0)):.2f} | "
                    f"Supplier:{item.get('supplier', '?')}\n"
                )
            if low_list:
                ctx += f"\nLOW STOCK: {', '.join(low_list)}\n"
            return ctx

        items = db.query(Inventory).all()
        if not items:
            return "No inventory data available."
        ctx      = f"INVENTORY STATUS{period_label}:\n"
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
    "decrease stock", "adjust", "refill", "replenish", "add stock",
    "update item", "edit item", "update stock", "edit stock",
    "add item", "create item",
]

def is_write_intent(user_input: str) -> bool:
    return any(kw in user_input.lower() for kw in WRITE_KEYWORDS)


def execute_inventory_action(
    user_message: str,
    db: Session,
    llm,
    history_ctx: str = "",
) -> str:
    active = get_active_source()

    # Build item list from whichever source is active
    if active == "csv":
        csv_items  = load_csv_data("inventory")
        items_list = "\n".join(
            f"  ID={i.get('id')} | Name={i.get('name')} | SKU={i.get('sku')} | "
            f"Qty={i.get('quantity')} | ReorderPoint={i.get('reorder_point')} | "
            f"ReorderQty={i.get('reorder_quantity', 50)} | "
            f"Cost={i.get('unit_cost', 0)} | Supplier={i.get('supplier', '')}"
            for i in csv_items
        )
    else:
        db_items   = db.query(Inventory).all()
        csv_items  = None
        items_list = "\n".join(
            f"  ID={i.id} | Name={i.name} | SKU={i.sku} | Qty={i.quantity} | "
            f"ReorderPoint={i.reorder_point} | ReorderQty={i.reorder_quantity} | "
            f"Cost={i.unit_cost} | Supplier={i.supplier}"
            for i in db_items
        )

    parse_prompt = f"""Parse the inventory request and output ONLY valid JSON.

INVENTORY:
{items_list}

{history_ctx}

REQUEST: {user_message}

Output one of:
{{"action":"restock","item_id":<id>,"new_quantity":<int or null>,"reason":"<why>"}}
{{"action":"update","item_id":<id>,"fields":{{"quantity":<int>,"reorder_point":<int>,"unit_cost":<float>}},"reason":"<why>"}}
{{"action":"delete","item_id":<id>,"reason":"<why>"}}
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

    action  = parsed.get("action", "unknown")
    item_id = str(parsed.get("item_id", ""))

    # ── CSV path ──────────────────────────────────────────────────────────────
    if active == "csv":
        items = load_csv_data("inventory")

        if action == "restock":
            target = next((i for i in items if str(i.get("id")) == item_id), None)
            if not target:
                return f"Item ID {item_id} not found in inventory."
            old = target.get("quantity", 0)
            rq  = int(target.get("reorder_quantity", 50))
            rp  = int(target.get("reorder_point", 10))
            nq  = parsed.get("new_quantity") or max(rq, rp + rq)
            target["quantity"] = nq
            _write_csv("inventory", items)
            return (
                f"__ACTION__:inventory_write\n"
                f"Restocked '{target['name']}': {old} to {nq} units. "
                f"Status: {'LOW STOCK' if int(nq) <= rp else 'OK'}."
            )

        elif action == "update":
            target = next((i for i in items if str(i.get("id")) == item_id), None)
            if not target:
                return f"Item ID {item_id} not found in inventory."
            changes = []
            for field, value in (parsed.get("fields") or {}).items():
                if value is not None:
                    changes.append(f"{field}: {target.get(field)} to {value}")
                    target[field] = value
            _write_csv("inventory", items)
            return (
                f"__ACTION__:inventory_write\n"
                f"Updated '{target['name']}'. Changes: {', '.join(changes)}. "
                f"Current quantity: {target.get('quantity')}."
            )

        elif action == "delete":
            target = next((i for i in items if str(i.get("id")) == item_id), None)
            if not target:
                return f"Item ID {item_id} not found in inventory."
            name, sku = target.get("name"), target.get("sku")
            _write_csv("inventory", [i for i in items if str(i.get("id")) != item_id])
            return (
                f"__ACTION__:inventory_write\n"
                f"Deleted '{name}' (SKU:{sku}) from inventory."
            )

        elif action == "create":
            sku = (parsed.get("sku") or "").strip()
            if not sku:
                return "Cannot create item: SKU is required."
            if any(i.get("sku") == sku for i in items):
                return f"Item with SKU '{sku}' already exists."
            new_id   = _next_csv_id(items)
            new_item = {
                "id":                 new_id,
                "name":               parsed.get("name", "New Item"),
                "sku":                sku,
                "quantity":           parsed.get("quantity", 0),
                "reorder_point":      parsed.get("reorder_point", 10),
                "reorder_quantity":   parsed.get("reorder_quantity", 50),
                "unit_cost":          parsed.get("unit_cost", 0.0),
                "holding_cost":       1.0,
                "ordering_cost":      50.0,
                "supplier":           parsed.get("supplier", ""),
                "supplier_lead_days": 7,
            }
            items.append(new_item)
            _write_csv("inventory", items)
            return (
                f"__ACTION__:inventory_write\n"
                f"Created '{new_item['name']}' (SKU:{sku}, ID:{new_id}) with "
                f"{new_item['quantity']} units at ${new_item['unit_cost']}/unit."
            )

        return f"Action not recognized. Reason: {parsed.get('reason', 'unknown')}"

    # ── DB path ───────────────────────────────────────────────────────────────
    int_id = int(item_id) if item_id.isdigit() else None

    if action == "restock":
        item = db.query(Inventory).filter(Inventory.id == int_id).first()
        if not item:
            return f"Item ID {int_id} not found."
        old = item.quantity
        nq  = parsed.get("new_quantity") or max(
            item.reorder_quantity, item.reorder_point + item.reorder_quantity
        )
        item.quantity = nq
        db.commit()
        db.refresh(item)
        return (
            f"__ACTION__:inventory_write\n"
            f"Restocked '{item.name}': {old} to {nq} units. "
            f"Status: {'LOW STOCK' if item.quantity <= item.reorder_point else 'OK'}."
        )

    elif action == "update":
        item = db.query(Inventory).filter(Inventory.id == int_id).first()
        if not item:
            return f"Item ID {int_id} not found."
        changes = []
        for field, value in (parsed.get("fields") or {}).items():
            if hasattr(item, field) and value is not None:
                old = getattr(item, field)
                setattr(item, field, value)
                changes.append(f"{field}: {old} to {value}")
        db.commit()
        db.refresh(item)
        return (
            f"__ACTION__:inventory_write\n"
            f"Updated '{item.name}'. Changes: {', '.join(changes)}. "
            f"Current quantity: {item.quantity}."
        )

    elif action == "delete":
        item = db.query(Inventory).filter(Inventory.id == int_id).first()
        if not item:
            return f"Item ID {int_id} not found."
        name, sku = item.name, item.sku
        db.delete(item)
        db.commit()
        return (
            f"__ACTION__:inventory_write\n"
            f"Deleted '{name}' (SKU:{sku}) from inventory."
        )

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
        return (
            f"__ACTION__:inventory_write\n"
            f"Created '{ni.name}' (SKU:{ni.sku}, ID:{ni.id}) with "
            f"{ni.quantity} units at ${ni.unit_cost}/unit."
        )

    return f"Action not recognized. Reason: {parsed.get('reason', 'unknown')}"


def inventory_agent(state: AgentState) -> AgentState:
    messages  = state["messages"]
    date_from = state.get("date_from")
    date_to   = state.get("date_to")
    db  = get_session()
    llm = get_llm()

    if is_write_intent(messages[-1].content):
        result       = execute_inventory_action(messages[-1].content, db, llm)
        clean_result = result.replace("__ACTION__:inventory_write\n", "")
        db.close()
        return {
            "messages": messages + [AIMessage(content=clean_result)],
            "next":     "end",
            "response": result,
        }

    context = get_inventory_summary(db, date_from=date_from, date_to=date_to)
    db.close()

    period_note = ""
    if date_from and date_to:
        period_note = f" The user is asking about the period {date_from} to {date_to}."
    elif date_from:
        period_note = f" The user is asking about data from {date_from} onwards."
    elif date_to:
        period_note = f" The user is asking about data up to {date_to}."

    prompt = f"""You are an inventory management assistant.{period_note}
{context}
Question: {messages[-1].content}
Reply in 1-3 plain English sentences. Include key numbers. No *, **, #, - symbols."""
    r = invoke_with_fallback(llm, prompt)
    return {"messages": messages + [AIMessage(content=r)], "next": "end", "response": r}