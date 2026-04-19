from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from .base import Base


class Sales(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    product = Column(String, nullable=False)
    sku = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)   # REQ-SALE-03 revenue calcs
    category = Column(String, nullable=True)
    sale_date = Column(DateTime(timezone=True), server_default=func.now())