import logging
from collections import Counter

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.exceptions import AppException
from app.ml.inference.sentiment_inference_service import get_sentiment_inference_service
from app.models.comment import Comment
from app.models.prediction import Prediction
from app.repositories.analysis_history_repository import AnalysisHistoryRepository
from app.repositories.comment_repository import CommentRepository
from app.repositories.prediction_repository import PredictionRepository
from app.repositories.video_repository import VideoRepository
from app.schemas.analysis import (
    AnalyzeCommentResult,
    AnalyzeCommentsResponse,
    SentimentBreakdown,
)
from app.services.preprocessing_service import preprocess_comment
from app.services.youtube_service import YouTubeIngestionService
from app.utils.datetime_utils import to_naive_utc

logger = logging.getLogger("app.services.analysis")


class AnalysisService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.video_repo = VideoRepository(session)
        self.comment_repo = CommentRepository(session)
        self.prediction_repo = PredictionRepository(session)
        self.history_repo = AnalysisHistoryRepository(session)
        self.youtube_service = YouTubeIngestionService()

    async def analyze_video_comments(self, youtube_url: str, user_id: int | None = None) -> AnalyzeCommentsResponse:
        ingestion = await self.youtube_service.ingest_comments(youtube_url)
        metadata = await self.youtube_service.fetch_video_metadata(ingestion.video_id)

        video = await self.video_repo.get_by_youtube_video_id(ingestion.video_id)
        if video is None:
            video = await self.video_repo.create(
                youtube_video_id=ingestion.video_id,
                url=youtube_url,
                title=metadata.title,
            )
        else:
            video.title = metadata.title
            video.url = youtube_url
            await self.session.flush()

        incoming_ids = [item.youtube_comment_id for item in ingestion.comments]
        existing_ids = await self.comment_repo.existing_youtube_comment_ids(incoming_ids)

        new_comments: list[Comment] = []
        for item in ingestion.comments:
            if item.youtube_comment_id in existing_ids:
                continue
            new_comments.append(
                Comment(
                    video_id=video.id,
                    youtube_comment_id=item.youtube_comment_id,
                    author=item.author_display_name,
                    text_original=item.text_original,
                    text_cleaned=preprocess_comment(item.text_original),
                    published_at=to_naive_utc(item.published_at),
                )
            )

        if new_comments:
            await self.comment_repo.create_many(new_comments)
            try:
                inference = get_sentiment_inference_service()
                batch_inference = inference.predict_batch(
                    [comment.text_original for comment in new_comments]
                )
            except Exception as exc:
                await self.session.rollback()
                logger.exception("Sentiment inference failed for video_id=%s", ingestion.video_id)
                raise AppException(
                    "Sentiment model failed (check MODEL_NAME is a sequence-classification model, "
                    "e.g. wonrax/phobert-base-vietnamese-sentiment, and see backend logs).",
                    status.HTTP_503_SERVICE_UNAVAILABLE,
                ) from exc

            prediction_models: list[Prediction] = []
            for comment, pred in zip(new_comments, batch_inference.predictions, strict=True):
                prediction_models.append(
                    Prediction(
                        comment_id=comment.id,
                        sentiment=pred.label,
                        confidence=pred.confidence,
                        model_name=batch_inference.model_name,
                        model_version=batch_inference.model_version,
                    )
                )

            await self.prediction_repo.create_many(prediction_models)
            await self.session.commit()
            logger.info("Saved %s new comments and predictions for video_id=%s", len(new_comments), ingestion.video_id)
        else:
            logger.info("No new comments found for video_id=%s", ingestion.video_id)
            await self.session.commit()

        rows = await self.comment_repo.list_with_predictions_by_video_id(video.id)
        results = [
            AnalyzeCommentResult(
                youtube_comment_id=comment.youtube_comment_id,
                author=comment.author,
                text_original=comment.text_original,
                sentiment=prediction.sentiment,
                confidence=prediction.confidence,
                predicted_at=prediction.predicted_at,
                published_at=comment.published_at,
            )
            for comment, prediction in rows
        ]

        sentiment_counts = Counter(pred.sentiment for _, pred in rows)
        breakdown = SentimentBreakdown(
            positive=int(sentiment_counts.get("positive", 0)),
            neutral=int(sentiment_counts.get("neutral", 0)),
            negative=int(sentiment_counts.get("negative", 0)),
        )

        response = AnalyzeCommentsResponse(
            video_id=video.youtube_video_id,
            video_url=video.url,
            video=metadata,
            sentiment_breakdown=breakdown,
            total_comments=ingestion.total_comments,
            total_predictions=len(results),
            predictions=results,
        )

        if user_id is not None:
            await self.history_repo.create(
                user_id=user_id,
                video_id=video.id,
                positive_count=breakdown.positive,
                neutral_count=breakdown.neutral,
                negative_count=breakdown.negative,
                total_predictions=len(results),
            )
            await self.session.commit()

        return response

