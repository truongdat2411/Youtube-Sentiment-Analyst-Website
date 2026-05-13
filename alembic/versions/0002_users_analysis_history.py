"""add users and analysis_history

Revision ID: 0002_users_analysis_history
Revises: 0001_init_schema
Create Date: 2026-05-12
"""

import sqlalchemy as sa
from alembic import op

revision = "0002_users_analysis_history"
down_revision = "0001_init_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "analysis_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("video_id", sa.Integer(), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("positive_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("neutral_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("negative_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_predictions", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("analyzed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_analysis_history_id", "analysis_history", ["id"])
    op.create_index("ix_analysis_history_user_id", "analysis_history", ["user_id"])
    op.create_index("ix_analysis_history_video_id", "analysis_history", ["video_id"])
    op.create_index("ix_analysis_history_analyzed_at", "analysis_history", ["analyzed_at"])


def downgrade() -> None:
    op.drop_index("ix_analysis_history_analyzed_at", table_name="analysis_history")
    op.drop_index("ix_analysis_history_video_id", table_name="analysis_history")
    op.drop_index("ix_analysis_history_user_id", table_name="analysis_history")
    op.drop_index("ix_analysis_history_id", table_name="analysis_history")
    op.drop_table("analysis_history")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
