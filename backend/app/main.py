import os
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.database import engine
from app.models import Base
from app.routers import inventory, sales, manager, auth
from app.routers import purchase_orders, stream, db_setup
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.core.logger import logger, log_api_request

load_dotenv()

Base.metadata.create_all(bind=engine)

security = HTTPBearer()

app = FastAPI(
    title="AI-Powered Business Automation Platform",
    description="Multi-agent system with Manager, Sales, and Inventory agents",
    version="1.0.0",
    swagger_ui_parameters={"persistAuthorization": True}
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:3000",
    "http://localhost:5173",
    "https://autobiz-ai-rho.vercel.app"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    user = request.headers.get("X-User", "anonymous")
    log_api_request(
        method=request.method,
        path=str(request.url.path),
        user=user,
        status=response.status_code
    )
    return response


# Routers
app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(sales.router)
app.include_router(manager.router)
app.include_router(purchase_orders.router)
app.include_router(stream.router)
app.include_router(db_setup.router)


@app.get("/")
def home():
    logger.info("Health check - home endpoint")
    return {"message": "AI Business Automation Platform — Running ✅"}


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/logs/summary")
def logs_summary():
    """Get log file sizes — admin only in production."""
    from pathlib import Path
    logs_dir = Path(__file__).parent.parent / "logs"
    summary = {}
    if logs_dir.exists():
        for log_file in logs_dir.glob("*.log"):
            size = log_file.stat().st_size
            summary[log_file.name] = f"{size / 1024:.1f} KB"
    return {"logs": summary}