from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    # Map DB column "name" to Python attribute "title".
    title = Column("name", String, nullable=False)
    label_id = Column(String, ForeignKey("labels.id"), nullable=True)
    current_order_index = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    label = relationship("Label", back_populates="projects")
    tasks = relationship("Task", back_populates="project")
