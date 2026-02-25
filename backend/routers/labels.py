from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud
from database import get_db
from dependencies import get_current_user_id
from schemas import LabelCreate, LabelRead, LabelUpdate

router = APIRouter(prefix="/labels", tags=["labels"])


@router.get("", response_model=list[LabelRead])
def list_labels(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    return crud.list_labels(db, current_user_id)


@router.post("", response_model=LabelRead)
def create_label(
    payload: LabelCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    exists = crud.get_label_by_title(db, payload.title, current_user_id)
    if exists:
        raise HTTPException(status_code=400, detail="Label title already exists")
    return crud.create_label(db, payload, current_user_id)


@router.patch("/{label_id}", response_model=LabelRead)
def update_label(
    label_id: str,
    payload: LabelUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    obj = crud.update_label(db, label_id, payload, current_user_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Label not found")
    return obj


@router.delete("/{label_id}", status_code=204)
def delete_label(
    label_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    result = crud.delete_label(db, label_id, current_user_id)

    if result == "not_found":
        raise HTTPException(status_code=404, detail="Label not found")

    if result == "in_use":
        raise HTTPException(
            status_code=409,
            detail="This label is used by some projects/tasks, so it can't be deleted.",
        )

    if result != "deleted":
        raise HTTPException(status_code=500, detail=f"Unexpected result: {result}")

    return
