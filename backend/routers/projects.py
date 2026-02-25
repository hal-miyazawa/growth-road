from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import crud
from database import get_db
from dependencies import get_current_user_id
from schemas import ProjectCreate, ProjectRead, ProjectUpdate, ProjectWithTasks, TaskRead, TaskUpsert

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=list[ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    return crud.list_projects(db, current_user_id)


@router.post("/projects", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    return crud.create_project(db, payload, current_user_id)


@router.patch("/projects/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    try:
        obj = crud.update_project(db, project_id, payload, current_user_id)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to update project")

    if not obj:
        raise HTTPException(status_code=404, detail="Project not found")
    return obj


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    result = crud.delete_project(db, project_id, current_user_id)
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
    current_user_id: str = Depends(get_current_user_id),
):
    try:
        result, tasks = crud.upsert_project_tasks(db, project_id, payloads, current_user_id)
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
def list_projects_with_tasks(
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user_id),
):
    return crud.list_projects_with_tasks(db, current_user_id)
