from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class TaskCreate(BaseModel):
    title: str
    project_id: Optional[str] = None
    label_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    order_index: int = 0
    memo: Optional[str] = None
    completed: bool = False
    completed_at: Optional[datetime] = None
    is_fixed: bool = False
    is_group: bool = False

class TaskUpsert(BaseModel):
    id: Optional[str] = None
    title: str
    project_id: Optional[str] = None
    label_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    order_index: int = 0
    memo: Optional[str] = None
    completed: bool = False
    completed_at: Optional[datetime] = None
    is_fixed: bool = False
    is_group: bool = False

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    memo: Optional[str] = None
    label_id: Optional[str] = None
    project_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    order_index: Optional[int] = None
    completed: Optional[bool] = None
    completed_at: Optional[datetime] = None
    is_fixed: Optional[bool] = None
    is_group: Optional[bool] = None

class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    project_id: Optional[str] = None
    label_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    order_index: int
    memo: Optional[str] = None
    completed: bool
    completed_at: Optional[datetime] = None
    is_fixed: bool
    is_group: bool
    created_at: datetime
    updated_at: datetime
