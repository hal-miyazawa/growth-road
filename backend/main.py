from sqlalchemy.orm import Session
import models

# 例：Project/Task のスキーマが schemas.py 側にある場合
import schemas as api_schemas

# labels は api_schemas.label を使ってるので、crud/labels.py から取り込みはOK
from crud.labels import (
    list_labels,
    get_label,
    get_label_by_name,
    create_label,
    update_label,
    delete_label,
)


def create_project(db: Session, project: api_schemas.ProjectCreate):
    db_project = models.Project(
        title=project.title,
        description=project.description,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def get_projects(db: Session):
    return db.query(models.Project).all()


def create_task(db: Session, task: api_schemas.TaskCreate):
    db_task = models.Task(
        project_id=task.project_id,
        title=task.title,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_projects_with_tasks(db: Session):
    return db.query(models.Project).all()
