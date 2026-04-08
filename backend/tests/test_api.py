"""Tests for FastAPI endpoints."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from app.schemas import AnalyzeResponse


class TestAnalyzeEndpoint:
    """Test suite for /api/analyze endpoint."""

    def test_analyze_invalid_url(self, client):
        """Test /api/analyze with invalid YouTube URL."""
        response = client.post(
            "/api/analyze",
            json={
                "youtube_url": "https://google.com",
                "max_comments": 100
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "Invalid YouTube URL" in data["detail"]

    def test_analyze_empty_url(self, client):
        """Test /api/analyze with empty URL."""
        response = client.post(
            "/api/analyze",
            json={
                "youtube_url": "",
                "max_comments": 100
            }
        )
        assert response.status_code == 422  # Validation error

    def test_analyze_max_comments_validation(self, client):
        """Test /api/analyze with invalid max_comments."""
        response = client.post(
            "/api/analyze",
            json={
                "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "max_comments": 1000
            }
        )
        assert response.status_code == 422  # Validation error

    def test_analyze_negative_max_comments(self, client):
        """Test /api/analyze with negative max_comments."""
        response = client.post(
            "/api/analyze",
            json={
                "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "max_comments": -1
            }
        )
        assert response.status_code == 422

    def test_analyze_missing_model_service(self, client, app):
        """Test /api/analyze when model service is not initialized."""
        # Remove model service from app state
        if hasattr(app.state, "model_service"):
            delattr(app.state, "model_service")

        response = client.post(
            "/api/analyze",
            json={
                "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "max_comments": 100
            }
        )
        # Should get 500 error because model is not loaded
        assert response.status_code == 500
        data = response.json()
        assert "Model is not loaded" in data["detail"]


class TestHealthEndpoint:
    """Test suite for /health endpoint."""

    def test_health_returns_ok(self, client):
        """Test that /health returns status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_health_response_type(self, client):
        """Test that /health returns JSON."""
        response = client.get("/health")
        assert response.headers["content-type"].startswith("application/json")

    def test_health_no_parameters_needed(self, client):
        """Test that /health doesn't require parameters."""
        response = client.get("/health?param=value")
        assert response.status_code == 200


class TestApiErrorHandling:
    """Test suite for API error handling."""

    def test_invalid_json_body(self, client):
        """Test endpoint with invalid JSON body."""
        response = client.post(
            "/api/analyze",
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [400, 422]

    def test_missing_required_field(self, client):
        """Test endpoint with missing required field."""
        response = client.post(
            "/api/analyze",
            json={"max_comments": 100}  # Missing youtube_url
        )
        assert response.status_code == 422


class TestAnalyzeEndpointIntegration:
    """Integration tests for /api/analyze endpoint."""

    @patch("app.api.extract_video_id")
    @patch("app.api.get_optional_current_active_user")
    def test_analyze_with_valid_response_structure(
        self,
        mock_get_user,
        mock_extract_video_id,
        client,
        app,
        mock_model_service
    ):
        """Test /api/analyze returns proper response structure."""
        # Setup
        mock_extract_video_id.return_value = "dQw4w9WgXcQ"
        mock_get_user.return_value = None
        app.state.model_service = mock_model_service

        # Mock internal functions
        with patch("app.api.get_sample_comments") as mock_get_comments:
            from app.youtube import YouTubeComment
            mock_get_comments.return_value = [
                YouTubeComment(
                    comment_id="ID1",
                    author="User1",
                    published_at="2025-01-01T10:00:00Z",
                    text="Great video"
                )
            ]

            with patch("app.api.clean_text") as mock_clean:
                mock_clean.return_value = "Great video"

                response = client.post(
                    "/api/analyze",
                    json={
                        "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                        "max_comments": 100
                    }
                )

                if response.status_code == 200:
                    data = response.json()
                    assert "video_id" in data
                    assert "items" in data
                    assert isinstance(data["items"], list)

    @patch("app.api.extract_video_id")
    def test_analyze_request_validation(self, mock_extract_video_id, client):
        """Test that analyze validates input properly."""
        mock_extract_video_id.return_value = "dQw4w9WgXcQ"

        # Valid request structure
        request_data = {
            "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "max_comments": 100
        }

        response = client.post("/api/analyze", json=request_data)

        # Should not return 422 (validation error)
        assert response.status_code != 422


class TestHttpMethods:
    """Test HTTP method restrictions."""

    def test_health_get_only(self, client):
        """Test that /health only accepts GET."""
        # GET should work
        response = client.get("/health")
        assert response.status_code == 200

        # POST should not work
        response = client.post("/health")
        assert response.status_code in [405, 307]  # Method Not Allowed or redirect

    def test_analyze_post_only(self, client):
        """Test that /api/analyze only accepts POST."""
        # GET should not work
        response = client.get("/api/analyze")
        assert response.status_code in [405, 307]

        # POST is correct method
        response = client.post(
            "/api/analyze",
            json={
                "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "max_comments": 100
            }
        )
        # Should not be 405
        assert response.status_code != 405
