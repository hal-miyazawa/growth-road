# crud/projects.py
from sqlalchemy.orm import Session
import uuid

from models.project import Project
from schemas import ProjectCreate

def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4()}"

def create_project(db: Session, payload: ProjectCreate):
    obj = Project(
        id=_new_id("proj"),
        title=payload.title,                 # ← name じゃなく title
        label_id=payload.label_id,           # ← schemasに入れたなら getattr不要
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def list_projects(db: Session):
    return db.query(Project).all()
