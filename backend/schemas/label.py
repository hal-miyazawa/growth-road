from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class LabelCreate(BaseModel):
    title: str
    color: Optional[str] = None

class LabelUpdate(BaseModel):
    title: Optional[str] = None
    color: Optional[str] = None

class LabelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    color: Optional[str] = None
    created_at: datetime
