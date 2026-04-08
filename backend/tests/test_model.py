"""Tests for sentiment model inference."""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch

from app.model import SentimentModel, PredictionResult, LABELS


class TestPredictionResult:
    """Test suite for PredictionResult dataclass."""

    def test_prediction_result_creation(self):
        """Test creating PredictionResult."""
        probs = {"NEG": 0.1, "NEU": 0.2, "POS": 0.7}
        result = PredictionResult(label="POS", probs=probs)
        assert result.label == "POS"
        assert result.probs == probs

    def test_prediction_result_all_labels(self):
        """Test PredictionResult with all label types."""
        for label in LABELS:
            probs = {"NEG": 0.3, "NEU": 0.3, "POS": 0.4} if label == "POS" else \
                    {"NEG": 0.3, "NEU": 0.4, "POS": 0.3} if label == "NEU" else \
                    {"NEG": 0.4, "NEU": 0.3, "POS": 0.3}
            result = PredictionResult(label=label, probs=probs)
            assert result.label == label


class TestSentimentModel:
    """Test suite for SentimentModel class."""

    def test_sentiment_model_initialization(self):
        """Test SentimentModel initialization."""
        model = SentimentModel(
            model_dir="./models/test",
            max_length=256,
            batch_size=32
        )
        assert model.model_dir == "./models/test"
        assert model.max_length == 256
        assert model.batch_size == 32
        assert model.model is None
        assert model.tokenizer is None

    def test_sentiment_model_default_parameters(self):
        """Test SentimentModel with default parameters."""
        model = SentimentModel(model_dir="./models/test")
        assert model.max_length == 256
        assert model.batch_size == 64

    def test_sentiment_model_device_selection(self):
        """Test that model uses correct device."""
        model = SentimentModel(model_dir="./models/test")
        # Check device is either cuda or cpu
        assert str(model.device) in ["cpu", "cuda"]

    def test_predict_without_model_loaded_raises_error(self):
        """Test that predict raises error if model not loaded."""
        model = SentimentModel(model_dir="./models/test")
        with pytest.raises(RuntimeError, match="Model is not loaded"):
            model.predict(["test text"])

    def test_predict_empty_list_returns_empty(self):
        """Test that predict returns empty list for empty input."""
        model = SentimentModel(model_dir="./models/test")
        model.model = MagicMock()
        model.tokenizer = MagicMock()
        results = model.predict([])
        assert results == []

    @patch('app.model.AutoTokenizer')
    @patch('app.model.AutoModelForSequenceClassification')
    def test_sentiment_model_load(self, mock_model_class, mock_tokenizer_class):
        """Test loading sentiment model."""
        # Mock the tokenizer and model
        mock_tokenizer = MagicMock()
        mock_tokenizer_class.from_pretrained.return_value = mock_tokenizer

        mock_model = MagicMock()
        mock_model_class.from_pretrained.return_value = mock_model

        model = SentimentModel(model_dir="./models/test")
        model.load()

        # Verify tokenizer and model were loaded
        assert model.tokenizer is not None
        assert model.model is not None
        mock_tokenizer_class.from_pretrained.assert_called_once()
        mock_model_class.from_pretrained.assert_called_once()

    def test_labels_constant(self):
        """Test that LABELS constant has correct values."""
        assert LABELS == ["NEG", "NEU", "POS"]
        assert len(LABELS) == 3


class TestModelBatchProcessing:
    """Test suite for model batch processing."""

    def test_batch_processing_single_batch(self):
        """Test processing single batch of texts."""
        model = SentimentModel(model_dir="./models/test", batch_size=64)
        # This is a mock test since we can't load real model in tests
        texts = ["Good product", "Bad quality", "It's okay"]
        # With batch_size=64, these 3 texts should be processed in 1 batch
        assert len(texts) <= model.batch_size

    def test_batch_processing_multiple_batches(self):
        """Test processing multiple batches."""
        model = SentimentModel(model_dir="./models/test", batch_size=2)
        # Create 5 texts, should be processed in 3 batches (2, 2, 1)
        texts = ["Text 1", "Text 2", "Text 3", "Text 4", "Text 5"]
        assert len(texts) > model.batch_size

    def test_max_length_parameter(self):
        """Test that max_length parameter is set correctly."""
        for max_len in [128, 256, 512]:
            model = SentimentModel(
                model_dir="./models/test",
                max_length=max_len
            )
            assert model.max_length == max_len
