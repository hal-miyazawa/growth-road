# FastAPI 本体を使うための import
from fastapi import FastAPI, Depends

# DB 関連（エンジン・Base・Session取得用）
from database import engine, Base, get_db

# SQLAlchemy のモデル定義を読み込む
# ※ これを import しないとテーブルが作られない
import models

# スキーマ（API 入出力用）と CRUD（DB操作）
import schemas, crud

# SQLAlchemy の Session 型
from sqlalchemy.orm import Session


# FastAPI アプリケーションを作成
app = FastAPI(title="Growth Road API")


# ==============================
# アプリ起動時の初期処理
# ==============================
@app.on_event("startup")
def on_startup():
    """
    FastAPI 起動時に一度だけ呼ばれる。
    まだ存在しないテーブルがあれば作成する。
    既に存在する場合は何もしない。
    """
    Base.metadata.create_all(bind=engine)


# ==============================
# 動作確認用 API
# ==============================
@app.get("/health")
def health():
    """
    サーバーが起動しているか確認するための API
    """
    return {"status": "ok"}


# ==============================
# Project を新規作成する API
# ==============================
@app.post("/projects", response_model=schemas.ProjectRead)
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db)
):
    """
    Project を1件 DB に保存する
    """
    return crud.create_project(db, project)


# ==============================
# Project 一覧を取得する API
# ==============================
@app.get("/projects", response_model=list[schemas.ProjectRead])
def read_projects(db: Session = Depends(get_db)):
    """
    登録されている Project をすべて取得する
    """
    return crud.get_projects(db)



# Task 作成
@app.post("/tasks", response_model=schemas.TaskRead)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db)
):
    return crud.create_task(db, task)

# Project + Task 一覧（総合画面用）
@app.get("/projects-with-tasks", response_model=list[schemas.ProjectWithTasks])
def read_projects_with_tasks(db: Session = Depends(get_db)):
    return crud.get_projects_with_tasks(db)

