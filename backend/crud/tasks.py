# crud/tasks.py
from sqlalchemy.orm import Session
import uuid

from models.task import Task
from schemas import TaskCreate


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4()}"


def create_task(db: Session, payload: TaskCreate):
    obj = Task(
        id=_new_id("task"),
        title=payload.title,
        project_id=payload.project_id,
        label_id=payload.label_id,
        parent_task_id=payload.parent_task_id,
        order_index=payload.order_index,
        memo=payload.memo,
        completed=payload.completed,
        completed_at=payload.completed_at,
        is_fixed=payload.is_fixed,
        is_group=payload.is_group,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_tasks(db: Session):
    return db.query(Task).order_by(Task.created_at.asc()).all()
