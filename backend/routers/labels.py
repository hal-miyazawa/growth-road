from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from api_schemas.label import LabelCreate, LabelRead, LabelUpdate
import crud  # ← crud.py を入口にするならこれでOK（今の君の形）

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=list[LabelRead])
def list_labels(db: Session = Depends(get_db)):
    return crud.list_labels(db)


@router.post("", response_model=LabelRead)
def create_label(payload: LabelCreate, db: Session = Depends(get_db)):
    exists = crud.get_label_by_name(db, payload.name)
    if exists:
        raise HTTPException(status_code=400, detail="Label name already exists")
    return crud.create_label(db, payload)


@router.patch("/{label_id}", response_model=LabelRead)
def update_label(label_id: str, payload: LabelUpdate, db: Session = Depends(get_db)):
    obj = crud.update_label(db, label_id, payload)
    if not obj:
        raise HTTPException(status_code=404, detail="Label not found")
    return obj


@router.delete("/{label_id}", status_code=204)
def delete_label(label_id: str, db: Session = Depends(get_db)):
    ok = crud.delete_label(db, label_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Label not found")
    return
