from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.datetime_utils import utc_now_naive


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    youtube_video_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive, nullable=False)

    comments = relationship("Comment", back_populates="video", cascade="all, delete-orphan")
    analysis_histories = relationship("AnalysisHistory", back_populates="video")
