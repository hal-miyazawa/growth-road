# crud/labels.py
from sqlalchemy.orm import Session

from models.label import Label
from models.project import Project
from models.task import Task
from schemas import LabelCreate, LabelUpdate

def list_labels(db: Session):
    return db.query(Label).order_by(Label.created_at.asc()).all()

def get_label(db: Session, label_id: str):
    return db.query(Label).filter(Label.id == label_id).first()

def get_label_by_name(db: Session, name: str):
    return db.query(Label).filter(Label.name == name).first()

def create_label(db: Session, payload: LabelCreate):
    obj = Label(name=payload.name, color=payload.color)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def update_label(db: Session, label_id: str, payload: LabelUpdate):
    obj = get_label(db, label_id)
    if not obj:
        return None

    if payload.name is not None:
        obj.name = payload.name
    if payload.color is not None:
        obj.color = payload.color

    db.commit()
    db.refresh(obj)
    return obj

def delete_label(db: Session, label_id: str) -> str:
    """
    return:
      - "deleted"
      - "not_found"
      - "in_use"
    """
    obj = get_label(db, label_id)
    if not obj:
        return "not_found"

    # どれか1件でも紐づきがあれば削除禁止
    used_by_project = (
        db.query(Project.id).filter(Project.label_id == label_id).first() is not None
    )
    used_by_task = (
        db.query(Task.id).filter(Task.label_id == label_id).first() is not None
    )

    if used_by_project or used_by_task:
        return "in_use"

    db.delete(obj)
    db.commit()
    return "deleted"
