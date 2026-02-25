import uuid

from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=lambda: f"user-{uuid.uuid4()}")
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    labels = relationship("Label", back_populates="user")
    projects = relationship("Project", back_populates="user")
    tasks = relationship("Task", back_populates="user")
