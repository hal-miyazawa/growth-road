# crud/labels.py
from sqlalchemy.orm import Session

from models.label import Label
from models.project import Project
from models.task import Task
from schemas import LabelCreate, LabelUpdate

def list_labels(db: Session, user_id: str):
    return (
        db.query(Label)
        .filter(Label.user_id == user_id)
        .order_by(Label.created_at.asc())
        .all()
    )

def get_label(db: Session, label_id: str, user_id: str):
    return db.query(Label).filter(Label.id == label_id, Label.user_id == user_id).first()

def get_label_by_title(db: Session, title: str, user_id: str):
    return db.query(Label).filter(Label.title == title, Label.user_id == user_id).first()

def create_label(db: Session, payload: LabelCreate, user_id: str):
    obj = Label(title=payload.title, color=payload.color, user_id=user_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def update_label(db: Session, label_id: str, payload: LabelUpdate, user_id: str):
    obj = get_label(db, label_id, user_id)
    if not obj:
        return None

    if payload.title is not None:
        obj.title = payload.title
    if payload.color is not None:
        obj.color = payload.color

    db.commit()
    db.refresh(obj)
    return obj

def delete_label(db: Session, label_id: str, user_id: str) -> str:
    """
    return:
      - "deleted"
      - "not_found"
      - "in_use"
    """
    obj = get_label(db, label_id, user_id)
    if not obj:
        return "not_found"

    # どれか1件でも紐づきがあれば削除禁止
    used_by_project = (
        db.query(Project.id)
        .filter(Project.label_id == label_id, Project.user_id == user_id)
        .first()
        is not None
    )
    used_by_task = (
        db.query(Task.id)
        .filter(Task.label_id == label_id, Task.user_id == user_id)
        .first()
        is not None
    )

    if used_by_project or used_by_task:
        return "in_use"

    db.delete(obj)
    db.commit()
    return "deleted"
