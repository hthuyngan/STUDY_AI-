"""Initial schema for StudyAI persistence foundation

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-10-26 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    # 2. Lesson Progress Table
    op.create_table(
        "lesson_progress",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("lesson_id", sa.String(length=64), nullable=False),
        sa.Column("subject_id", sa.String(length=64), nullable=False),
        sa.Column("content_progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("overall_progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "assessment_status",
            sa.String(length=32),
            nullable=False,
            server_default="not-attempted",
        ),
        sa.Column("assessment_attempt_id", sa.String(length=64), nullable=True),
        sa.Column("assessment_score", sa.Float(), nullable=True),
        sa.Column("completed_section_ids", sa.JSON(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson_progress"),
    )
    op.create_index(
        "ix_lesson_progress_user_id", "lesson_progress", ["user_id"], unique=False
    )
    op.create_index(
        "ix_lesson_progress_lesson_id", "lesson_progress", ["lesson_id"], unique=False
    )
    op.create_index(
        "ix_lesson_progress_user_subject",
        "lesson_progress",
        ["user_id", "subject_id"],
        unique=False,
    )
    op.create_index(
        "ix_lesson_progress_user_lesson",
        "lesson_progress",
        ["user_id", "lesson_id"],
        unique=False,
    )

    # 3. Assessment Attempts Table
    op.create_table(
        "assessment_attempts",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("assessment_id", sa.String(length=64), nullable=False),
        sa.Column("lesson_id", sa.String(length=64), nullable=False),
        sa.Column("subject_id", sa.String(length=64), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "completion_status",
            sa.String(length=32),
            nullable=False,
            server_default="not-attempted",
        ),
        sa.Column(
            "success_status",
            sa.String(length=32),
            nullable=False,
            server_default="unknown",
        ),
        sa.Column("progress_measure", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("score_raw", sa.Float(), nullable=True),
        sa.Column("score_min", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("score_max", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("score_scaled", sa.Float(), nullable=True),
        sa.Column("session_time_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_question_id", sa.String(length=64), nullable=True),
        sa.Column("exit_reason", sa.String(length=64), nullable=True),
        sa.Column("suspend_data", sa.JSON(), nullable=True),
        sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index(
        "ix_assessment_attempts_user_id",
        "assessment_attempts",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_assessment_attempts_assessment_id",
        "assessment_attempts",
        ["assessment_id"],
        unique=False,
    )
    op.create_index(
        "ix_assessment_attempts_lesson_id",
        "assessment_attempts",
        ["lesson_id"],
        unique=False,
    )
    op.create_index(
        "ix_attempts_user_lesson",
        "assessment_attempts",
        ["user_id", "lesson_id"],
        unique=False,
    )
    op.create_index(
        "ix_attempts_user_assessment",
        "assessment_attempts",
        ["user_id", "assessment_id"],
        unique=False,
    )
    op.create_index(
        "ix_attempts_user_lesson_assessment",
        "assessment_attempts",
        ["user_id", "lesson_id", "assessment_id"],
        unique=False,
    )

    # 4. Assessment Responses Table
    op.create_table(
        "assessment_responses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("attempt_id", sa.String(length=64), nullable=False),
        sa.Column("question_id", sa.String(length=64), nullable=False),
        sa.Column("selected_option_ids", sa.JSON(), nullable=False),
        sa.Column("first_answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("change_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("time_spent_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(
            ["attempt_id"], ["assessment_attempts.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),
    )
    op.create_index(
        "ix_responses_attempt_id",
        "assessment_responses",
        ["attempt_id"],
        unique=False,
    )
    op.create_index(
        "ix_responses_question_id",
        "assessment_responses",
        ["question_id"],
        unique=False,
    )

    # 5. Learning Events Table
    op.create_table(
        "learning_events",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("attempt_id", sa.String(length=64), nullable=True),
        sa.Column("lesson_id", sa.String(length=64), nullable=False),
        sa.Column("subject_id", sa.String(length=64), nullable=False),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("schema_version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index(
        "ix_learning_events_user_id", "learning_events", ["user_id"], unique=False
    )
    op.create_index(
        "ix_learning_events_timestamp", "learning_events", ["timestamp"], unique=False
    )
    op.create_index(
        "ix_events_user_timestamp",
        "learning_events",
        ["user_id", "timestamp"],
        unique=False,
    )
    op.create_index(
        "ix_events_user_lesson",
        "learning_events",
        ["user_id", "lesson_id"],
        unique=False,
    )
    op.create_index(
        "ix_events_user_subject",
        "learning_events",
        ["user_id", "subject_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("learning_events")
    op.drop_table("assessment_responses")
    op.drop_table("assessment_attempts")
    op.drop_table("lesson_progress")
    op.drop_table("users")
