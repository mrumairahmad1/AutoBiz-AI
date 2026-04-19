"""
Manager Agent — FIXED
1. Parses date ranges from user queries (this month, this week, specific months/years, custom ranges)
2. Injects date_from / date_to into state so sales_agent can filter correctly
3. Works for both CSV and DB sources — filtering now happens in the data layer
"""
import re
from datetime import date, datetime, timedelta
from calendar import monthrange
from typing import Optional, Tuple
from langchain_core.messages import AIMessage
from app.graph.state import AgentState

# ── Business keywords ──────────────────────────────────────────────────────────
SALES_KW = [
    "sale", "revenue", "selling", "sold", "earning", "income", "profit", "order",
    "customer", "trend", "category", "transaction", "best sell", "top product",
    "monthly", "forecast sales", "predict sales", "average order",
]
INVENTORY_KW = [
    "stock", "inventory", "reorder", "supplier", "warehouse", "eoq", "lead time",
    "low stock", "out of stock", "reorder point", "unit cost", "sku", "product",
    "items", "goods", "restocking", "replenish", "refill",
]
ACTION_INV = [
    "restock", "refill", "replenish", "add stock", "increase stock", "update item",
    "edit item", "change quantity", "set quantity", "delete item", "remove item",
    "remove product", "delete product", "adjust",
]
ACTION_SALE = [
    "record sale", "add sale", "log sale", "new sale",
    "delete sale", "remove sale", "delete sales", "remove sales",
]

NON_ENGLISH_PATTERN = re.compile(
    r'[\u0600-\u06FF\u0750-\u077F'
    r'\u4e00-\u9fff'
    r'\u0900-\u097F'
    r'\u0400-\u04FF'
    r'\u3040-\u30ff'
    r'\uAC00-\uD7A3]'
)

MONTH_MAP = {
    "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
    "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6,
    "july": 7, "jul": 7, "august": 8, "aug": 8, "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
}


def _is_non_english(text: str) -> bool:
    return bool(NON_ENGLISH_PATTERN.search(text))


def _today() -> date:
    return datetime.utcnow().date()


