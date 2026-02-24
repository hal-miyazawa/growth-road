from datetime import datetime
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, SessionLocal
from dependencies import get_password_hash
from models import Label, Project, Task, User
from routers.auth import router as auth_router
from routers.labels import router as labels_router
from routers.projects import router as projects_router
from routers.tasks import router as tasks_router
from seed_projects_tasks import seed_projects_tasks_if_needed

import models

SEED_LABELS = [
    {
        "id": "label-2a9168c6-2bd9-4714-8606-8152f74c41af",
        "title": "資格勉強",
        "color": "#0047A1",
        "created_at": "2026-01-25T10:12:35",
    },
    {
        "id": "label-0d19dcb3-7a1e-432b-8b70-1149eb170770",
        "title": "家事",
        "color": "#35DCB8",
        "created_at": "2026-01-25T10:12:41",
    },
    {
        "id": "label-88be2f01-ceec-4033-b1a4-01b974c10457",
        "title": "仕事",
        "color": "#0047A1",
        "created_at": "2026-01-25T10:12:46",
    },
    {
        "id": "label-21ce59b8-a99c-49c4-8dcb-c16679cc03df",
        "title": "健康",
        "color": "#A6C93A",
        "created_at": "2026-01-25T10:12:51",
    },
    {
        "id": "label-18315cc6-bb57-4e55-ada2-6897d2423958",
        "title": "バイト",
        "color": "#D6455D",
        "created_at": "2026-01-25T10:12:55",
    },
    {
        "id": "label-e5a0fb82-41f9-43c8-b393-28034faba0e5",
        "title": "開発",
        "color": "#67D08A",
        "created_at": "2026-01-25T10:12:58",
    },
    {
        "id": "label-d4461be6-aad5-499b-98dc-97e8d715eeea",
        "title": "お金",
        "color": "#D0C98A",
        "created_at": "2026-01-25T10:13:02",
    },
]

DEFAULT_DEV_USER_ID = "dev-user"
DEFAULT_DEV_USER_EMAIL = "dev@example.com"
# Dev-only seed credential used only when creating a brand-new local DB.
DEFAULT_DEV_USER_PASSWORD = "dev-password"

def seed_if_new_db():
    db_path = Path("growth_road.db")
    is_new_db = not db_path.exists()

    # Dev-only: no migrations. If schema changes (e.g. auth/user columns added),
    # delete `backend/growth_road.db` then restart.
    Base.metadata.create_all(bind=engine)

    if not is_new_db:
        return

    db = SessionLocal()
    try:
        db.add(
            User(
                id=DEFAULT_DEV_USER_ID,
                email=DEFAULT_DEV_USER_EMAIL,
                password_hash=get_password_hash(DEFAULT_DEV_USER_PASSWORD),
            )
        )

        labels = [
            Label(
                id=item["id"],
                user_id=DEFAULT_DEV_USER_ID,
                title=item["title"],
                color=item["color"],
                created_at=datetime.fromisoformat(item["created_at"]),
            )
            for item in SEED_LABELS
        ]
        db.add_all(labels)


        db.commit()
    finally:
        db.close()


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
app.include_router(projects_router, prefix="/api")
app.include_router(tasks_router, prefix="/api")
app.include_router(auth_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    seed_if_new_db()
    db = SessionLocal()
    try:
        seed_projects_tasks_if_needed(db, user_id=DEFAULT_DEV_USER_ID)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}
