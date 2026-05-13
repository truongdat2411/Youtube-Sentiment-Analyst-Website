from datetime import datetime

from pydantic import BaseModel, Field


class NormalizedYouTubeComment(BaseModel):
    youtube_comment_id: str = Field(..., description="YouTube top-level comment ID")
    video_id: str = Field(..., description="YouTube video ID")
    author_display_name: str | None = Field(default=None)
    text_original: str = Field(..., description="Original comment text")
    like_count: int = Field(default=0)
    published_at: datetime | None = Field(default=None)
    updated_at: datetime | None = Field(default=None)


class YouTubeIngestionResponse(BaseModel):
    video_id: str
    total_comments: int
    comments: list[NormalizedYouTubeComment]


class YouTubeVideoMetadata(BaseModel):
    """Thong tin video tu YouTube Data API (videos.list)."""

    title: str
    thumbnail_url: str
    view_count: int = 0
    like_count: int = 0
    comment_count_total: int | None = Field(
        default=None,
        description="So comment cong khai tu statistics; co the None neu API an",
    )
