from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
from app.graph.workflow import workflow
from app.core.security import get_current_user
from app.models.user import User
from app.core.rate_limiter import limiter, LIMITS
from app.core.logger import log_ai_query, log_error

router = APIRouter(tags=["Manager"])


class MessageRequest(BaseModel):
    message: str


@router.post("/message")
@limiter.limit(LIMITS["chat"])
def message_handler(
    request: Request,
    req: MessageRequest,
    current_user: User = Depends(get_current_user)
):
    log_ai_query(current_user.email, "manager", req.message)

    try:
        initial_state = {
            "messages": [HumanMessage(content=req.message)],
            "next": "",
            "response": ""
        }

        result = workflow.invoke(initial_state)

        return {
            "response": result["response"],
            "user": current_user.email
        }
    except Exception as e:
        log_error(str(e), "manager/message")
        return {
            "response": "⚠️ An error occurred. Please try again.",
            "user": current_user.email
        }