"""Tests for Pydantic schemas."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas import AnalyzeRequest, AnalyzeResponse, AnalyzeItem, Probabilities


class TestAnalyzeRequest:
    """Test suite for AnalyzeRequest schema."""

    def test_valid_analyze_request(self):
        """Test creating valid AnalyzeRequest."""
        request = AnalyzeRequest(
            youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            max_comments=100
        )
        assert request.youtube_url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert request.max_comments == 100

    def test_analyze_request_default_max_comments(self):
        """Test AnalyzeRequest with default max_comments."""
        request = AnalyzeRequest(
            youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        )
        assert request.max_comments == 200

    def test_analyze_request_empty_url(self):
        """Test that empty URL raises validation error."""
        with pytest.raises(ValidationError):
            AnalyzeRequest(youtube_url="")

    def test_analyze_request_max_comments_too_low(self):
        """Test that max_comments < 1 raises validation error."""
        with pytest.raises(ValidationError):
            AnalyzeRequest(
                youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                max_comments=0
            )

    def test_analyze_request_max_comments_too_high(self):
        """Test that max_comments > 500 raises validation error."""
        with pytest.raises(ValidationError):
            AnalyzeRequest(
                youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                max_comments=501
            )

    def test_analyze_request_max_comments_boundary_low(self):
        """Test max_comments boundary value (1)."""
        request = AnalyzeRequest(
            youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            max_comments=1
        )
        assert request.max_comments == 1

    def test_analyze_request_max_comments_boundary_high(self):
        """Test max_comments boundary value (500)."""
        request = AnalyzeRequest(
            youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            max_comments=500
        )
        assert request.max_comments == 500


class TestProbabilities:
    """Test suite for Probabilities schema."""

    def test_valid_probabilities(self):
        """Test creating valid Probabilities."""
        probs = Probabilities(NEG=0.1, NEU=0.3, POS=0.6)
        assert probs.NEG == 0.1
        assert probs.NEU == 0.3
        assert probs.POS == 0.6

    def test_probabilities_serialization(self):
        """Test Probabilities JSON serialization."""
        probs = Probabilities(NEG=0.1, NEU=0.3, POS=0.6)
        data = probs.model_dump()
        assert data == {"NEG": 0.1, "NEU": 0.3, "POS": 0.6}

    def test_probabilities_sum_to_one(self):
        """Test that probabilities sum to 1."""
        probs = Probabilities(NEG=0.1, NEU=0.3, POS=0.6)
        total = probs.NEG + probs.NEU + probs.POS
        assert abs(total - 1.0) < 0.0001


class TestAnalyzeItem:
    """Test suite for AnalyzeItem schema."""

    def test_valid_analyze_item(self):
        """Test creating valid AnalyzeItem."""
        item = AnalyzeItem(
            comment_id="ABC123",
            author="John Doe",
            published_at="2025-01-01T10:00:00Z",
            text="Great video!",
            label="POS",
            probs=Probabilities(NEG=0.1, NEU=0.2, POS=0.7)
        )
        assert item.comment_id == "ABC123"
        assert item.author == "John Doe"
        assert item.label == "POS"

    def test_analyze_item_invalid_label(self):
        """Test that invalid label raises validation error."""
        with pytest.raises(ValidationError):
            AnalyzeItem(
                comment_id="ABC123",
                author="John Doe",
                published_at="2025-01-01T10:00:00Z",
                text="Great video!",
                label="INVALID",
                probs=Probabilities(NEG=0.1, NEU=0.2, POS=0.7)
            )

    def test_analyze_item_serialization(self):
        """Test AnalyzeItem JSON serialization."""
        item = AnalyzeItem(
            comment_id="ABC123",
            author="John Doe",
            published_at="2025-01-01T10:00:00Z",
            text="Great video!",
            label="POS",
            probs=Probabilities(NEG=0.1, NEU=0.2, POS=0.7)
        )
        data = item.model_dump()
        assert data["comment_id"] == "ABC123"
        assert data["label"] == "POS"
        assert isinstance(data["probs"], dict)


class TestAnalyzeResponse:
    """Test suite for AnalyzeResponse schema."""

    def test_valid_analyze_response(self):
        """Test creating valid AnalyzeResponse."""
        response = AnalyzeResponse(
            video_id="dQw4w9WgXcQ",
            video_title="Test Video",
            items=[
                AnalyzeItem(
                    comment_id="ABC123",
                    author="John",
                    published_at="2025-01-01T10:00:00Z",
                    text="Great!",
                    label="POS",
                    probs=Probabilities(NEG=0.1, NEU=0.2, POS=0.7)
                )
            ]
        )
        assert response.video_id == "dQw4w9WgXcQ"
        assert response.video_title == "Test Video"
        assert len(response.items) == 1

    def test_analyze_response_without_title(self):
        """Test AnalyzeResponse without video_title."""
        response = AnalyzeResponse(
            video_id="dQw4w9WgXcQ",
            items=[]
        )
        assert response.video_id == "dQw4w9WgXcQ"
        assert response.video_title is None
        assert response.items == []

    def test_analyze_response_multiple_items(self):
        """Test AnalyzeResponse with multiple items."""
        items = [
            AnalyzeItem(
                comment_id=f"ID{i}",
                author=f"User{i}",
                published_at="2025-01-01T10:00:00Z",
                text=f"Comment {i}",
                label="POS",
                probs=Probabilities(NEG=0.1, NEU=0.2, POS=0.7)
            )
            for i in range(3)
        ]
        response = AnalyzeResponse(
            video_id="dQw4w9WgXcQ",
            items=items
        )
        assert len(response.items) == 3
