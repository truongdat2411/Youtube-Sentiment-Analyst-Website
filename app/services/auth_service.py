import logging

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.exceptions import AppException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository

logger = logging.getLogger("app.services.auth")


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    async def register(self, *, email: str, password: str, full_name: str | None) -> tuple[str, User]:
        normalized_email = email.strip().lower()
        existing = await self.users.get_by_email(normalized_email)
        if existing is not None:
            raise AppException("Email đã được đăng ký", status.HTTP_409_CONFLICT)

        user = await self.users.create(
            email=normalized_email,
            hashed_password=hash_password(password),
            full_name=full_name,
        )
        await self.session.commit()
        logger.info("Registered user id=%s email=%s", user.id, user.email)

        token = create_access_token(str(user.id))
        return token, user

    async def login(self, *, email: str, password: str) -> tuple[str, User]:
        normalized_email = email.strip().lower()
        user = await self.users.get_by_email(normalized_email)
        if user is None or not verify_password(password, user.hashed_password):
            raise AppException("Email hoặc mật khẩu không đúng", status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            raise AppException("Tài khoản đã bị vô hiệu hóa", status.HTTP_403_FORBIDDEN)

        token = create_access_token(str(user.id))
        logger.info("Login user id=%s", user.id)
        return token, user
