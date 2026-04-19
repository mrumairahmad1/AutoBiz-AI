from langgraph.graph import StateGraph, END
from app.graph.state import AgentState
from app.agents.manager_agent import manager_agent
from app.agents.inventory_agent import inventory_agent
from app.agents.sales_agent import sales_agent


def route_after_manager(state: AgentState) -> str:
    return state["next"]


# Build graph
graph = StateGraph(AgentState)

# Add nodes
graph.add_node("manager", manager_agent)
graph.add_node("inventory", inventory_agent)
graph.add_node("sales", sales_agent)

# Entry point
graph.set_entry_point("manager")

# Conditional routing from manager
graph.add_conditional_edges(
    "manager",
    route_after_manager,
    {
        "inventory": "inventory",
        "sales": "sales",
        "end": END
    }
)

# Both agents go to END after responding
graph.add_edge("inventory", END)
graph.add_edge("sales", END)

workflow = graph.compile()