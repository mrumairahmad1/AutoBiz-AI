from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.purchase_order import PurchaseOrder, POStatus
from app.models.inventory import Inventory
from app.core.security import get_current_user, require_role
from app.models.user import User, RoleEnum
from app.core.logger import log_audit, log_error
from app.core.rate_limiter import limiter, LIMITS

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])


class POCreateRequest(BaseModel):
    """
    Schema that matches what the frontend form sends.
    total_cost is provided directly by the form — no sku or unit_cost required.
    """
    product:    str
    quantity:   int
    total_cost: float
    supplier:   Optional[str] = None
    notes:      Optional[str] = None


class POEditRequest(BaseModel):
    """Used for PUT /purchase-orders/{id} — manager or admin can edit."""
    product:    Optional[str]   = None
    quantity:   Optional[int]   = None
    total_cost: Optional[float] = None
    supplier:   Optional[str]   = None
    notes:      Optional[str]   = None


class POActionRequest(BaseModel):
    notes: Optional[str] = None


@router.post("/", status_code=201)
@limiter.limit(LIMITS["crud"])
def create_purchase_order(
    request: Request,
    req: POCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin, RoleEnum.manager))
):
    """Create a new purchase order — pending status (HITL). Admin + Manager."""
    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    if req.total_cost < 0:
        raise HTTPException(status_code=400, detail="Total cost cannot be negative")

    po = PurchaseOrder(
        product      = req.product.strip(),
        sku          = "",               # not required from form
        quantity     = req.quantity,
        unit_cost    = req.total_cost / req.quantity if req.quantity else 0,
        total_cost   = req.total_cost,
        supplier     = req.supplier.strip() if req.supplier else None,
        status       = POStatus.pending,
        requested_by = current_user.email,
        notes        = req.notes.strip() if req.notes else None,
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    log_audit("PO_CREATED", current_user.email,
              f"product={req.product} qty={req.quantity} total=${req.total_cost}")

    return {
        "message":    "Purchase order created and awaiting approval",
        "po_id":      po.id,
        "product":    po.product,
        "quantity":   po.quantity,
        "total_cost": po.total_cost,
        "status":     po.status,
    }


@router.get("/")
@limiter.limit(LIMITS["crud"])
def list_purchase_orders(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all purchase orders — all authenticated users."""
    return db.query(PurchaseOrder).all()


@router.get("/pending")
@limiter.limit(LIMITS["crud"])
def list_pending_orders(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin, RoleEnum.manager))
):
    """List pending orders — manager + admin."""
    return db.query(PurchaseOrder).filter(PurchaseOrder.status == POStatus.pending).all()


@router.put("/{po_id}")
@limiter.limit(LIMITS["crud"])
def edit_purchase_order(
    request: Request,
    po_id: int,
    req: POEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin, RoleEnum.manager))
):
    """Edit a purchase order — manager + admin. Any status can be edited."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    if req.product    is not None: po.product    = req.product.strip()
    if req.quantity   is not None: po.quantity   = req.quantity
    if req.total_cost is not None: po.total_cost = req.total_cost
    if req.supplier   is not None: po.supplier   = req.supplier.strip() or None
    if req.notes      is not None: po.notes      = req.notes.strip()    or None

    # Recalculate unit_cost if both are present
    if po.quantity and po.quantity > 0:
        po.unit_cost = po.total_cost / po.quantity

    db.commit()
    db.refresh(po)

    log_audit("PO_EDITED", current_user.email,
              f"po_id={po_id} product={po.product} qty={po.quantity} total=${po.total_cost}")

    return {
        "message":    f"Purchase order #{po_id} updated",
        "product":    po.product,
        "quantity":   po.quantity,
        "total_cost": po.total_cost,
        "status":     po.status,
    }


@router.post("/{po_id}/approve")
@limiter.limit(LIMITS["crud"])
def approve_purchase_order(
    request: Request,
    po_id: int,
    req: POActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin))   # admin only
):
    """Approve a PO and update inventory — ADMIN ONLY."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status != POStatus.pending:
        raise HTTPException(status_code=400, detail=f"Order is already {po.status}")

    po.status      = POStatus.approved
    po.approved_by = current_user.email
    if req.notes:
        po.notes = req.notes

    # Auto-update inventory: find item by SKU or product name
    inv_item = None
    if po.sku:
        inv_item = db.query(Inventory).filter(Inventory.sku == po.sku).first()
    if not inv_item:
        all_inv = db.query(Inventory).all()
        product_lower = po.product.lower()
        for i in all_inv:
            if product_lower in i.name.lower() or i.name.lower() in product_lower:
                inv_item = i
                break

    new_inventory = "N/A"
    if inv_item:
        inv_item.quantity += po.quantity
        new_inventory = inv_item.quantity

    db.commit()

    log_audit("PO_APPROVED", current_user.email,
              f"po_id={po_id} product={po.product} qty={po.quantity}")

    return {
        "message":        f"Purchase order #{po_id} approved",
        "product":        po.product,
        "quantity_added": po.quantity,
        "approved_by":    current_user.email,
        "new_inventory":  new_inventory,
    }


@router.post("/{po_id}/reject")
@limiter.limit(LIMITS["crud"])
def reject_purchase_order(
    request: Request,
    po_id: int,
    req: POActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.admin))   # admin only
):
    """Reject a purchase order — ADMIN ONLY."""
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status != POStatus.pending:
        raise HTTPException(status_code=400, detail=f"Order is already {po.status}")

    po.status      = POStatus.rejected
    po.approved_by = current_user.email
    if req.notes:
        po.notes = req.notes

    db.commit()

    log_audit("PO_REJECTED", current_user.email,
              f"po_id={po_id} product={po.product}")

    return {
        "message":     f"Purchase order #{po_id} rejected",
        "product":     po.product,
        "rejected_by": current_user.email,
    }