from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ContentSubject(Base):
    __tablename__ = "content_subjects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    grade: Mapped[str] = mapped_column(String(32), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    chapters: Mapped[List["ContentChapter"]] = relationship(
        "ContentChapter", back_populates="subject", cascade="all, delete-orphan"
    )


class ContentChapter(Base):
    __tablename__ = "content_chapters"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    subject_id: Mapped[str] = mapped_column(String(64), ForeignKey("content_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    subject: Mapped["ContentSubject"] = relationship("ContentSubject", back_populates="chapters")
    lessons: Mapped[List["ContentLesson"]] = relationship(
        "ContentLesson", back_populates="chapter", cascade="all, delete-orphan"
    )


class ContentLesson(Base):
    __tablename__ = "content_lessons"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    chapter_id: Mapped[str] = mapped_column(String(64), ForeignKey("content_chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="draft", nullable=False)  # draft, in-review, published, archived
    author_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Content breakdown matching learner lesson
    introduction: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    definitions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON encoded list
    formulas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)     # JSON encoded list
    examples: Mapped[Optional[str]] = mapped_column(Text, nullable=True)     # JSON encoded list
    important_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON encoded list
    summary_points: Mapped[Optional[str]] = mapped_column(Text, nullable=True)   # JSON encoded list

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    chapter: Mapped["ContentChapter"] = relationship("ContentChapter", back_populates="lessons")
    assessments: Mapped[List["ContentAssessment"]] = relationship(
        "ContentAssessment", back_populates="lesson", cascade="all, delete-orphan"
    )


class ContentAssessment(Base):
    __tablename__ = "content_assessments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(String(64), ForeignKey("content_lessons.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    pass_score: Mapped[int] = mapped_column(Integer, default=80, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    lesson: Mapped["ContentLesson"] = relationship("ContentLesson", back_populates="assessments")
    questions: Mapped[List["ContentQuestion"]] = relationship(
        "ContentQuestion", back_populates="assessment", cascade="all, delete-orphan"
    )


class ContentQuestion(Base):
    __tablename__ = "content_questions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    assessment_id: Mapped[str] = mapped_column(String(64), ForeignKey("content_assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[str] = mapped_column(Text, nullable=False)  # JSON encoded list
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    assessment: Mapped["ContentAssessment"] = relationship("ContentAssessment", back_populates="questions")
