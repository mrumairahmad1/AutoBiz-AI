from ..database import SessionLocal
from ..models import Sale


def get_sales():

    db = SessionLocal()

    sales = db.query(Sale).all()

    db.close()

    return sales