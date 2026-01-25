# crud/projects.py
from sqlalchemy.orm import Session, selectinload
import uuid

from models.project import Project
from schemas import ProjectCreate

def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4()}"

def create_project(db: Session, payload: ProjectCreate):
    obj = Project(
        id=_new_id("proj"),
        title=payload.title,                 # ↁEname じゃなぁEtitle
        label_id=payload.label_id,           # ↁEschemasに入れたなめEgetattr不要E
        current_order_index=0,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_projects(db: Session):
    return db.query(Project).order_by(Project.created_at.asc()).all()

def list_projects_with_tasks(db: Session):
    return (
        db.query(Project)
        .options(selectinload(Project.tasks))
        .order_by(Project.created_at.asc())
        .all()
    )
