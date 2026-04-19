"""
DB Setup Router
- PostgreSQL only
- CSV upload stores data separately — does NOT overwrite DB tables
- Switching to DB reconnects and shows DB data
- Switching to CSV shows CSV data
- Auto-creates all tables when new DB connected
- Exhaustive alias mapping for any company's CSV column names
"""
import io
import csv
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.core.security import require_role, get_current_user
from app.models.user import RoleEnum, User
from app.core.db_config import (
    save_db_config, load_db_config, build_db_url,
    save_csv_data, load_csv_data, get_active_source,
    set_active_source, clear_csv_data, CONFIG_FILE
)
from app.core.rate_limiter import limiter, LIMITS
from app.database import get_db
from app.core.logger import log_audit

router = APIRouter(prefix="/db-setup", tags=["Database Setup"])


class DBConfig(BaseModel):
    host: str
    port: int = 5432
    database: str
    username: str
    password: str
    ssl: Optional[bool] = False


# ─────────────────────────────────────────────────────────────
# EXHAUSTIVE CSV COLUMN ALIASES
# Covers any company's naming convention
# ─────────────────────────────────────────────────────────────

INVENTORY_ALIASES = {
    # Product name
    "product_name":"name","productname":"name","product":"name","item_name":"name",
    "itemname":"name","item":"name","title":"name","description":"name","product_title":"name",
    "goods_name":"name","merchandise":"name","article_name":"name","part_name":"name",
    # SKU
    "product_code":"sku","productcode":"sku","code":"sku","item_code":"sku","itemcode":"sku",
    "barcode":"sku","part_number":"sku","partnumber":"sku","model_number":"sku","article_code":"sku",
    "ref":"sku","reference":"sku","product_id":"sku","item_id":"sku","sku_code":"sku",
    # Quantity
    "stock_quantity":"quantity","stockquantity":"quantity","qty":"quantity","stock":"quantity",
    "current_stock":"quantity","on_hand":"quantity","units":"quantity","available":"quantity",
    "in_stock":"quantity","stock_on_hand":"quantity","closing_stock":"quantity","balance":"quantity",
    "inventory_quantity":"quantity","units_available":"quantity","stock_level":"quantity",
    # Reorder point
    "reorder_level":"reorder_point","reorderlevel":"reorder_point","min_stock":"reorder_point",
    "minimum_stock":"reorder_point","safety_stock":"reorder_point","minimum_qty":"reorder_point",
    "min_qty":"reorder_point","reorder_qty":"reorder_point","minimum_quantity":"reorder_point",
    "threshold":"reorder_point","minimum_level":"reorder_point","alert_level":"reorder_point",
    # Reorder quantity
    "order_quantity":"reorder_quantity","order_qty":"reorder_quantity","restock_qty":"reorder_quantity",
    "restock_quantity":"reorder_quantity","order_size":"reorder_quantity","batch_size":"reorder_quantity",
    # Unit cost
    "unit_cost":"unit_cost","unitcost":"unit_cost","price":"unit_cost","cost":"unit_cost",
    "unit_price":"unit_cost","unitprice":"unit_cost","purchase_price":"unit_cost","buy_price":"unit_cost",
    "cost_price":"unit_cost","buying_price":"unit_cost","procurement_price":"unit_cost",
    "wholesale_price":"unit_cost","landed_cost":"unit_cost","item_cost":"unit_cost",
    # Holding cost
    "holding_cost":"holding_cost","carry_cost":"holding_cost","carrying_cost":"holding_cost",
    "storage_cost":"holding_cost","warehouse_cost":"holding_cost",
    # Ordering cost
    "ordering_cost":"ordering_cost","order_cost":"ordering_cost","procurement_cost":"ordering_cost",
    # Supplier
    "supplier":"supplier","vendor":"supplier","vendor_name":"supplier","supplier_name":"supplier",
    "manufacturer":"supplier","brand":"supplier","distributor":"supplier","source":"supplier",
    "provider":"supplier","seller":"supplier","partner":"supplier","wholesaler":"supplier",
    # Lead days
    "supplier_lead_days":"supplier_lead_days","lead_time":"supplier_lead_days",
    "lead_days":"supplier_lead_days","delivery_days":"supplier_lead_days",
    "lead_time_days":"supplier_lead_days","procurement_days":"supplier_lead_days",
    "supply_days":"supplier_lead_days","replenishment_days":"supplier_lead_days",
    # Category (extra info stored in supplier field)
    "category":"category","product_category":"category","type":"category",
    "product_type":"category","segment":"category","department":"category","group":"category",
    # Location (extra info)
    "location":"location","warehouse_location":"location","warehouse":"location","store":"location",
    "bin":"location","shelf":"location","zone":"location","storage_location":"location",
}

