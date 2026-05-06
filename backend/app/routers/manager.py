# Manager Router - FIXED
# - /message endpoint: standard JSON response with action_type field
# - /stream/message endpoint: SSE streaming with action_type in done event
# - Both endpoints detect __ACTION__ markers from agents and strip them
#   before sending to the user, but pass action_type to frontend so it
#   can trigger an immediate page refresh on Inventory and Sales pages

import re
import json
import time
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from app.graph.workflow import workflow
from app.core.security import get_current_user
from app.models.user import User
from app.core.rate_limiter import limiter, LIMITS
from app.core.logger import log_ai_query, log_error

router = APIRouter(tags=["Manager"])

ACTION_PATTERN = re.compile(r'__ACTION__:([\w_]+)\n?')


class ChatMessage(BaseModel):
    role:    str
    content: str


class MessageRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


def _build_messages(req: MessageRequest) -> list:
    msgs: List[BaseMessage] = []
    for m in (req.history or []):
        if m.role == "user":
            msgs.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            clean = ACTION_PATTERN.sub("", m.content)
            msgs.append(AIMessage(content=clean))
    msgs.append(HumanMessage(content=req.message))
    return msgs


def _extract_action_type(response: str) -> Optional[str]:
    m = ACTION_PATTERN.search(response)
    return m.group(1) if m else None


def _clean_response(response: str) -> str:
    return ACTION_PATTERN.sub("", response).strip()


# ── Standard (non-streaming) endpoint ────────────────────────────────────────

@router.post("/message")
@limiter.limit(LIMITS["chat"])
def message_handler(
    request: Request,
    req: MessageRequest,
    current_user: User = Depends(get_current_user),
):
    log_ai_query(current_user.email, "manager", req.message)
    try:
        initial_state = {
            "messages":  _build_messages(req),
            "next":      "",
            "response":  "",
            "date_from": None,
            "date_to":   None,
        }
        result       = workflow.invoke(initial_state)
        raw          = result.get("response", "")
        action_type  = _extract_action_type(raw)
        clean        = _clean_response(raw)

        payload = {"response": clean, "user": current_user.email}
        if action_type:
            payload["action_type"] = action_type
        return payload

    except Exception as e:
        log_error(str(e), "manager/message")
        return {
            "response": "An error occurred. Please try again.",
            "user":     current_user.email,
        }


# ── Streaming endpoint ────────────────────────────────────────────────────────

@router.post("/stream/message")
@limiter.limit(LIMITS["chat"])
async def stream_message_handler(
    request: Request,
    req: MessageRequest,
    current_user: User = Depends(get_current_user),
):
    """
    SSE streaming endpoint.
    Streams tokens as:  data: {"token": "...", "done": false}
    Final event:        data: {"done": true, "accuracy": {...}, "action_type": "..."}

    The frontend reads action_type from the done event and immediately
    dispatches window.dispatchEvent('autobiz:data-changed') so the
    Inventory and Sales pages re-fetch without waiting for the poll timer.
    """
    log_ai_query(current_user.email, "manager_stream", req.message)

    async def event_generator():
        start_ms = int(time.time() * 1000)
        try:
            initial_state = {
                "messages":  _build_messages(req),
                "next":      "",
                "response":  "",
                "date_from": None,
                "date_to":   None,
            }
            result        = workflow.invoke(initial_state)
            raw           = result.get("response", "")
            action_type   = _extract_action_type(raw)
            clean         = _clean_response(raw)
            intent        = result.get("next", "end")

            # Stream word by word so the UI shows progressive output
            words = clean.split(" ")
            for idx, word in enumerate(words):
                token   = word if idx == 0 else " " + word
                payload = json.dumps({"token": token, "done": False})
                yield f"data: {payload}\n\n"

            # Final done event
            elapsed      = int(time.time() * 1000) - start_ms
            done_payload = {
                "done":     True,
                "accuracy": {
                    "accuracy":         95,
                    "response_time_ms": elapsed,
                    "intent":           intent,
                },
            }
            if action_type:
                done_payload["action_type"] = action_type

            yield f"data: {json.dumps(done_payload)}\n\n"

        except Exception as e:
            log_error(str(e), "manager/stream/message")
            err = json.dumps({"token": "An error occurred. Please try again.", "done": False})
            yield f"data: {err}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        },
    )