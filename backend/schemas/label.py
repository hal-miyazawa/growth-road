from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class LabelCreate(BaseModel):
    name: str
    color: Optional[str] = None

class LabelUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class LabelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    color: Optional[str] = None
    created_at: datetime