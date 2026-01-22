from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import crud
from schemas import ProjectCreate, ProjectRead, ProjectWithTasks, TaskCreate, TaskRead

# ルータ
from routers.labels import router as labels_router

# テーブル作成のために読み込み
import models  # ← models/__init__.py が読み込まれて全モデル登録される


app = FastAPI(title="Growth Road API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(labels_router, prefix="/api")

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"status": "ok"}

# Project
@app.post("/projects", response_model=ProjectRead)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db, project)

@app.get("/projects", response_model=list[ProjectRead])
def read_projects(db: Session = Depends(get_db)):
    return crud.list_projects(db)  # ← ここは君のcrud名に合わせて

@app.post("/tasks", response_model=TaskRead)
def create_task(task: TaskCreate, db: Session = Depends(get_db)):
    return crud.create_task(db, task)

@app.get("/projects-with-tasks", response_model=list[ProjectWithTasks])
def read_projects_with_tasks(db: Session = Depends(get_db)):
    return crud.get_projects_with_tasks(db)