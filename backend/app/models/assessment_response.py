from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AssessmentResponse(Base):
    __tablename__ = "assessment_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("assessment_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[str] = mapped_column(String(64), nullable=False)

    selected_option_ids: Mapped[List[str]] = mapped_column(JSON, default=list)
    first_answered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_answered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    change_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    time_spent_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    attempt: Mapped["AssessmentAttempt"] = relationship(
        "AssessmentAttempt", back_populates="responses"
    )

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),
        Index("ix_responses_attempt_id", "attempt_id"),
        Index("ix_responses_question_id", "question_id"),
    )
