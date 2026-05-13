"""create videos comments predictions

Revision ID: 0001_init_schema
Revises:
Create Date: 2026-05-11 15:49:00
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_init_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "videos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("youtube_video_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_videos_id", "videos", ["id"])
    op.create_index("ix_videos_youtube_video_id", "videos", ["youtube_video_id"])

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("video_id", sa.Integer(), sa.ForeignKey("videos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("youtube_comment_id", sa.String(length=128), nullable=False, unique=True),
        sa.Column("author", sa.String(length=255), nullable=True),
        sa.Column("text_original", sa.Text(), nullable=False),
        sa.Column("text_cleaned", sa.Text(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_comments_id", "comments", ["id"])
    op.create_index("ix_comments_video_id", "comments", ["video_id"])
    op.create_index("ix_comments_youtube_comment_id", "comments", ["youtube_comment_id"])

    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("comment_id", sa.Integer(), sa.ForeignKey("comments.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("sentiment", sa.String(length=16), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("model_name", sa.String(length=255), nullable=False),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column("predicted_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_predictions_id", "predictions", ["id"])
    op.create_index("ix_predictions_sentiment", "predictions", ["sentiment"])


def downgrade() -> None:
    op.drop_index("ix_predictions_sentiment", table_name="predictions")
    op.drop_index("ix_predictions_id", table_name="predictions")
    op.drop_table("predictions")

    op.drop_index("ix_comments_youtube_comment_id", table_name="comments")
    op.drop_index("ix_comments_video_id", table_name="comments")
    op.drop_index("ix_comments_id", table_name="comments")
    op.drop_table("comments")

    op.drop_index("ix_videos_youtube_video_id", table_name="videos")
    op.drop_index("ix_videos_id", table_name="videos")
    op.drop_table("videos")
