from datetime import datetime, timezone
from typing import Any, List, Optional
from sqlalchemy import DateTime, Float, Index, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    lesson_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    subject_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    content_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    overall_progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    assessment_status: Mapped[str] = mapped_column(
        String(32), default="not-attempted", nullable=False
    )
    assessment_attempt_id: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )
    assessment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    completed_section_ids: Mapped[List[str]] = mapped_column(JSON, default=list)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson_progress"),
        Index("ix_lesson_progress_user_subject", "user_id", "subject_id"),
        Index("ix_lesson_progress_user_lesson", "user_id", "lesson_id"),
    )
