# models/label.py
from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid

class Label(Base):
    __tablename__ = "labels"

    id = Column(
        String,
        primary_key=True,
        index=True,
        default=lambda: f"label-{uuid.uuid4()}",  # ★追加
    )
    name = Column(String, nullable=False, unique=True)
    color = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    projects = relationship("Project", back_populates="label")
    tasks = relationship("Task", back_populates="label")
