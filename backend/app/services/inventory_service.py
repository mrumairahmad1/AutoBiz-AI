from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Inventory


def get_inventory():

    db: Session = SessionLocal()

    try:
        items = db.query(Inventory).all()
        return items

    finally:
        db.close()