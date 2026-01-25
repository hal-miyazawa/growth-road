from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from database import get_db
from schemas import LabelCreate, LabelRead, LabelUpdate
import crud

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=list[LabelRead])
def list_labels(db: Session = Depends(get_db)):
    return crud.list_labels(db)


@router.post("", response_model=LabelRead)
def create_label(payload: LabelCreate, db: Session = Depends(get_db)):
    exists = crud.get_label_by_title(db, payload.title)
    if exists:
        raise HTTPException(status_code=400, detail="Label title already exists")
    return crud.create_label(db, payload)


@router.patch("/{label_id}", response_model=LabelRead)
def update_label(label_id: str, payload: LabelUpdate, db: Session = Depends(get_db)):
    obj = crud.update_label(db, label_id, payload)
    if not obj:
        raise HTTPException(status_code=404, detail="Label not found")
    return obj


@router.delete("/{label_id}", status_code=204)
def delete_label(label_id: str, db: Session = Depends(get_db)):
    result = crud.delete_label(db, label_id)

    if result == "not_found":
        raise HTTPException(status_code=404, detail="Label not found")

    if result == "in_use":
        raise HTTPException(
            status_code=409,
            detail="This label is used by some projects/tasks, so it can't be deleted."
        )

    if result != "deleted":
        raise HTTPException(status_code=500, detail=f"Unexpected result: {result}")

    return
