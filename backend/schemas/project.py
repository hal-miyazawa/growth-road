from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from .task import TaskRead

class ProjectCreate(BaseModel):
    title: str
    label_id: Optional[str] = None

class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    label_id: Optional[str] = None
    current_order_index: int
    created_at: datetime
    updated_at: datetime

class ProjectWithTasks(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    label_id: Optional[str] = None
    current_order_index: int
    tasks: List[TaskRead]
