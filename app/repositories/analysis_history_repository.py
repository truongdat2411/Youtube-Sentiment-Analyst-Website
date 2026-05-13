from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis_history import AnalysisHistory
from app.models.video import Video


class AnalysisHistoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        user_id: int,
        video_id: int,
        positive_count: int,
        neutral_count: int,
        negative_count: int,
        total_predictions: int,
    ) -> AnalysisHistory:
        row = AnalysisHistory(
            user_id=user_id,
            video_id=video_id,
            positive_count=positive_count,
            neutral_count=neutral_count,
            negative_count=negative_count,
            total_predictions=total_predictions,
        )
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def count_for_user(self, user_id: int) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(AnalysisHistory).where(AnalysisHistory.user_id == user_id)
        )
        return int(result.scalar_one())

    async def list_for_user(
        self,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> list[tuple[AnalysisHistory, Video]]:
        result = await self.session.execute(
            select(AnalysisHistory, Video)
            .join(Video, Video.id == AnalysisHistory.video_id)
            .where(AnalysisHistory.user_id == user_id)
            .order_by(AnalysisHistory.analyzed_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return [(row[0], row[1]) for row in result.all()]
