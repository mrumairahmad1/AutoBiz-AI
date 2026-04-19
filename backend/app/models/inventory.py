from sqlalchemy import Column, Integer, String, Float
from .base import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    quantity = Column(Integer, default=0)
    reorder_point = Column(Integer, default=10)       # REQ-INV-01
    reorder_quantity = Column(Integer, default=50)
    unit_cost = Column(Float, default=0.0)            # for EOQ calc REQ-INV-03
    holding_cost = Column(Float, default=1.0)         # annual holding cost per unit
    ordering_cost = Column(Float, default=50.0)       # cost per order
    supplier = Column(String, nullable=True)          # REQ-INV-05
    supplier_lead_days = Column(Integer, default=7)