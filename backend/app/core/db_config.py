"""
db_config.py — manages two data sources:
  1. PostgreSQL database (default or custom)
  2. CSV uploaded data (stored in a separate JSON file)

When CSV is active, all reads come from csv_data.json.
When DB is active (or after connecting new DB), reads come from PostgreSQL.
Switching DB disconnects CSV mode automatically.
"""
import os
import json
from pathlib import Path

CONFIG_FILE   = Path(__file__).parent.parent.parent / "db_config.json"
CSV_DATA_FILE = Path(__file__).parent.parent.parent / "csv_data.json"
SOURCE_FILE   = Path(__file__).parent.parent.parent / "data_source.json"


# ── DB config ────────────────────────────────────────────────

def save_db_config(config: dict):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    # Switching to DB mode — clear CSV source flag
    set_active_source("db")


def load_db_config() -> dict:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {}


def build_db_url(config: dict) -> str:
    ssl = "?sslmode=require" if config.get("ssl") else ""
    return (
        f"postgresql://{config['username']}:{config['password']}"
        f"@{config['host']}:{config['port']}/{config['database']}{ssl}"
    )


def get_current_db_url() -> str:
    config = load_db_config()
    if config:
        return build_db_url(config)
    return os.getenv("DATABASE_URL", "")


# ── Active source management ─────────────────────────────────

def set_active_source(source: str):
    """source = 'db' or 'csv'"""
    with open(SOURCE_FILE, "w") as f:
        json.dump({"source": source}, f)


def get_active_source() -> str:
    """Returns 'csv' if CSV was uploaded and not switched back to DB, else 'db'."""
    if SOURCE_FILE.exists():
        try:
            with open(SOURCE_FILE, "r") as f:
                d = json.load(f)
                return d.get("source", "db")
        except Exception:
            return "db"
    return "db"


# ── CSV data store ───────────────────────────────────────────

def save_csv_data(data_type: str, rows: list):
    """Store CSV rows in csv_data.json under data_type key."""
    existing = {}
    if CSV_DATA_FILE.exists():
        try:
            with open(CSV_DATA_FILE, "r") as f:
                existing = json.load(f)
        except Exception:
            existing = {}
    existing[data_type] = rows
    with open(CSV_DATA_FILE, "w") as f:
        json.dump(existing, f, indent=2, default=str)
    set_active_source("csv")


def load_csv_data(data_type: str) -> list:
    """Load stored CSV rows for data_type."""
    if not CSV_DATA_FILE.exists():
        return []
    try:
        with open(CSV_DATA_FILE, "r") as f:
            d = json.load(f)
            return d.get(data_type, [])
    except Exception:
        return []


def clear_csv_data(data_type: str = None):
    """Clear CSV data. If data_type given, only clear that type."""
    if not CSV_DATA_FILE.exists():
        return
    if data_type is None:
        CSV_DATA_FILE.unlink()
        set_active_source("db")
    else:
        try:
            with open(CSV_DATA_FILE, "r") as f:
                d = json.load(f)
            d.pop(data_type, None)
            with open(CSV_DATA_FILE, "w") as f:
                json.dump(d, f, indent=2)
            # If no CSV data left, switch back to DB
            if not d:
                set_active_source("db")
        except Exception:
            pass