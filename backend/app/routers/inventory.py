"""
Inventory Router — FIXED

Root cause of "add shows success but page doesn't update":
  When source=csv, GET was returning CSV rows.
  But writes always go to DB.
  So after adding to DB, the page kept showing stale CSV data.

Fix:
  - GET /inventory/ : returns DB data when source='db', CSV data when source='csv'
  - After any write (add/update/delete), the page re-fetches. If source is still 'csv',
    the new DB record won't show until user switches source to 'db'.
  - So: after a successful write, we include a note in the response so the frontend
    can show a toast telling the user data was saved to DB, and if CSV is active,
    switch source to 'db' automatically so the new record shows immediately.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.inventory import Inventory
from app.core.security import get_current_user, require_role
from app.models.user import User, RoleEnum
from app.core.rate_limiter import limiter, LIMITS
from app.core.logger import log_audit
from app.core.db_config import get_active_source, load_csv_data, set_active_source

router = APIRouter(prefix="/inventory", tags=["Inventory"])


class InventoryRequest(BaseModel):
    name:               str
    sku:                str
    quantity:           int
    reorder_point:      Optional[int]   = 10
    reorder_quantity:   Optional[int]   = 50
    unit_cost:          Optional[float] = 0.0
    holding_cost:       Optional[float] = 1.0
    ordering_cost:      Optional[float] = 50.0
    supplier:           Optional[str]   = None
    supplier_lead_days: Optional[int]   = 7


def _item_to_dict(item: Inventory) -> dict:
    return {
        "id": item.id, "name": item.name, "sku": item.sku,
        "quantity": item.quantity, "reorder_point": item.reorder_point,
        "reorder_quantity": item.reorder_quantity, "unit_cost": item.unit_cost,
        "holding_cost": item.holding_cost, "ordering_cost": item.ordering_cost,
        "supplier": item.supplier, "supplier_lead_days": item.supplier_lead_days,
    }


@router.get("/")
@limiter.limit(LIMITS["crud"])
def get_inventory(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns CSV data if source=csv, else DB data."""
    if get_active_source() == "csv":
        return load_csv_data("inventory")
    return [_item_to_dict(i) for i in db.query(Inventory).all()]


@router.post("/add", status_code=201)
@limiter.limit(LIMITS["crud"])
def add_inventory(
    request: Request,
    item: InventoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin, RoleEnum.manager))
):
    if db.query(Inventory).filter(Inventory.sku == item.sku).first():
        raise HTTPException(status_code=400, detail=f"SKU '{item.sku}' already exists. Use a unique SKU.")
    new_item = Inventory(**item.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    # Switch source to DB so newly added item is immediately visible in the page
    if get_active_source() == "csv":
        set_active_source("db")
    log_audit("INVENTORY_ADD", current_user.email,
              f"product={item.name} sku={item.sku} qty={item.quantity}")
    return {"message": f"'{item.name}' added to inventory.", "id": new_item.id}


@router.put("/{item_id}")
@limiter.limit(LIMITS["crud"])
def update_inventory(
    request: Request,
    item_id: int,
    item: InventoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin, RoleEnum.manager))
):
    db_item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    for k, v in item.dict().items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    if get_active_source() == "csv":
        set_active_source("db")
    log_audit("INVENTORY_UPDATE", current_user.email,
              f"item_id={item_id} product={item.name}")
    return {"message": f"'{item.name}' updated successfully."}


@router.delete("/{item_id}")
@limiter.limit(LIMITS["crud"])
def delete_inventory(
    request: Request,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin, RoleEnum.manager))
):
    db_item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    name = db_item.name
    log_audit("INVENTORY_DELETE", current_user.email,
              f"item_id={item_id} product={name}")
    db.delete(db_item)
    db.commit()
    if get_active_source() == "csv":
        set_active_source("db")
    return {"message": f"'{name}' removed from inventory."}