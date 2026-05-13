import logging
from functools import lru_cache

import torch

from app.core.config import get_settings
from app.schemas.prediction import BatchPredictionResponse, SentimentPrediction
from app.services.preprocessing_service import preprocess_comments_batch

from app.ml.inference.model_loader import get_model_loader

logger = logging.getLogger("app.ml.inference")

LABEL_MAPPING = {
    0: "negative",
    1: "neutral",
    2: "positive",
}


class SentimentInferenceService:
    def __init__(self) -> None:
        self.settings = get_settings()
        loader = get_model_loader()
        self.tokenizer = loader.load_tokenizer()
        self.model = loader.load_model()
        self.model.eval()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.id2label = getattr(self.model.config, "id2label", {}) or {}
        logger.info("Sentiment model loaded on device=%s", self.device)

    def _predict_batch_logits(self, texts: list[str]) -> torch.Tensor:
        encoded = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=self.settings.model_max_length,
            return_tensors="pt",
        )
        encoded = {key: value.to(self.device) for key, value in encoded.items()}
        with torch.no_grad():
            outputs = self.model(**encoded)
            logits = outputs.logits
        return logits

    def predict_batch(self, texts: list[str], enable_tokenization: bool = False) -> BatchPredictionResponse:
        if not texts:
            return BatchPredictionResponse(
                model_name=self.settings.model_name,
                model_version=self.settings.model_version,
                total_items=0,
                predictions=[],
            )

        cleaned_texts = preprocess_comments_batch(texts, enable_tokenization=enable_tokenization)
        predictions: list[SentimentPrediction] = []

        batch_size = max(1, self.settings.inference_batch_size)
        for start in range(0, len(cleaned_texts), batch_size):
            batch_clean = cleaned_texts[start : start + batch_size]
            batch_raw = texts[start : start + batch_size]

            logits = self._predict_batch_logits(batch_clean)
            probabilities = torch.softmax(logits, dim=-1)
            confidences, label_ids = torch.max(probabilities, dim=-1)

            for raw_text, label_id, confidence in zip(batch_raw, label_ids, confidences, strict=True):
                label_index = int(label_id.item())
                label = LABEL_MAPPING.get(label_index)
                if label is None:
                    config_label = str(self.id2label.get(label_index, "neutral")).lower()
                    if "pos" in config_label:
                        label = "positive"
                    elif "neg" in config_label:
                        label = "negative"
                    else:
                        label = "neutral"
                predictions.append(
                    SentimentPrediction(
                        text=raw_text,
                        label=label,
                        confidence=round(float(confidence.item()), 6),
                    )
                )

        return BatchPredictionResponse(
            model_name=self.settings.model_name,
            model_version=self.settings.model_version,
            total_items=len(predictions),
            predictions=predictions,
        )


@lru_cache
def get_sentiment_inference_service() -> SentimentInferenceService:
    return SentimentInferenceService()
