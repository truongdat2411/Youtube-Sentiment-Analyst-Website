import logging
from functools import lru_cache

from transformers import AutoModelForSequenceClassification, AutoTokenizer

from app.core.config import get_settings

logger = logging.getLogger("app.ml.model_loader")


class PhoBertModelLoader:
    def __init__(self) -> None:
        self.settings = get_settings()

    def load_tokenizer(self):
        logger.info("Loading tokenizer from model=%s", self.settings.model_name)
        return AutoTokenizer.from_pretrained(
            self.settings.model_name,
            cache_dir=self.settings.model_cache_dir,
            use_fast=False,
        )

    def load_model(self):
        logger.info("Loading model from model=%s", self.settings.model_name)
        return AutoModelForSequenceClassification.from_pretrained(
            self.settings.model_name,
            cache_dir=self.settings.model_cache_dir,
        )


@lru_cache
def get_model_loader() -> PhoBertModelLoader:
    return PhoBertModelLoader()
