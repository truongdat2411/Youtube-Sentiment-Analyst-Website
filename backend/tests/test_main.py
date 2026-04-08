"""Tests for health endpoint and app initialization."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Test suite for /health endpoint."""

    def test_health_endpoint_returns_ok(self, client):
        """Test that /health endpoint returns 200 OK with status='ok'."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_health_endpoint_response_structure(self, client):
        """Test that /health response has correct structure."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "status" in data


class TestAppInitialization:
    """Test suite for app initialization and configuration."""

    def test_app_title(self, app):
        """Test that app has correct title."""
        assert app.title == "YouTube Sentiment API"

    def test_app_version(self, app):
        """Test that app has version."""
        assert app.version == "0.1.0"

    def test_cors_middleware_configured(self, app):
        """Test that CORS middleware is configured."""
        # Check that CORS middleware is configured by looking for CORSMiddleware
        from fastapi.middleware.cors import CORSMiddleware
        has_cors = any(
            m.cls == CORSMiddleware 
            for m in app.user_middleware
        )
        assert has_cors, "CORS middleware not found in app configuration"

    def test_routes_registered(self, app):
        """Test that all routers are registered."""
        route_paths = {route.path for route in app.routes}
        # Check key endpoints exist
        assert "/health" in route_paths
