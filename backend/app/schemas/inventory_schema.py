from pydantic import BaseModel

class InventoryCreate(BaseModel):
    name: str
    quantity: int