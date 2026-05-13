from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(default="YouTube Comment Sentiment Analysis", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_port: int = Field(default=8000, alias="APP_PORT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/youtube_sentiment",
        alias="DATABASE_URL",
    )
    youtube_api_key: str = Field(default="", alias="YOUTUBE_API_KEY")
    youtube_api_service_name: str = Field(default="youtube", alias="YOUTUBE_API_SERVICE_NAME")
    youtube_api_version: str = Field(default="v3", alias="YOUTUBE_API_VERSION")
    youtube_max_results_per_page: int = Field(default=100, alias="YOUTUBE_MAX_RESULTS_PER_PAGE")
    youtube_max_comments: int = Field(default=500, alias="YOUTUBE_MAX_COMMENTS")
    mlflow_tracking_uri: str = Field(default="http://localhost:5000", alias="MLFLOW_TRACKING_URI")
    mlflow_experiment_name: str = Field(default="youtube-comment-sentiment", alias="MLFLOW_EXPERIMENT_NAME")
    mlflow_registered_model_name: str = Field(
        default="sentiment-model",
        alias="MLFLOW_REGISTERED_MODEL_NAME",
    )
    model_name: str = Field(
        default="wonrax/phobert-base-vietnamese-sentiment",
        alias="MODEL_NAME",
    )
    model_version: str = Field(default="sentiment-model-v1", alias="MODEL_VERSION")
    model_max_length: int = Field(default=256, alias="MODEL_MAX_LENGTH")
    inference_batch_size: int = Field(default=16, alias="INFERENCE_BATCH_SIZE")
    model_cache_dir: str | None = Field(default=None, alias="MODEL_CACHE_DIR")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        alias="CORS_ORIGINS",
    )
    jwt_secret_key: str = Field(
        default="change-me-in-production-use-openssl-rand-hex-32",
        alias="JWT_SECRET_KEY",
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=10080, alias="ACCESS_TOKEN_EXPIRE_MINUTES")  # 7 ngày


@lru_cache
def get_settings() -> Settings:
    return Settings()
