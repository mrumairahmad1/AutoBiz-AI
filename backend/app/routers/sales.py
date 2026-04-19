"""
Sales Router — FIXED

Same root cause fix as inventory_router.py:
After any write (add/delete), switch active source to 'db'
so the new record is immediately visible when the page re-fetches.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.sales import Sales
from app.models.inventory import Inventory
from app.core.security import get_current_user, require_role
from app.models.user import User, RoleEnum
from app.core.rate_limiter import limiter, LIMITS
from app.core.logger import log_audit
from app.core.db_config import get_active_source, load_csv_data, set_active_source

router = APIRouter(prefix="/sales", tags=["Sales"])


class SalesRequest(BaseModel):
    product:  str
    sku:      Optional[str]   = None
    quantity: int
    amount:   float
    category: Optional[str]  = None


def _sale_to_dict(s: Sales) -> dict:
    return {
        "id": s.id, "product": s.product, "sku": s.sku,
        "quantity": s.quantity, "amount": s.amount,
        "category": s.category,
        "sale_date": str(s.sale_date) if s.sale_date else None,
    }


@router.get("/")
@limiter.limit(LIMITS["crud"])
def get_sales(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns CSV data if source=csv, else DB data."""
    if get_active_source() == "csv":
        return load_csv_data("sales")
    return [_sale_to_dict(s) for s in db.query(Sales).all()]


@router.post("/add", status_code=201)
@limiter.limit(LIMITS["crud"])
def add_sale(
    request: Request,
    item: SalesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin, RoleEnum.manager))
):
    sale = Sales(
        product=item.product, sku=item.sku, quantity=item.quantity,
        amount=item.amount, category=item.category, sale_date=datetime.utcnow()
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    log_audit("SALE_ADD", current_user.email,
              f"product={item.product} qty={item.quantity} amount=${item.amount}")

    # Auto-deduct inventory
    inv_item = None
    if item.sku:
        inv_item = db.query(Inventory).filter(Inventory.sku == item.sku).first()
    if not inv_item:
        for i in db.query(Inventory).all():
            if item.product.lower() in i.name.lower() or i.name.lower() in item.product.lower():
                inv_item = i
                break

    inventory_update = None
    if inv_item:
        old_qty = inv_item.quantity
        inv_item.quantity = max(0, inv_item.quantity - item.quantity)
        db.commit()
        db.refresh(inv_item)
        low = inv_item.quantity <= inv_item.reorder_point
        inventory_update = {
            "item": inv_item.name, "sku": inv_item.sku,
            "old_qty": old_qty, "new_qty": inv_item.quantity, "low_stock": low
        }
        log_audit("INVENTORY_DEDUCT", current_user.email,
                  f"product={inv_item.name} {old_qty}->{inv_item.quantity}")

    # Switch source to DB so new sale is immediately visible
    if get_active_source() == "csv":
        set_active_source("db")

    response = {"message": f"Sale recorded: '{item.product}' — {item.quantity} units for ${item.amount}.", "id": sale.id}
    if inventory_update:
        response["inventory_update"] = inventory_update
        if inventory_update["low_stock"]:
            response["warning"] = f"'{inv_item.name}' is now low on stock ({inv_item.quantity} units remaining)."
    else:
        response["inventory_note"] = "No matching inventory item found to deduct from."
    return response


@router.delete("/{sale_id}")
@limiter.limit(LIMITS["crud"])
def delete_sale(
    request: Request,
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin, RoleEnum.manager))
):
    sale = db.query(Sales).filter(Sales.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    product = sale.product
    log_audit("SALE_DELETE", current_user.email,
              f"sale_id={sale_id} product={product}")
    db.delete(sale)
    db.commit()
    if get_active_source() == "csv":
        set_active_source("db")
    return {"message": f"Sale record for '{product}' deleted."}