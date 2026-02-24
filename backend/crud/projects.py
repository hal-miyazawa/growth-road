# crud/projects.py
from datetime import datetime
import uuid

from sqlalchemy.orm import Session, selectinload

from models.project import Project
from models.task import Task
from schemas import ProjectCreate, ProjectUpdate, TaskUpsert


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4()}"


def create_project(db: Session, payload: ProjectCreate, user_id: str):
    obj = Project(
        id=_new_id("proj"),
        user_id=user_id,
        title=payload.title,
        label_id=payload.label_id,
        current_order_index=(
            payload.current_order_index
            if payload.current_order_index is not None
            else 0
        ),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_project(db: Session, project_id: str, user_id: str):
    return db.query(Project).filter(Project.id == project_id, Project.user_id == user_id).first()


def update_project(db: Session, project_id: str, payload: ProjectUpdate, user_id: str):
    obj = get_project(db, project_id, user_id)
    if not obj:
        return None

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(obj, key, value)

    obj.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(obj)
    return obj


def delete_project(db: Session, project_id: str, user_id: str) -> str:
    """
    return:
      - "deleted"
      - "not_found"
      - "in_use"
    """
    obj = get_project(db, project_id, user_id)
    if not obj:
        return "not_found"

    try:
        db.query(Task).filter(
            Task.project_id == project_id,
            Task.user_id == user_id,
        ).delete(synchronize_session=False)
        db.delete(obj)
        db.commit()
        return "deleted"
    except Exception:
        db.rollback()
        return "in_use"


def upsert_project_tasks(db: Session, project_id: str, payloads: list[TaskUpsert], user_id: str):
    """
    return:
      - ("ok", tasks)
      - ("not_found", None)
      - ("invalid_parent", None)
      - ("id_conflict", None)
    """
    project = get_project(db, project_id, user_id)
    if not project:
        return "not_found", None

    incoming_ids = {item.id for item in payloads if item.id}
    for item in payloads:
        if item.parent_task_id and item.parent_task_id not in incoming_ids:
            return "invalid_parent", None

    existing = {
        task.id: task
        for task in db.query(Task)
        .filter(Task.project_id == project_id, Task.user_id == user_id)
        .all()
    }
    keep_ids: set[str] = set()
    now = datetime.utcnow()

    for item in payloads:
        if item.id:
            obj = existing.get(item.id)
            if not obj:
                task_by_id = db.query(Task).filter(Task.id == item.id).first()
                if task_by_id and task_by_id.user_id != user_id:
                    return "not_found", None
                if (
                    task_by_id
                    and task_by_id.user_id == user_id
                    and task_by_id.project_id is not None
                    and task_by_id.project_id != project_id
                ):
                    return "id_conflict", None

                obj = task_by_id if task_by_id else Task(id=item.id, user_id=user_id)
                if not task_by_id:
                    db.add(obj)

            obj.user_id = user_id
            obj.title = item.title
            obj.memo = item.memo
            obj.label_id = item.label_id
            obj.project_id = project_id
            obj.parent_task_id = item.parent_task_id
            obj.order_index = item.order_index
            obj.completed = item.completed
            obj.completed_at = item.completed_at
            obj.is_fixed = item.is_fixed
            obj.is_group = item.is_group
            obj.updated_at = now
            keep_ids.add(obj.id)
        else:
            new_id = _new_id("task")
            obj = Task(
                id=new_id,
                user_id=user_id,
                title=item.title,
                project_id=project_id,
                label_id=item.label_id,
                parent_task_id=item.parent_task_id,
                order_index=item.order_index,
                memo=item.memo,
                completed=item.completed,
                completed_at=item.completed_at,
                is_fixed=item.is_fixed,
                is_group=item.is_group,
            )
            db.add(obj)
            keep_ids.add(new_id)

    if keep_ids:
        db.query(Task).filter(
            Task.project_id == project_id,
            Task.user_id == user_id,
            ~Task.id.in_(keep_ids),
        ).delete(synchronize_session=False)
    else:
        db.query(Task).filter(
            Task.project_id == project_id,
            Task.user_id == user_id,
        ).delete(synchronize_session=False)

    db.commit()
    tasks = (
        db.query(Task)
        .filter(Task.project_id == project_id, Task.user_id == user_id)
        .order_by(Task.order_index.asc())
        .all()
    )
    return "ok", tasks


def list_projects(db: Session, user_id: str):
    return (
        db.query(Project)
        .filter(Project.user_id == user_id)
        .order_by(Project.created_at.asc())
        .all()
    )


def list_projects_with_tasks(db: Session, user_id: str):
    return (
        db.query(Project)
        .filter(Project.user_id == user_id)
        .options(selectinload(Project.tasks.and_(Task.user_id == user_id)))
        .order_by(Project.created_at.asc())
        .all()
    )
