"""Tests for YouTube API functions."""

from __future__ import annotations

import pytest

from app.youtube import extract_video_id


class TestExtractVideoId:
    """Test suite for extract_video_id function."""

    def test_extract_video_id_standard_youtube_url(self):
        """Test extracting video ID from standard YouTube URL."""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_short_url(self):
        """Test extracting video ID from short YouTube URL (youtu.be)."""
        url = "https://youtu.be/dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_shorts_url(self):
        """Test extracting video ID from YouTube Shorts URL."""
        url = "https://www.youtube.com/shorts/dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_embed_url(self):
        """Test extracting video ID from YouTube embed URL."""
        url = "https://www.youtube.com/embed/dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_without_protocol(self):
        """Test extracting video ID when URL lacks protocol."""
        url = "youtube.com/watch?v=dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_with_www(self):
        """Test extracting video ID from URL with www prefix."""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_without_www(self):
        """Test extracting video ID from URL without www prefix."""
        url = "https://youtube.com/watch?v=dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_mobile_url(self):
        """Test extracting video ID from mobile YouTube URL."""
        url = "https://m.youtube.com/watch?v=dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_invalid_url(self):
        """Test that invalid URL returns None."""
        video_id = extract_video_id("https://google.com")
        assert video_id is None

    def test_extract_video_id_empty_string(self):
        """Test that empty string returns None."""
        video_id = extract_video_id("")
        assert video_id is None

    def test_extract_video_id_none_input(self):
        """Test that None input returns None."""
        video_id = extract_video_id(None)
        assert video_id is None

    def test_extract_video_id_whitespace_only(self):
        """Test that whitespace-only string returns None."""
        video_id = extract_video_id("   ")
        assert video_id is None

    def test_extract_video_id_with_query_params(self):
        """Test extracting video ID with additional query parameters."""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&list=PLxxx"
        video_id = extract_video_id(url)
        assert video_id == "dQw4w9WgXcQ"

    def test_extract_video_id_valid_format_check(self):
        """Test that extracted video ID has correct format."""
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        video_id = extract_video_id(url)
        # Video IDs should be 11 characters long, alphanumeric with dash and underscore
        assert len(video_id) == 11
        assert all(c.isalnum() or c in "-_" for c in video_id)
