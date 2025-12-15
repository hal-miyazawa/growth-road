from sqlalchemy.orm import Session
import models, schemas

def create_project(db: Session, project: schemas.ProjectCreate):
    db_project = models.Project(
        title=project.title,
        description=project.description
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


def get_projects(db: Session):
    return db.query(models.Project).all()


def create_task(db: Session, task: schemas.TaskCreate):
    db_task = models.Task(
        project_id=task.project_id,
        title=task.title
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_projects_with_tasks(db: Session):
    return db.query(models.Project).all()
