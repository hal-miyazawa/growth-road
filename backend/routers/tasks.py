from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas import TaskCreate, TaskRead
import crud

router = APIRouter(tags=["tasks"])


@router.get("/tasks", response_model=list[TaskRead])
def list_tasks(db: Session = Depends(get_db)):
    return crud.list_tasks(db)


@router.post("/tasks", response_model=TaskRead)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db, payload)
