from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List



class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None


class ProjectRead(BaseModel):
    id: int
    title: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class TaskCreate(BaseModel):
    project_id: int
    title: str


class TaskRead(BaseModel):
    id: int
    project_id: int
    title: str
    is_done: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class ProjectWithTasks(BaseModel):
    id: int
    title: str
    description: Optional[str]
    tasks: List[TaskRead]

    class Config:
        orm_mode = True