SALES_ALIASES = {
    # Product
    "product_name":"product","productname":"product","item":"product","item_name":"product",
    "itemname":"product","productline":"product","product_line":"product","description":"product",
    "goods":"product","article":"product","merchandise":"product","product_title":"product",
    # SKU
    "product_code":"sku","productcode":"sku","code":"sku","item_code":"sku","sku_code":"sku",
    "barcode":"sku","part_number":"sku","model_number":"sku","ref":"sku","reference":"sku",
    # Quantity
    "quantity_sold":"quantity","quantitysold":"quantity","qty":"quantity","units_sold":"quantity",
    "unitssold":"quantity","quantity_ordered":"quantity","quantityordered":"quantity",
    "qty_sold":"quantity","sold":"quantity","units":"quantity","sales_qty":"quantity",
    "number_sold":"quantity","pcs_sold":"quantity","items_sold":"quantity",
    # Amount — TOTAL sale value
    "total_sales":"amount","totalsales":"amount","total_amount":"amount","totalamount":"amount",
    "revenue":"amount","sales":"amount","total_revenue":"amount","sale_amount":"amount",
    "gross_sales":"amount","net_sales":"amount","total_value":"amount","sales_value":"amount",
    "turnover":"amount","receipts":"amount","order_value":"amount","invoice_amount":"amount",
    "transaction_amount":"amount","sales_total":"amount","amount_sold":"amount",
    # Unit price — only used if no total_sales present
    "unit_price":"unit_price","unitprice":"unit_price","price":"unit_price",
    "selling_price":"unit_price","sale_price":"unit_price","retail_price":"unit_price",
    # Category
    "category":"category","product_category":"category","segment":"category",
    "department":"category","type":"category","product_type":"category","group":"category",
    # Date
    "sale_date":"sale_date","saledate":"sale_date","date":"sale_date","order_date":"sale_date",
    "orderdate":"sale_date","transaction_date":"sale_date","invoice_date":"sale_date",
    "purchase_date":"sale_date","sales_date":"sale_date","record_date":"sale_date",
    # Region / Channel (extra info, stored in category if category empty)
    "region":"region","area":"region","territory":"region","market":"region","location":"region",
    "sales_channel":"sales_channel","channel":"sales_channel","source":"sales_channel",
}


def _clean_key(k: str) -> str:
    """Normalize a column header to a lookup key."""
    return re.sub(r'[^a-z0-9_]', '_', k.lower().strip()).strip('_')


def _resolve(row: dict, aliases: dict) -> dict:
    """Map any CSV column names to internal field names."""
    out = {}
    for raw_key, value in row.items():
        clean = _clean_key(raw_key)
        mapped = aliases.get(clean, clean)
        out[mapped] = value
    return out


def _float(v) -> float:
    if v is None or str(v).strip() in ("", "-", "N/A", "n/a", "null", "NULL"):
        return 0.0
    try:
        return float(re.sub(r'[,$£€\s]', '', str(v)))
    except Exception:
        return 0.0


def _int(v) -> int:
    f = _float(v)
    return int(f) if f else 0


def _date(v) -> datetime:
    if not v or str(v).strip() in ("", "-", "N/A"):
        return datetime.utcnow()
    s = str(v).strip()
    for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S",
                "%m/%d/%y", "%d-%m-%Y", "%d-%b-%Y", "%Y/%m/%d",
                "%m-%d-%Y", "%d.%m.%Y", "%Y.%m.%d"]:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return datetime.utcnow()