def _parse_date_range(message: str) -> Tuple[Optional[date], Optional[date]]:
    """
    Extract a date range from natural-language queries.
    Returns (date_from, date_to) or (None, None) if no range found.
    Handles: 'this month', 'last month', 'this week', 'last week',
             'this year', 'last year', named months with optional year,
             and ISO-style ranges like '2024-01-01 to 2024-01-31'.
    """
    msg   = message.lower().strip()
    today = _today()

    # ── "this month" ──────────────────────────────────────────────────────────
    if re.search(r'\bthis\s+month\b', msg):
        first = today.replace(day=1)
        last  = today.replace(day=monthrange(today.year, today.month)[1])
        return first, last

    # ── "last month" ──────────────────────────────────────────────────────────
    if re.search(r'\blast\s+month\b', msg):
        first_this = today.replace(day=1)
        last_month = first_this - timedelta(days=1)
        first = last_month.replace(day=1)
        last  = last_month.replace(day=monthrange(last_month.year, last_month.month)[1])
        return first, last

    # ── "this week" ───────────────────────────────────────────────────────────
    if re.search(r'\bthis\s+week\b', msg):
        start = today - timedelta(days=today.weekday())  # Monday
        end   = start + timedelta(days=6)                 # Sunday
        return start, end

    # ── "last week" ───────────────────────────────────────────────────────────
    if re.search(r'\blast\s+week\b', msg):
        start_this = today - timedelta(days=today.weekday())
        end   = start_this - timedelta(days=1)
        start = end - timedelta(days=6)
        return start, end

    # ── "this year" ───────────────────────────────────────────────────────────
    if re.search(r'\bthis\s+year\b', msg):
        return date(today.year, 1, 1), date(today.year, 12, 31)

    # ── "last year" ───────────────────────────────────────────────────────────
    if re.search(r'\blast\s+year\b', msg):
        y = today.year - 1
        return date(y, 1, 1), date(y, 12, 31)

    # ── "last N days" ─────────────────────────────────────────────────────────
    m = re.search(r'\blast\s+(\d+)\s+days?\b', msg)
    if m:
        n = int(m.group(1))
        return today - timedelta(days=n - 1), today

    # ── "last N months" ───────────────────────────────────────────────────────
    m = re.search(r'\blast\s+(\d+)\s+months?\b', msg)
    if m:
        n = int(m.group(1))
        # Go back n months
        y, mo = today.year, today.month
        mo -= n
        while mo <= 0:
            mo += 12; y -= 1
        first = date(y, mo, 1)
        return first, today

    # ── Named month + optional year: "in january 2024", "for march", etc. ────
    month_pattern = r'\b(' + '|'.join(MONTH_MAP.keys()) + r')\b'
    m = re.search(month_pattern, msg)
    if m:
        month_num = MONTH_MAP[m.group(1)]
        # Look for a 4-digit year near the month name
        year_m = re.search(r'\b(20\d{2}|19\d{2})\b', msg)
        year   = int(year_m.group(1)) if year_m else today.year
        first  = date(year, month_num, 1)
        last   = date(year, month_num, monthrange(year, month_num)[1])
        return first, last

    # ── ISO range: "2024-01-01 to 2024-03-31" or "from 2024-01-01 to 2024-03-31" ──
    iso = re.search(
        r'(\d{4}-\d{2}-\d{2})\s*(?:to|-|through|until)\s*(\d{4}-\d{2}-\d{2})',
        msg,
    )
    if iso:
        try:
            d_from = date.fromisoformat(iso.group(1))
            d_to   = date.fromisoformat(iso.group(2))
            return d_from, d_to
        except ValueError:
            pass

    # ── Single ISO date: "on 2024-05-15" ─────────────────────────────────────
    iso_single = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', msg)
    if iso_single:
        try:
            d = date.fromisoformat(iso_single.group(1))
            return d, d
        except ValueError:
            pass

    # ── Year only: "in 2023", "for 2024" ─────────────────────────────────────
    year_only = re.search(r'\b(in|for|of|during)\s+(20\d{2}|19\d{2})\b', msg)
    if year_only:
        y = int(year_only.group(2))
        return date(y, 1, 1), date(y, 12, 31)

    return None, None


def classify(message: str) -> str:
    msg = message.lower().strip()
    if any(p in msg for p in ACTION_INV):
        return "inventory_action"
    if any(p in msg for p in ACTION_SALE):
        return "sales_action"
    if re.search(r'add\s+\d+\s*(?:pieces?|units?|pcs?|items?)', msg) and "sale" not in msg:
        return "inventory_action"
    inv_s  = sum(1 for k in INVENTORY_KW if k in msg)
    sale_s = sum(1 for k in SALES_KW     if k in msg)
    if inv_s > 0 and inv_s >= sale_s:
        return "inventory"
    if sale_s > 0:
        return "sales"
    return "end"


def manager_agent(state: AgentState) -> AgentState:
    messages   = state["messages"]
    user_input = messages[-1].content

    # Non-English — instant rejection
    if _is_non_english(user_input):
        reply = "This system handles English language queries only."
        return {
            "messages":  messages + [AIMessage(content=reply)],
            "next":      "end",
            "response":  reply,
            "date_from": None,
            "date_to":   None,
        }

    decision = classify(user_input)

    # Off-topic — instant rejection
    if decision == "end":
        reply = "This system handles business queries about sales and inventory only."
        return {
            "messages":  messages + [AIMessage(content=reply)],
            "next":      "end",
            "response":  reply,
            "date_from": None,
            "date_to":   None,
        }

    # Parse date range for sales queries (revenue/trend questions)
    date_from, date_to = None, None
    if decision in ("sales", "sales_action"):
        date_from, date_to = _parse_date_range(user_input)

    return {
        "messages":  messages,
        "next":      decision,
        "response":  "",
        "date_from": date_from,
        "date_to":   date_to,
    }