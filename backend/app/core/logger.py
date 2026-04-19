import os
from loguru import logger
from pathlib import Path

# Create logs directory
LOGS_DIR = Path(__file__).parent.parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Remove default handler
logger.remove()

# Console handler — colored output
logger.add(
    sink=lambda msg: print(msg, end=""),
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO",
    colorize=True,
)

# File handler — all logs
logger.add(
    sink=str(LOGS_DIR / "app.log"),
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{line} - {message}",
    level="DEBUG",
    rotation="10 MB",
    retention="30 days",
    compression="zip",
)

# Error log — errors only
logger.add(
    sink=str(LOGS_DIR / "errors.log"),
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{line} - {message}",
    level="ERROR",
    rotation="5 MB",
    retention="60 days",
    compression="zip",
)

# Audit log — user actions
logger.add(
    sink=str(LOGS_DIR / "audit.log"),
    format="{time:YYYY-MM-DD HH:mm:ss} | AUDIT | {message}",
    level="INFO",
    filter=lambda record: "AUDIT" in record["message"],
    rotation="10 MB",
    retention="90 days",
    compression="zip",
)


def log_audit(action: str, user: str, details: str = ""):
    """Log user actions for audit trail."""
    logger.info(f"AUDIT | user={user} | action={action} | details={details}")


def log_api_request(method: str, path: str, user: str, status: int):
    """Log API requests."""
    logger.info(f"API | {method} {path} | user={user} | status={status}")


def log_ai_query(user: str, intent: str, query: str):
    """Log AI queries."""
    logger.info(f"AUDIT | user={user} | action=AI_QUERY | intent={intent} | query={query[:100]}")


def log_error(error: str, context: str = ""):
    """Log errors."""
    logger.error(f"ERROR | context={context} | error={error}")