from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.session import get_db_session
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_db_session)) -> TokenResponse:
    service = AuthService(session)
    name = (payload.full_name or "").strip() or None
    token, _user = await service.register(email=str(payload.email), password=payload.password, full_name=name)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db_session)) -> TokenResponse:
    service = AuthService(session)
    token, _user = await service.login(email=str(payload.email), password=payload.password)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserRead)
async def read_me(current_user: User = Depends(get_current_active_user)) -> UserRead:
    return UserRead.model_validate(current_user)
