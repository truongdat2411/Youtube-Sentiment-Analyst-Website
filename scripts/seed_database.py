import asyncio
import sys
from pathlib import Path

# Cho phep chay: python scripts/seed_database.py (project root khong nam trong sys.path mac dinh)
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.comment import Comment
from app.models.prediction import Prediction
from app.models.video import Video


async def seed_database() -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(Video).where(Video.youtube_video_id == "demo_video_001"))
        video = existing.scalar_one_or_none()
        if video is None:
            video = Video(
                youtube_video_id="demo_video_001",
                url="https://www.youtube.com/watch?v=demo_video_001",
                title="Demo seeded video",
            )
            session.add(video)
            await session.flush()

        comments = [
            Comment(
                video_id=video.id,
                youtube_comment_id="demo_comment_001",
                author="demo-user-a",
                text_original="Video nay rat hay",
                text_cleaned="video nay rat hay",
            ),
            Comment(
                video_id=video.id,
                youtube_comment_id="demo_comment_002",
                author="demo-user-b",
                text_original="Noi dung binh thuong",
                text_cleaned="noi dung binh thuong",
            ),
            Comment(
                video_id=video.id,
                youtube_comment_id="demo_comment_003",
                author="demo-user-c",
                text_original="Chat luong te qua",
                text_cleaned="chat luong te qua",
            ),
        ]

        for comment in comments:
            exists = await session.execute(
                select(Comment).where(Comment.youtube_comment_id == comment.youtube_comment_id)
            )
            if exists.scalar_one_or_none() is None:
                session.add(comment)

        await session.flush()

        seeded_comments = await session.execute(select(Comment).where(Comment.video_id == video.id))
        for comment in seeded_comments.scalars().all():
            exists = await session.execute(select(Prediction).where(Prediction.comment_id == comment.id))
            if exists.scalar_one_or_none() is None:
                if "hay" in comment.text_cleaned:
                    sentiment = "positive"
                    confidence = 0.91
                elif "te" in comment.text_cleaned:
                    sentiment = "negative"
                    confidence = 0.9
                else:
                    sentiment = "neutral"
                    confidence = 0.85

                session.add(
                    Prediction(
                        comment_id=comment.id,
                        sentiment=sentiment,
                        confidence=confidence,
                        model_name="seed-rule-model",
                        model_version="seed-v1",
                    )
                )

        await session.commit()
        print("Seeded demo data successfully.")


if __name__ == "__main__":
    asyncio.run(seed_database())
