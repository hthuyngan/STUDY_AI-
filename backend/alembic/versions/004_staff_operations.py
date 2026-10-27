"""Staff operations migration

Revision ID: 004_staff_operations
Revises: 003_user_roles
Create Date: 2026-10-27 22:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004_staff_operations"
down_revision: Union[str, None] = "003_user_roles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add status column to users table (default: 'active')
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "status",
                sa.String(length=32),
                nullable=False,
                server_default="active",
            )
        )

    # 2. Staff Audit Logs
    op.create_table(
        "staff_audit_logs",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("actor_user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target_type", sa.String(length=64), nullable=False),
        sa.Column("target_id", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_staff_audit_logs_actor", "staff_audit_logs", ["actor_user_id"])
    op.create_index("ix_staff_audit_logs_action", "staff_audit_logs", ["action"])
    op.create_index("ix_staff_audit_logs_target", "staff_audit_logs", ["target_id"])

    # 3. Teacher Domain: Classes, Memberships, Assignments, Items
    op.create_table(
        "teacher_classes",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("code", sa.String(length=32), unique=True, nullable=False),
        sa.Column("grade", sa.String(length=32), nullable=False),
        sa.Column("subject", sa.String(length=64), nullable=False),
        sa.Column("teacher_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("academic_year", sa.String(length=32), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_teacher_classes_teacher_id", "teacher_classes", ["teacher_id"])

    op.create_table(
        "class_memberships",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("class_id", sa.String(length=64), sa.ForeignKey("teacher_classes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="active", nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_class_memberships_class_id", "class_memberships", ["class_id"])
    op.create_index("ix_class_memberships_student_id", "class_memberships", ["student_id"])

    op.create_table(
        "assignments",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("class_id", sa.String(length=64), sa.ForeignKey("teacher_classes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("teacher_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="published", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_assignments_class_id", "assignments", ["class_id"])
    op.create_index("ix_assignments_teacher_id", "assignments", ["teacher_id"])

    op.create_table(
        "assignment_items",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("assignment_id", sa.String(length=64), sa.ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lesson_id", sa.String(length=64), nullable=True),
        sa.Column("question_id", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("max_score", sa.Integer(), server_default="10", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_assignment_items_assignment_id", "assignment_items", ["assignment_id"])

    # 4. Content Domain: Subjects, Chapters, Lessons, Assessments, Questions
    op.create_table(
        "content_subjects",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("code", sa.String(length=32), unique=True, nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("grade", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "content_chapters",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("subject_id", sa.String(length=64), sa.ForeignKey("content_subjects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("order_index", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_content_chapters_subject_id", "content_chapters", ["subject_id"])

    op.create_table(
        "content_lessons",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("chapter_id", sa.String(length=64), sa.ForeignKey("content_chapters.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("order_index", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=32), server_default="draft", nullable=False),
        sa.Column("author_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reviewed_by", sa.String(length=64), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("introduction", sa.Text(), nullable=True),
        sa.Column("definitions", sa.Text(), nullable=True),
        sa.Column("formulas", sa.Text(), nullable=True),
        sa.Column("examples", sa.Text(), nullable=True),
        sa.Column("important_notes", sa.Text(), nullable=True),
        sa.Column("summary_points", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_content_lessons_chapter_id", "content_lessons", ["chapter_id"])
    op.create_index("ix_content_lessons_slug", "content_lessons", ["slug"])
    op.create_index("ix_content_lessons_status", "content_lessons", ["status"])

    op.create_table(
        "content_assessments",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("lesson_id", sa.String(length=64), sa.ForeignKey("content_lessons.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("pass_score", sa.Integer(), server_default="80", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_content_assessments_lesson_id", "content_assessments", ["lesson_id"])

    op.create_table(
        "content_questions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("assessment_id", sa.String(length=64), sa.ForeignKey("content_assessments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("options", sa.Text(), nullable=False),
        sa.Column("correct_answer", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("order_index", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_index("ix_content_questions_assessment_id", "content_questions", ["assessment_id"])

    # 5. Support Domain: Tickets, Messages
    op.create_table(
        "support_tickets",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_to", sa.String(length=64), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="open", nullable=False),
        sa.Column("priority", sa.String(length=32), server_default="normal", nullable=False),
        sa.Column("category", sa.String(length=64), server_default="general", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_support_tickets_user_id", "support_tickets", ["user_id"])
    op.create_index("ix_support_tickets_status", "support_tickets", ["status"])

    op.create_table(
        "support_ticket_messages",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("ticket_id", sa.String(length=64), sa.ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", sa.String(length=64), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_internal", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_support_ticket_messages_ticket_id", "support_ticket_messages", ["ticket_id"])


def downgrade() -> None:
    op.drop_table("support_ticket_messages")
    op.drop_table("support_tickets")
    op.drop_table("content_questions")
    op.drop_table("content_assessments")
    op.drop_table("content_lessons")
    op.drop_table("content_chapters")
    op.drop_table("content_subjects")
    op.drop_table("assignment_items")
    op.drop_table("assignments")
    op.drop_table("class_memberships")
    op.drop_table("teacher_classes")
    op.drop_table("staff_audit_logs")
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("status")
