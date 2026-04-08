from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from app.schemas import Probabilities


class CommentResponse(BaseModel):
    id: int
    comment_id: str
    author: str
    text: str
    published_at: datetime
    label: Literal["NEG", "NEU", "POS"]
    probs: Probabilities
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HistorySummaryResponse(BaseModel):
    id: int
    youtube_url: str
    video_id: str
    video_title: str | None
    thumbnail_url: str | None
    total_comments: int
    neg_count: int
    neu_count: int
    pos_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HistoryDetailResponse(HistorySummaryResponse):
    result_json: dict[str, Any]


class HistoryListResponse(BaseModel):
    items: list[HistorySummaryResponse]
    limit: int
    offset: int


class CommentsListResponse(BaseModel):
    items: list[CommentResponse]
    total: int

