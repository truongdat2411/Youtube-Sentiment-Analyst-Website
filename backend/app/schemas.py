from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    youtube_url: str = Field(..., min_length=1, description="YouTube video URL")
    max_comments: int = Field(default=200, ge=1, le=500)


class Probabilities(BaseModel):
    NEG: float
    NEU: float
    POS: float


class AnalyzeItem(BaseModel):
    comment_id: str
    author: str
    published_at: str
    text: str
    label: Literal["NEG", "NEU", "POS"]
    probs: Probabilities


class AnalyzeResponse(BaseModel):
    video_id: str
    video_title: str | None = None
    items: list[AnalyzeItem]

