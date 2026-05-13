from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.session import get_db_session
from app.models.user import User
from app.repositories.analysis_history_repository import AnalysisHistoryRepository
from app.schemas.analysis import AnalyzeCommentsRequest, AnalyzeCommentsResponse
from app.schemas.history import AnalysisHistoryEntry, AnalysisHistoryListResponse
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/comments", response_model=AnalyzeCommentsResponse)
async def analyze_comments(
    payload: AnalyzeCommentsRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
) -> AnalyzeCommentsResponse:
    service = AnalysisService(session)
    return await service.analyze_video_comments(str(payload.youtube_url), user_id=current_user.id)


@router.get("/history", response_model=AnalysisHistoryListResponse)
async def list_analysis_history(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> AnalysisHistoryListResponse:
    repo = AnalysisHistoryRepository(session)
    total = await repo.count_for_user(current_user.id)
    rows = await repo.list_for_user(current_user.id, skip=skip, limit=limit)
    items = [
        AnalysisHistoryEntry(
            id=h.id,
            analyzed_at=h.analyzed_at,
            youtube_video_id=v.youtube_video_id,
            video_url=v.url,
            video_title=v.title,
            positive_count=h.positive_count,
            neutral_count=h.neutral_count,
            negative_count=h.negative_count,
            total_predictions=h.total_predictions,
        )
        for h, v in rows
    ]
    return AnalysisHistoryListResponse(items=items, total=total)
