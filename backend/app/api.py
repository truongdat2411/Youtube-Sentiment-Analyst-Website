from __future__ import annotations

import asyncio
import logging
import os
import time

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_current_active_user, get_optional_current_active_user
from app.history_schemas import CommentsListResponse, HistoryDetailResponse, HistoryListResponse
from app.models import AnalysisHistory, Comment, User
from app.schemas import AnalyzeItem, AnalyzeRequest, AnalyzeResponse
from app.utils import clean_text
from app.youtube import (
    YouTubeError,
    extract_video_id,
    fetch_comments,
    fetch_video_title,
    get_sample_comments,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    try:
        parsed = float(value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


def _format_timeout_seconds(seconds: float) -> str:
    if seconds >= 1:
        return f"{seconds:.0f}s"
    return f"{seconds:.2f}s"


def _build_thumbnail_url(video_id: str) -> str | None:
    if not video_id:
        return None
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"


def _count_labels(items: list[AnalyzeItem]) -> tuple[int, int, int]:
    neg_count = sum(1 for item in items if item.label == "NEG")
    neu_count = sum(1 for item in items if item.label == "NEU")
    pos_count = sum(1 for item in items if item.label == "POS")
    return neg_count, neu_count, pos_count


def _save_analysis_history(
    db: Session,
    current_user: User,
    payload: AnalyzeRequest,
    response: AnalyzeResponse,
) -> None:
    neg_count, neu_count, pos_count = _count_labels(response.items)
    history = AnalysisHistory(
        user_id=current_user.id,
        youtube_url=payload.youtube_url,
        video_id=response.video_id,
        video_title=response.video_title,
        thumbnail_url=_build_thumbnail_url(response.video_id),
        total_comments=len(response.items),
        neg_count=neg_count,
        neu_count=neu_count,
        pos_count=pos_count,
        result_json=response.model_dump(mode="json"),
    )
    db.add(history)
    db.flush()  # Flush to get history.id
    
    # Save individual comments to comments table
    for item in response.items:
        comment = Comment(
            analysis_history_id=history.id,
            comment_id=item.comment_id,
            author=item.author,
            text=item.text,
            published_at=item.published_at,
            label=item.label,
            probs=item.probs,
        )
        db.add(comment)
    
    db.commit()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


async def _analyze_internal(payload: AnalyzeRequest, request: Request, video_id: str) -> AnalyzeResponse:
    model_service = getattr(request.app.state, "model_service", None)
    if model_service is None:
        raise HTTPException(status_code=500, detail="Model is not loaded.")

    fetch_timeout_seconds = _env_float("FETCH_COMMENTS_TIMEOUT_SECONDS", 45.0)
    inference_timeout_seconds = _env_float("INFERENCE_TIMEOUT_SECONDS", 180.0)
    title_timeout_seconds = _env_float("VIDEO_TITLE_TIMEOUT_SECONDS", 10.0)

    api_key = os.getenv("YOUTUBE_API_KEY", "").strip()
    using_sample_data = False

    comments = []
    if api_key:
        logger.info("comment fetch start video_id=%s max_comments=%s", video_id, payload.max_comments)
        fetch_started = time.perf_counter()
        try:
            comments = await asyncio.wait_for(
                fetch_comments(video_id=video_id, api_key=api_key, max_comments=payload.max_comments),
                timeout=fetch_timeout_seconds + 2.0,
            )
        except asyncio.TimeoutError as exc:
            raise HTTPException(
                status_code=504,
                detail=f"Comment fetch timed out after {_format_timeout_seconds(fetch_timeout_seconds)}.",
            ) from exc
        except YouTubeError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
        logger.info(
            "comment fetch end video_id=%s count=%s elapsed=%.2fs",
            video_id,
            len(comments),
            time.perf_counter() - fetch_started,
        )
    else:
        using_sample_data = True
        comments = get_sample_comments(payload.max_comments)
        logger.info("comment fetch skipped, using sample data count=%s", len(comments))

    cleaned_texts = [clean_text(comment.text) for comment in comments]
    logger.info("inference start video_id=%s text_count=%s", video_id, len(cleaned_texts))
    inference_started = time.perf_counter()
    try:
        predictions = await asyncio.wait_for(
            asyncio.to_thread(model_service.predict, cleaned_texts),
            timeout=inference_timeout_seconds,
        )
    except asyncio.TimeoutError as exc:
        raise HTTPException(
            status_code=504,
            detail=f"Model inference timed out after {_format_timeout_seconds(inference_timeout_seconds)}.",
        ) from exc
    except Exception as exc:  # pragma: no cover - safety for runtime-only model failures
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}") from exc
    logger.info(
        "inference end video_id=%s predictions=%s elapsed=%.2fs",
        video_id,
        len(predictions),
        time.perf_counter() - inference_started,
    )

    if len(predictions) != len(comments):
        raise HTTPException(status_code=500, detail="Inference result count does not match comments count.")

    items: list[AnalyzeItem] = []
    for comment, prediction in zip(comments, predictions):
        items.append(
            AnalyzeItem(
                comment_id=comment.comment_id,
                author=comment.author,
                published_at=comment.published_at,
                text=comment.text,
                label=prediction.label,
                probs=prediction.probs,
            )
        )

    video_title = None
    if not using_sample_data and api_key:
        try:
            video_title = await asyncio.wait_for(
                fetch_video_title(video_id=video_id, api_key=api_key),
                timeout=title_timeout_seconds,
            )
        except asyncio.TimeoutError:
            logger.warning("video title fetch timed out video_id=%s", video_id)
        except YouTubeError as exc:
            logger.warning("video title fetch failed video_id=%s detail=%s", video_id, exc.message)
    elif using_sample_data:
        video_title = "Sample comments (YOUTUBE_API_KEY missing)"

    return AnalyzeResponse(video_id=video_id, video_title=video_title, items=items)


@router.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(
    payload: AnalyzeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_active_user),
) -> AnalyzeResponse:
    started = time.perf_counter()
    logger.info("analyze request received max_comments=%s", payload.max_comments)

    video_id = extract_video_id(payload.youtube_url)
    if not video_id:
        logger.warning("analyze invalid url submitted")
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")
    logger.info("analyze parsed video_id=%s", video_id)

    inference_timeout_seconds = _env_float("INFERENCE_TIMEOUT_SECONDS", 180.0)
    analyze_timeout_seconds = _env_float("ANALYZE_TIMEOUT_SECONDS", 240.0)
    if analyze_timeout_seconds <= inference_timeout_seconds:
        adjusted_timeout = inference_timeout_seconds + 30.0
        logger.warning(
            "analyze timeout adjusted analyze=%s inference=%s adjusted=%s",
            _format_timeout_seconds(analyze_timeout_seconds),
            _format_timeout_seconds(inference_timeout_seconds),
            _format_timeout_seconds(adjusted_timeout),
        )
        analyze_timeout_seconds = adjusted_timeout

    try:
        response = await asyncio.wait_for(
            _analyze_internal(payload=payload, request=request, video_id=video_id),
            timeout=analyze_timeout_seconds,
        )
    except asyncio.TimeoutError as exc:
        logger.error("analyze timed out video_id=%s", video_id)
        raise HTTPException(
            status_code=504,
            detail=f"Analyze request timed out after {_format_timeout_seconds(analyze_timeout_seconds)}.",
        ) from exc
    except HTTPException as exc:
        logger.warning("analyze failed video_id=%s status=%s detail=%s", video_id, exc.status_code, exc.detail)
        raise
    except Exception as exc:  # pragma: no cover - safeguard for runtime surprises
        logger.exception("analyze unexpected failure video_id=%s", video_id)
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {exc}") from exc

    if current_user is not None:
        try:
            _save_analysis_history(db=db, current_user=current_user, payload=payload, response=response)
        except Exception:  # pragma: no cover - keep analyze stable even if history persistence fails
            db.rollback()
            logger.exception(
                "history save failed user_id=%s video_id=%s",
                current_user.id,
                response.video_id,
            )

    elapsed = time.perf_counter() - started
    logger.info(
        "analyze response sent video_id=%s items=%s total_elapsed=%.2fs",
        response.video_id,
        len(response.items),
        elapsed,
    )
    return response


