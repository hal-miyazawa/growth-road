from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base



# =========================
# Project テーブル定義
# =========================
# Base を継承することで SQLAlchemy の ORM モデルになる
class Project(Base):
    # データベース上のテーブル名
    __tablename__ = "projects"

    # =========================
    # カラム定義
    # =========================

    # 主キー（自動採番）
    # index=True により検索が高速化される
    id = Column(Integer, primary_key=True, index=True)

    # プロジェクト名
    # nullable=False → 必須項目
    title = Column(String, nullable=False)

    # プロジェクトの説明
    # nullable=True → 空でもOK
    description = Column(String, nullable=True)

    # =========================
    # タイムスタンプ
    # =========================

    # レコード作成日時
    # server_default=func.now() → DB側で現在時刻を自動設定
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # レコード更新日時
    # onupdate=func.now() → UPDATE時に自動で現在時刻に更新
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )


      # Project → Task（1対多）
    tasks = relationship("Task", back_populates="project")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)

    title = Column(String, nullable=False)
    is_done = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    # Task → Project
    project = relationship("Project", back_populates="tasks")
