from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.video import Video


class VideoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, youtube_video_id: str, url: str, title: str | None = None) -> Video:
        video = Video(youtube_video_id=youtube_video_id, url=url, title=title)
        self.session.add(video)
        await self.session.flush()
        return video

    async def get_by_youtube_video_id(self, youtube_video_id: str) -> Video | None:
        result = await self.session.execute(
            select(Video).where(Video.youtube_video_id == youtube_video_id)
        )
        return result.scalar_one_or_none()
