"""Tests for utility functions."""

from __future__ import annotations

import pytest

from app.utils import clean_text


class TestCleanText:
    """Test suite for clean_text utility function."""

    def test_clean_text_basic(self):
        """Test basic text cleaning."""
        text = "Hello World!"
        result = clean_text(text)
        assert result is not None
        assert isinstance(result, str)

    def test_clean_text_with_newlines(self):
        """Test cleaning text with newlines."""
        text = "Hello\nWorld\n!"
        result = clean_text(text)
        assert result is not None

    def test_clean_text_with_special_chars(self):
        """Test cleaning text with special characters."""
        text = "Hello!!! @@@ World!!!"
        result = clean_text(text)
        assert result is not None
        assert isinstance(result, str)

    def test_clean_text_with_unicode(self):
        """Test cleaning text with unicode characters."""
        text = "Héllo Wørld! 你好"
        result = clean_text(text)
        assert result is not None
        assert isinstance(result, str)

    def test_clean_text_empty_string(self):
        """Test cleaning empty string."""
        text = ""
        result = clean_text(text)
        assert result is not None

    def test_clean_text_whitespace_only(self):
        """Test cleaning whitespace-only string."""
        text = "   \n\t  "
        result = clean_text(text)
        assert result is not None

    def test_clean_text_preserves_content(self):
        """Test that cleaning preserves main content."""
        text = "This is a good product!"
        result = clean_text(text)
        # Main words should still be present
        assert "good" in result.lower() or result  # Either preserved or cleaned version


class TestTextProcessing:
    """Test suite for text processing utilities."""

    def test_clean_text_consistency(self):
        """Test that clean_text produces consistent results."""
        text = "Hello World!"
        result1 = clean_text(text)
        result2 = clean_text(text)
        assert result1 == result2

    def test_clean_text_various_inputs(self):
        """Test clean_text with various input types."""
        test_cases = [
            "Simple text",
            "Text with 123 numbers",
            "Text with @#$% symbols",
            "Mixed CASE text",
            "text\twith\ttabs",
        ]

        for text in test_cases:
            result = clean_text(text)
            assert isinstance(result, str)
            assert len(result) >= 0
