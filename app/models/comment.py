from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.datetime_utils import utc_now_naive


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    youtube_comment_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    text_original: Mapped[str] = mapped_column(Text, nullable=False)
    text_cleaned: Mapped[str] = mapped_column(Text, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive, nullable=False)

    video = relationship("Video", back_populates="comments")
    prediction = relationship("Prediction", back_populates="comment", uselist=False, cascade="all, delete-orphan")
