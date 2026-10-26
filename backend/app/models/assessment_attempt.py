from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, Index, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    assessment_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    lesson_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    subject_id: Mapped[str] = mapped_column(String(64), nullable=False)

    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    completion_status: Mapped[str] = mapped_column(
        String(32), default="not-attempted", nullable=False
    )
    success_status: Mapped[str] = mapped_column(
        String(32), default="unknown", nullable=False
    )
    progress_measure: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    score_raw: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_min: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    score_max: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    score_scaled: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    session_time_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_question_id: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )
    exit_reason: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    suspend_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    schema_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relationships
    responses: Mapped[List["AssessmentResponse"]] = relationship(
        "AssessmentResponse",
        back_populates="attempt",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("ix_attempts_user_lesson", "user_id", "lesson_id"),
        Index("ix_attempts_user_assessment", "user_id", "assessment_id"),
        Index(
            "ix_attempts_user_lesson_assessment",
            "user_id",
            "lesson_id",
            "assessment_id",
        ),
    )
