"""
Manager Agent — keyword-based routing only. No LLM used for routing.
Instant response for off-topic, non-English, non-business queries.
"""
import re
from langchain_core.messages import AIMessage
from app.graph.state import AgentState

# Business keywords
SALES_KW     = ["sale","revenue","selling","sold","earning","income","profit","order",
                 "customer","trend","category","transaction","best sell","top product",
                 "monthly","forecast sales","predict sales","average order"]
INVENTORY_KW = ["stock","inventory","reorder","supplier","warehouse","eoq","lead time",
                 "low stock","out of stock","reorder point","unit cost","sku","product",
                 "items","goods","restocking","replenish","refill"]
ACTION_INV   = ["restock","refill","replenish","add stock","increase stock","update item",
                "edit item","change quantity","set quantity","delete item","remove item",
                "remove product","delete product","adjust"]
ACTION_SALE  = ["record sale","add sale","log sale","new sale",
                "delete sale","remove sale","delete sales","remove sales"]

# Common non-English characters / scripts
NON_ENGLISH_PATTERN = re.compile(
    r'[\u0600-\u06FF\u0750-\u077F'   # Arabic/Urdu
    r'\u4e00-\u9fff'                  # Chinese
    r'\u0900-\u097F'                  # Hindi/Devanagari
    r'\u0400-\u04FF'                  # Cyrillic
    r'\u3040-\u30ff'                  # Japanese
    r'\uAC00-\uD7A3]'                 # Korean
)


def _is_non_english(text: str) -> bool:
    return bool(NON_ENGLISH_PATTERN.search(text))


def classify(message: str) -> str:
    msg = message.lower().strip()
    if any(p in msg for p in ACTION_INV):  return "inventory_action"
    if any(p in msg for p in ACTION_SALE): return "sales_action"
    if re.search(r'add\s+\d+\s*(?:pieces?|units?|pcs?|items?)', msg) and "sale" not in msg:
        return "inventory_action"
    inv_s  = sum(1 for k in INVENTORY_KW if k in msg)
    sale_s = sum(1 for k in SALES_KW     if k in msg)
    if inv_s > 0 and inv_s >= sale_s: return "inventory"
    if sale_s > 0:                    return "sales"
    return "end"


def manager_agent(state: AgentState) -> AgentState:
    messages   = state["messages"]
    user_input = messages[-1].content

    # Non-English — instant rejection, no LLM, no loading
    if _is_non_english(user_input):
        reply = "This system handles English language queries only."
        return {
            "messages": messages + [AIMessage(content=reply)],
            "next": "end",
            "response": reply,
        }

    decision = classify(user_input)

    # Off-topic — instant rejection, no LLM
    if decision == "end":
        reply = "This system handles business queries about sales and inventory only."
        return {
            "messages": messages + [AIMessage(content=reply)],
            "next": "end",
            "response": reply,
        }

    return {
        "messages": messages,
        "next":     decision,
        "response": "",
    }