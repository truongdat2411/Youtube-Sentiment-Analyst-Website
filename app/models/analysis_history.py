from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.utils.datetime_utils import utc_now_naive


class AnalysisHistory(Base):
    """Một lần người dùng chạy phân tích (snapshot breakdown tại thời điểm đó)."""

    __tablename__ = "analysis_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    positive_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    neutral_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    negative_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_predictions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    analyzed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now_naive, nullable=False, index=True)

    user = relationship("User", back_populates="analysis_histories")
    video = relationship("Video", back_populates="analysis_histories")
