from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def hash_password(plain_password: str) -> str:
    pw = plain_password.encode("utf-8")
    return bcrypt.hashpw(pw, bcrypt.gensalt(rounds=12)).decode("utf-8")


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    delta = expires_delta if expires_delta is not None else timedelta(minutes=settings.access_token_expire_minutes)
    expire_ts = int((datetime.now(tz=UTC) + delta).timestamp())
    to_encode = {"sub": subject, "exp": expire_ts}
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        sub = payload.get("sub")
        return str(sub) if sub is not None else None
    except JWTError:
        return None