def _create_tables(engine):
    """Auto-create all required tables in the given engine."""
    try:
        from app.models.base import Base
        import app.models.user
        import app.models.inventory
        import app.models.sales
        import app.models.purchase_order
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        # Try alternate import path
        try:
            from app.models import Base
            Base.metadata.create_all(bind=engine)
        except Exception:
            raise e


# ── DB Endpoints ──────────────────────────────────────────────

@router.post("/test")
def test_connection(config: DBConfig, current_user: User = Depends(require_role(RoleEnum.admin))):
    try:
        engine = create_engine(build_db_url(config.dict()), connect_args={"connect_timeout": 5})
        with engine.connect() as conn:
            row = conn.execute(text("SELECT version()")).fetchone()
        return {"success": True,
                "message": f"PostgreSQL connection successful. Server: {str(row[0])[:50]}",
                "host": config.host, "database": config.database}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")


@router.post("/save")
def save_configuration(config: DBConfig, current_user: User = Depends(require_role(RoleEnum.admin))):
    """Save DB config, auto-create tables, switch source to DB."""
    try:
        engine = create_engine(build_db_url(config.dict()), connect_args={"connect_timeout": 5})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        _create_tables(engine)
        save_db_config(config.dict())  # also calls set_active_source("db")
        log_audit("DB_CONFIG_SAVED", current_user.email, f"host={config.host} db={config.database}")
        return {"success": True,
                "message": "PostgreSQL database connected. All tables created automatically. Now showing database data.",
                "host": config.host, "database": config.database, "source": "db"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save: {str(e)}")


@router.post("/switch-to-db")
def switch_to_db(current_user: User = Depends(require_role(RoleEnum.admin))):
    """Switch active data source back to database."""
    set_active_source("db")
    log_audit("SOURCE_SWITCH", current_user.email, "switched to db")
    return {"success": True, "source": "db", "message": "Now showing database data."}


@router.post("/switch-to-csv")
def switch_to_csv(current_user: User = Depends(require_role(RoleEnum.admin))):
    """Switch active data source to CSV (if CSV data is available)."""
    from app.core.db_config import CSV_DATA_FILE
    if not CSV_DATA_FILE.exists():
        raise HTTPException(status_code=400, detail="No CSV data available. Please upload a CSV file first.")
    set_active_source("csv")
    log_audit("SOURCE_SWITCH", current_user.email, "switched to csv")
    return {"success": True, "source": "csv", "message": "Now showing CSV data."}


@router.get("/source")
def get_source(current_user: User = Depends(require_role(RoleEnum.admin))):
    """Get current active data source."""
    source = get_active_source()
    from app.core.db_config import CSV_DATA_FILE
    csv_available = CSV_DATA_FILE.exists()
    return {"source": source, "csv_available": csv_available}


@router.get("/current")
def get_current_config(current_user: User = Depends(require_role(RoleEnum.admin))):
    config = load_db_config()
    source = get_active_source()
    if config:
        return {"configured": True, "host": config.get("host"), "port": config.get("port"),
                "database": config.get("database"), "username": config.get("username"),
                "ssl": config.get("ssl", False), "active_source": source}
    return {"configured": False, "message": "Using default .env configuration", "active_source": source}


@router.delete("/reset")
def reset_configuration(current_user: User = Depends(require_role(RoleEnum.admin))):
    if CONFIG_FILE.exists():
        CONFIG_FILE.unlink()
    set_active_source("db")
    return {"success": True, "message": "Reset to default .env settings. Now showing database data."}


# ── CSV Upload ────────────────────────────────────────────────
# request MUST be first param for @limiter.limit to work

@router.post("/upload-csv/{data_type}")
@limiter.limit("10/minute")
async def upload_csv(
    request: Request,
    data_type: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(RoleEnum.admin))
):
    """
    Upload CSV — data stored separately from DB, never overwrites DB tables.
    After upload, active source switches to CSV automatically.
    To go back to DB data, call /switch-to-db or save a DB config.
    Supports any column naming convention — exhaustive alias mapping.
    """
    if data_type not in ("inventory", "sales"):
        raise HTTPException(status_code=400, detail="data_type must be 'inventory' or 'sales'")

    fname = file.filename or ""
    if not fname.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are allowed.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        text_content = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text_content = content.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Cannot read file encoding. Save as UTF-8 CSV.")

    reader = csv.DictReader(io.StringIO(text_content))
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="CSV file has no data rows.")

    original_cols = list(rows[0].keys())
    processed = []

    if data_type == "inventory":
        aliases = INVENTORY_ALIASES
        for i, row in enumerate(rows):
            m = _resolve(row, aliases)
            name = str(m.get("name") or "").strip()
            if not name:
                continue
            # Auto-generate SKU if not present
            sku = str(m.get("sku") or "").strip()
            if not sku:
                safe = re.sub(r'[^A-Z0-9]', '', name.upper())[:6]
                sku = f"{safe}-{i+1:03d}"

            processed.append({
                "id":                  i + 1,
                "name":                name,
                "sku":                 sku,
                "quantity":            _int(m.get("quantity", 0)),
                "reorder_point":       _int(m.get("reorder_point", 10)),
                "reorder_quantity":    _int(m.get("reorder_quantity", 50)),
                "unit_cost":           _float(m.get("unit_cost", 0)),
                "holding_cost":        _float(m.get("holding_cost", 1.0)) or 1.0,
                "ordering_cost":       _float(m.get("ordering_cost", 50.0)) or 50.0,
                "supplier":            str(m.get("supplier") or "").strip() or None,
                "supplier_lead_days":  _int(m.get("supplier_lead_days", 7)) or 7,
                "category":            str(m.get("category") or "").strip() or None,
                "location":            str(m.get("location") or "").strip() or None,
            })

    else:  # sales
        aliases = SALES_ALIASES
        for i, row in enumerate(rows):
            m = _resolve(row, aliases)
            product = str(m.get("product") or "").strip()
            if not product:
                continue
            # Calculate amount: prefer total_sales/amount, fallback to unit_price * quantity
            amount = _float(m.get("amount", 0))
            unit_p = _float(m.get("unit_price", 0))
            qty    = _int(m.get("quantity", 1)) or 1
            if amount <= 0 and unit_p > 0:
                amount = round(unit_p * qty, 2)

            sku = str(m.get("sku") or "").strip() or None

            # Category: prefer category field, fallback to region/channel
            category = str(m.get("category") or "").strip()
            if not category:
                region = str(m.get("region") or "").strip()
                channel = str(m.get("sales_channel") or "").strip()
                if region and channel:
                    category = f"{region} - {channel}"
                elif region:
                    category = region
                elif channel:
                    category = channel

            processed.append({
                "id":        i + 1,
                "product":   product,
                "sku":       sku,
                "quantity":  qty,
                "amount":    amount,
                "unit_price": unit_p,
                "category":  category or None,
                "sale_date": str(_date(m.get("sale_date", ""))),
                "region":    str(m.get("region") or "").strip() or None,
                "sales_channel": str(m.get("sales_channel") or "").strip() or None,
            })

    if not processed:
        raise HTTPException(status_code=400, detail="No valid rows found. Check that Product Name column exists.")

    # Store CSV data separately — DB is untouched
    save_csv_data(data_type, processed)  # also calls set_active_source("csv")

    log_audit("CSV_IMPORT", current_user.email,
              f"type={data_type} rows={len(processed)} file={fname}")

    return {
        "message":       f"Successfully imported {len(processed)} {data_type} records. Now showing CSV data.",
        "rows_imported": len(processed),
        "columns":       original_cols,
        "data_type":     data_type,
        "source":        "csv",
        "detected_fields": list(set(INVENTORY_ALIASES.values() if data_type=="inventory" else SALES_ALIASES.values()) &
                               set(_clean_key(c) for c in original_cols)),
    }