"""User roles migration

Revision ID: 003_user_roles
Revises: 002_auth_identity
Create Date: 2026-10-27 21:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_user_roles"
down_revision: Union[str, None] = "002_auth_identity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add role column to users with server_default 'learner'
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "role",
                sa.String(length=32),
                nullable=False,
                server_default="learner",
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("role")
