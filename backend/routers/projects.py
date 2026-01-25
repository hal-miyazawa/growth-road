from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from schemas import ProjectCreate, ProjectRead, ProjectUpdate, ProjectWithTasks, TaskRead, TaskUpsert
import crud

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    return crud.list_projects(db)


@router.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db, payload)

@router.patch("/projects/{project_id}", response_model=ProjectRead)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)):
    try:
        obj = crud.update_project(db, project_id, payload)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to update project")

    if not obj:
        raise HTTPException(status_code=404, detail="Project not found")
    return obj

@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    result = crud.delete_project(db, project_id)
    if result == "not_found":
        raise HTTPException(status_code=404, detail="Project not found")
    if result == "in_use":
        raise HTTPException(status_code=409, detail="Project has dependent tasks")
    return None

@router.put("/projects/{project_id}/tasks", response_model=list[TaskRead])
def upsert_project_tasks(
    project_id: str,
    payloads: list[TaskUpsert],
    db: Session = Depends(get_db),
):
    try:
        result, tasks = crud.upsert_project_tasks(db, project_id, payloads)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to save project tasks")

    if result == "not_found":
        raise HTTPException(status_code=404, detail="Project not found")
    if result == "invalid_parent":
        raise HTTPException(status_code=400, detail="Invalid parent_task_id")
    if result == "id_conflict":
        raise HTTPException(status_code=409, detail="Task id belongs to another project")
    return tasks


@router.get("/projects-with-tasks", response_model=list[ProjectWithTasks])
def list_projects_with_tasks(db: Session = Depends(get_db)):
    return crud.list_projects_with_tasks(db)
