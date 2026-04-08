from __future__ import annotations

import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.admin_api import router as admin_router
from app.api import router
from app.auth_api import router as auth_router
from app.model import SentimentModel

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger(__name__)


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    try:
        return int(value)
    except ValueError:
        return default


def create_app() -> FastAPI:
    app = FastAPI(title="YouTube Sentiment API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    app.include_router(auth_router)
    app.include_router(admin_router)

    @app.on_event("startup")
    async def startup_event() -> None:
        started = time.perf_counter()
        model_dir = os.getenv("MODEL_DIR", "./models/best_model/model")
        max_len = _env_int("MAX_LEN", 256)
        batch_size = _env_int("BATCH_SIZE", 64)

        model_path = Path(model_dir)
        if not model_path.is_absolute():
            model_path = (BASE_DIR / model_path).resolve()

        logger.info(
            "startup model load begin model_dir=%s max_len=%s batch_size=%s",
            model_path,
            max_len,
            batch_size,
        )
        sentiment_model = SentimentModel(
            model_dir=str(model_path),
            max_length=max_len,
            batch_size=batch_size,
        )
        sentiment_model.load()
        app.state.model_service = sentiment_model
        logger.info("startup model load done elapsed=%.2fs", time.perf_counter() - started)

    return app


app = create_app()