@router.get("/api/history", response_model=HistoryListResponse)
def get_history(
    search: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> HistoryListResponse:
    query = select(AnalysisHistory).where(AnalysisHistory.user_id == current_user.id)
    normalized_search = search.strip() if search else None
    if normalized_search:
        query = query.where(AnalysisHistory.video_title.ilike(f"%{normalized_search}%"))

    query = query.order_by(AnalysisHistory.created_at.desc()).limit(limit).offset(offset)
    items = db.execute(query).scalars().all()
    return HistoryListResponse(items=items, limit=limit, offset=offset)


@router.get("/api/history/{history_id}", response_model=HistoryDetailResponse)
def get_history_item(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> AnalysisHistory:
    item = db.execute(
        select(AnalysisHistory).where(
            AnalysisHistory.id == history_id,
            AnalysisHistory.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found.")
    return item


@router.delete("/api/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_history_item(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Response:
    item = db.execute(
        select(AnalysisHistory).where(
            AnalysisHistory.id == history_id,
            AnalysisHistory.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found.")

    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/api/history/{history_id}/comments", response_model=CommentsListResponse)
def get_history_comments(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CommentsListResponse:
    """Get all comments from an analysis history (from comments table)."""
    # Verify that the history belongs to the current user
    history_item = db.execute(
        select(AnalysisHistory).where(
            AnalysisHistory.id == history_id,
            AnalysisHistory.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if history_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found.")
    
    # Fetch comments from comments table
    comments = db.execute(
        select(Comment).where(Comment.analysis_history_id == history_id).order_by(Comment.published_at.desc())
    ).scalars().all()
    
    return CommentsListResponse(items=comments, total=len(comments))
