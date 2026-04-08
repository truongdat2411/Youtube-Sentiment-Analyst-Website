"""Pytest configuration and shared fixtures for backend tests."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.model import PredictionResult


@pytest.fixture
def app():
    """Create a test FastAPI app instance."""
    return create_app()


@pytest.fixture
def client(app):
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_model_service():
    """Create a mock SentimentModel service."""
    mock_service = MagicMock()
    mock_service.load = MagicMock()
    
    # Mock predict method to return predictions
    def mock_predict(texts):
        return [
            PredictionResult(
                label="POS" if "good" in text.lower() else "NEG" if "bad" in text.lower() else "NEU",
                probs={"NEG": 0.1, "NEU": 0.3, "POS": 0.6}
            )
            for text in texts
        ]
    
    mock_service.predict = mock_predict
    return mock_service


@pytest.fixture
def sample_comments():
    """Provide sample YouTube comments for testing."""
    return [
        {
            "comment_id": "ABC123",
            "author": "John Doe",
            "published_at": "2025-01-01T10:00:00Z",
            "text": "This is a great video! I really enjoyed it.",
        },
        {
            "comment_id": "DEF456",
            "author": "Jane Smith",
            "published_at": "2025-01-02T11:00:00Z",
            "text": "Badly produced content.",
        },
        {
            "comment_id": "GHI789",
            "author": "Bob Wilson",
            "published_at": "2025-01-03T12:00:00Z",
            "text": "It's okay, nothing special.",
        },
    ]


@pytest.fixture
def sample_predictions():
    """Provide sample prediction results."""
    return [
        PredictionResult(
            label="POS",
            probs={"NEG": 0.1, "NEU": 0.2, "POS": 0.7}
        ),
        PredictionResult(
            label="NEG",
            probs={"NEG": 0.8, "NEU": 0.1, "POS": 0.1}
        ),
        PredictionResult(
            label="NEU",
            probs={"NEG": 0.3, "NEU": 0.5, "POS": 0.2}
        ),
    ]


@pytest.fixture
def mock_youtube_comments():
    """Mock YouTube API comments response."""
    from app.youtube import YouTubeComment
    
    return [
        YouTubeComment(
            comment_id="ABC123",
            author="User 1",
            published_at="2025-01-01T10:00:00Z",
            text="Love this content!",
        ),
        YouTubeComment(
            comment_id="DEF456",
            author="User 2",
            published_at="2025-01-02T11:00:00Z",
            text="Not interested",
        ),
        YouTubeComment(
            comment_id="GHI789",
            author="User 3",
            published_at="2025-01-03T12:00:00Z",
            text="Can't wait for the next video",
        ),
    ]
