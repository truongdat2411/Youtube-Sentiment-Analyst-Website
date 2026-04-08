"""create analysis_history table

Revision ID: 20260314_02
Revises: 20260314_01
Create Date: 2026-03-14 00:30:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260314_02"
down_revision = "20260314_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "analysis_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("youtube_url", sa.Text(), nullable=False),
        sa.Column("video_id", sa.String(length=32), nullable=False),
        sa.Column("video_title", sa.String(length=500), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("total_comments", sa.Integer(), nullable=False),
        sa.Column("neg_count", sa.Integer(), nullable=False),
        sa.Column("neu_count", sa.Integer(), nullable=False),
        sa.Column("pos_count", sa.Integer(), nullable=False),
        sa.Column("result_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_analysis_history_id"), "analysis_history", ["id"], unique=False)
    op.create_index(op.f("ix_analysis_history_user_id"), "analysis_history", ["user_id"], unique=False)
    op.create_index("ix_analysis_history_user_created_at", "analysis_history", ["user_id", "created_at"], unique=False)
    op.create_index("ix_analysis_history_video_title", "analysis_history", ["video_title"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_analysis_history_video_title", table_name="analysis_history")
    op.drop_index("ix_analysis_history_user_created_at", table_name="analysis_history")
    op.drop_index(op.f("ix_analysis_history_user_id"), table_name="analysis_history")
    op.drop_index(op.f("ix_analysis_history_id"), table_name="analysis_history")
    op.drop_table("analysis_history")
