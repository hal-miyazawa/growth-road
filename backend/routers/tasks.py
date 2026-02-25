from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud
from database import get_db
from dependencies import get_current_user_id
from schemas import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(tags=["tasks"])


@router.get("/tasks", response_model=list[TaskRead])
def list_tasks(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    return crud.list_tasks(db, current_user_id)


@router.post("/tasks", response_model=TaskRead)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    return crud.create_task(db, payload, current_user_id)


@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    try:
        obj = crud.update_task(db, task_id, payload, current_user_id)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to update task")

    if not obj:
        raise HTTPException(status_code=404, detail="Task not found")

    return obj


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    try:
        result = crud.delete_task(db, task_id, current_user_id)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to delete task")

    if result == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")

    if result != "deleted":
        raise HTTPException(status_code=500, detail=f"Unexpected result: {result}")

    return
