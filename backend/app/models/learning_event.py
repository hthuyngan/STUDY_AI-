from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, Index, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class LearningEventModel(Base):
    __tablename__ = "learning_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    attempt_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    lesson_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    subject_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    schema_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    __table_args__ = (
        Index("ix_events_user_timestamp", "user_id", "timestamp"),
        Index("ix_events_user_lesson", "user_id", "lesson_id"),
        Index("ix_events_user_subject", "user_id", "subject_id"),
    )
