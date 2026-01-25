from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas import ProjectCreate, ProjectRead, ProjectWithTasks
import crud

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    return crud.list_projects(db)


@router.post("/projects", response_model=ProjectRead)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db, payload)


@router.get("/projects-with-tasks", response_model=list[ProjectWithTasks])
def list_projects_with_tasks(db: Session = Depends(get_db)):
    return crud.list_projects_with_tasks(db)
