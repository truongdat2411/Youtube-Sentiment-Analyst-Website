from fastapi import APIRouter, Depends

from app.api.deps import get_app_settings
from app.core.config import Settings

router = APIRouter(tags=["health"])


@router.get("/health", summary="Service health check")
async def health_check(settings: Settings = Depends(get_app_settings)) -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.app_env,
    }
