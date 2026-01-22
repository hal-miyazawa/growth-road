from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=True)
    label_id = Column(String, ForeignKey("labels.id"), nullable=True)

    parent_task_id = Column(String, nullable=True)
    order_index = Column(Integer, default=0)

    title = Column(String, nullable=False)
    memo = Column(String, nullable=True)

    completed = Column(Boolean, default=False)
    is_fixed = Column(Boolean, default=False)
    is_group = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="tasks")
    label = relationship("Label", back_populates="tasks")
