from datetime import datetime

from pydantic import BaseModel, Field


class AnalysisHistoryEntry(BaseModel):
    id: int = Field(..., ge=1)
    analyzed_at: datetime
    youtube_video_id: str
    video_url: str
    video_title: str | None
    positive_count: int
    neutral_count: int
    negative_count: int
    total_predictions: int


class AnalysisHistoryListResponse(BaseModel):
    items: list[AnalysisHistoryEntry]
    total: int
