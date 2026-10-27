"""Auth identity and refresh sessions migration

Revision ID: 002_auth_identity
Revises: 001_initial_schema
Create Date: 2026-10-27 20:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_auth_identity"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update users table with auth identity fields
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("email", sa.String(length=255), nullable=True)
        )
        batch_op.add_column(
            sa.Column("email_normalized", sa.String(length=255), nullable=True)
        )
        batch_op.add_column(
            sa.Column("password_hash", sa.String(length=255), nullable=True)
        )
        batch_op.add_column(
            sa.Column("display_name", sa.String(length=128), nullable=True)
        )
        batch_op.add_column(sa.Column("grade", sa.String(length=32), nullable=True))
        batch_op.add_column(
            sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.create_unique_constraint("uq_users_email", ["email"])
        batch_op.create_unique_constraint(
            "uq_users_email_normalized", ["email_normalized"]
        )
        batch_op.create_index(
            "ix_users_email_normalized", ["email_normalized"], unique=False
        )

    # 2. Create refresh_sessions table
    op.create_table(
        "refresh_sessions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=64),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_refresh_sessions_user_id", "refresh_sessions", ["user_id"], unique=False
    )
    op.create_index(
        "ix_refresh_sessions_token_hash",
        "refresh_sessions",
        ["token_hash"],
        unique=False,
    )


def downgrade() -> None:
    # 1. Drop refresh_sessions table
    op.drop_index("ix_refresh_sessions_token_hash", table_name="refresh_sessions")
    op.drop_index("ix_refresh_sessions_user_id", table_name="refresh_sessions")
    op.drop_table("refresh_sessions")

    # 2. Revert columns on users table
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index("ix_users_email_normalized")
        batch_op.drop_constraint("uq_users_email_normalized", type_="unique")
        batch_op.drop_constraint("uq_users_email", type_="unique")
        batch_op.drop_column("last_login_at")
        batch_op.drop_column("grade")
        batch_op.drop_column("display_name")
        batch_op.drop_column("password_hash")
        batch_op.drop_column("email_normalized")
        batch_op.drop_column("email")
