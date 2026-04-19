from pydantic import BaseModel

class SalesCreate(BaseModel):
    name: str
    quantity: int