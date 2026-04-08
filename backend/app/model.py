from __future__ import annotations

from dataclasses import dataclass

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from app.utils import chunked

LABELS = ["NEG", "NEU", "POS"]


@dataclass
class PredictionResult:
    label: str
    probs: dict[str, float]


class SentimentModel:
    def __init__(self, model_dir: str, max_length: int = 256, batch_size: int = 64) -> None:
        self.model_dir = model_dir
        self.max_length = max_length
        self.batch_size = batch_size
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = None
        self.model = None

    def load(self) -> None:
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_dir, local_files_only=True)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            self.model_dir, local_files_only=True
        )
        self.model.to(self.device)
        self.model.eval()

    def predict(self, texts: list[str]) -> list[PredictionResult]:
        if self.model is None or self.tokenizer is None:
            raise RuntimeError("Model is not loaded.")

        if not texts:
            return []

        results: list[PredictionResult] = []
        for batch in chunked(texts, self.batch_size):
            encoded = self.tokenizer(
                batch,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=self.max_length,
            )
            encoded = {key: value.to(self.device) for key, value in encoded.items()}

            with torch.no_grad():
                logits = self.model(**encoded).logits
                probs_tensor = torch.softmax(logits, dim=-1).cpu()

            for row in probs_tensor:
                probs_list: list[float] = row.tolist()
                probs = {label: float(probs_list[index]) for index, label in enumerate(LABELS)}
                best_idx = max(range(len(probs_list)), key=probs_list.__getitem__)
                results.append(PredictionResult(label=LABELS[best_idx], probs=probs))

        return results
