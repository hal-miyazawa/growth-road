# crud/tasks.py
from datetime import datetime
from sqlalchemy.orm import Session
import uuid

from models.task import Task
from schemas import TaskCreate, TaskUpdate


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


def get_task(db: Session, task_id: str):
    return db.query(Task).filter(Task.id == task_id).first()


def update_task(db: Session, task_id: str, payload: TaskUpdate):
    obj = get_task(db, task_id)
    if not obj:
        return None

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(obj, key, value)

    obj.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(obj)
    return obj


def delete_task(db: Session, task_id: str) -> str:
    """
    return:
      - "deleted"
      - "not_found"
    """
    obj = get_task(db, task_id)
    if not obj:
        return "not_found"

    db.delete(obj)
    db.commit()
    return "deleted"


def list_tasks(db: Session):
    return db.query(Task).order_by(Task.created_at.asc()).all()
