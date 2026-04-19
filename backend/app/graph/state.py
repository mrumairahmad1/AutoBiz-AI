from typing import TypedDict, Annotated, List, Optional
from langchain_core.messages import BaseMessage
from datetime import date
import operator


class AgentState(TypedDict):
    messages:  Annotated[List[BaseMessage], operator.add]
    next:      str
    response:  str
    date_from: Optional[date]   # injected by manager_agent for time-scoped sales queries
    date_to:   Optional[date]   # injected by manager_agent for time-scoped sales queries