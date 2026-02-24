# models/label.py
from sqlalchemy import Column, String, DateTime, ForeignKey
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
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    # Map DB column "name" to Python attribute "title".
    title = Column("name", String, nullable=False)
    color = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="labels")
    projects = relationship("Project", back_populates="label")
    tasks = relationship("Task", back_populates="label")
