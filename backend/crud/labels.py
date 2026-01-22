from __future__ import annotations

from sqlalchemy.orm import Session

from models.label import Label
from api_schemas.label import LabelCreate, LabelUpdate


def list_labels(db: Session) -> list[Label]:
    return db.query(Label).order_by(Label.created_at.asc()).all()


def get_label(db: Session, label_id: str) -> Label | None:
    return db.query(Label).filter(Label.id == label_id).first()


def get_label_by_name(db: Session, name: str) -> Label | None:
    return db.query(Label).filter(Label.name == name).first()


def create_label(db: Session, payload: LabelCreate) -> Label:
    obj = Label(name=payload.name, color=payload.color)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_label(db: Session, label_id: str, payload: LabelUpdate) -> Label | None:
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


def delete_label(db: Session, label_id: str) -> bool:
    obj = get_label(db, label_id)
    if not obj:
        return False

    db.delete(obj)
    db.commit()
    return True
