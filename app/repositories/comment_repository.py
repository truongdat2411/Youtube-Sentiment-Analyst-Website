from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.prediction import Prediction


class CommentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_many(self, comments: list[Comment]) -> list[Comment]:
        self.session.add_all(comments)
        await self.session.flush()
        return comments

    async def existing_youtube_comment_ids(self, youtube_comment_ids: list[str]) -> set[str]:
        if not youtube_comment_ids:
            return set()

        result = await self.session.execute(
            select(Comment.youtube_comment_id).where(Comment.youtube_comment_id.in_(youtube_comment_ids))
        )
        return {row[0] for row in result.fetchall()}

    async def list_with_predictions_by_video_id(self, video_id: int) -> list[tuple[Comment, Prediction]]:
        result = await self.session.execute(
            select(Comment, Prediction)
            .join(Prediction, Prediction.comment_id == Comment.id)
            .where(Comment.video_id == video_id)
            .order_by(Comment.created_at.desc())
        )
        return [(row[0], row[1]) for row in result.all()]
