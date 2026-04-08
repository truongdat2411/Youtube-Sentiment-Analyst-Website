"""create comments table

Revision ID: 20260314_03
Revises: 20260314_02
Create Date: 2026-03-14 01:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260314_03"
down_revision = "20260314_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("analysis_history_id", sa.Integer(), nullable=False),
        sa.Column("comment_id", sa.String(length=128), nullable=False),
        sa.Column("author", sa.String(length=500), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("label", sa.String(length=10), nullable=False),
        sa.Column("probs", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["analysis_history_id"],
            ["analysis_history.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_comments_id"), "comments", ["id"], unique=False)
    op.create_index(
        op.f("ix_comments_analysis_history_id"),
        "comments",
        ["analysis_history_id"],
        unique=False,
    )
    op.create_index(
        "ix_comments_label",
        "comments",
        ["label"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_comments_label", table_name="comments")
    op.drop_index(op.f("ix_comments_analysis_history_id"), table_name="comments")
    op.drop_index(op.f("ix_comments_id"), table_name="comments")
    op.drop_table("comments")
