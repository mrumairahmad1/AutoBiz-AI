from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Initialize limiter
limiter = Limiter(key_func=get_remote_address)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"⚠️ Rate limit exceeded. Too many requests. Please slow down and try again.",
            "retry_after": "60 seconds"
        }
    )


# Rate limit rules
LIMITS = {
    "auth": "10/minute",           # Login/Register
    "chat": "20/minute",           # AI chat messages
    "crud": "60/minute",           # CRUD operations
    "stream": "15/minute",         # Streaming endpoint
    "general": "100/minute",       # General API
}