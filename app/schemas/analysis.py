from datetime import datetime

from pydantic import BaseModel, HttpUrl

from app.schemas.youtube import YouTubeVideoMetadata


class AnalyzeCommentsRequest(BaseModel):
    youtube_url: HttpUrl


class SentimentBreakdown(BaseModel):
    positive: int = 0
    neutral: int = 0
    negative: int = 0


class AnalyzeCommentResult(BaseModel):
    youtube_comment_id: str
    author: str | None = None
    text_original: str
    sentiment: str
    confidence: float
    predicted_at: datetime
    published_at: datetime | None = None


class AnalyzeCommentsResponse(BaseModel):
    video_id: str
    video_url: str
    video: YouTubeVideoMetadata
    sentiment_breakdown: SentimentBreakdown
    total_comments: int
    total_predictions: int
    predictions: list[AnalyzeCommentResult]
