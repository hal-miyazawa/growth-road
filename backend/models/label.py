import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime
from database import Base


class Label(Base):
    __tablename__ = "labels"

    id = Column(String, primary_key=True, default=lambda: f"label-{uuid.uuid4()}")
    name = Column(String, nullable=False, unique=True)
    color = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
