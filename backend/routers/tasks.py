from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from schemas import TaskCreate, TaskRead, TaskUpdate
import crud

router = APIRouter(tags=["tasks"])


@router.get("/tasks", response_model=list[TaskRead])
def list_tasks(db: Session = Depends(get_db)):
    return crud.list_tasks(db)


@router.post("/tasks", response_model=TaskRead)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db, payload)


@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(task_id: str, payload: TaskUpdate, db: Session = Depends(get_db)):
    try:
        obj = crud.update_task(db, task_id, payload)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to update task")

    if not obj:
        raise HTTPException(status_code=404, detail="Task not found")

    return obj


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: str, db: Session = Depends(get_db)):
    try:
        result = crud.delete_task(db, task_id)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to delete task")

    if result == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")

    if result != "deleted":
        raise HTTPException(status_code=500, detail=f"Unexpected result: {result}")

    return
