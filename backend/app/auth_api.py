from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth_schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse, UserRole
from app.db import get_db
from app.dependencies import get_current_active_user
from app.models import User
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    normalized_email = payload.email.lower().strip()
    normalized_username = payload.username.strip()

    existing_user = db.execute(
        select(User).where(
            or_(
                User.email == normalized_email,
                User.username == normalized_username,
            )
        )
    ).scalar_one_or_none()
    if existing_user:
        if existing_user.email == normalized_email:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken.")

    user = User(
        email=normalized_email,
        username=normalized_username,
        password_hash=hash_password(payload.password),
        role=UserRole.user.value,
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists.") from exc
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    normalized_email = payload.email.lower().strip()
    user = db.execute(select(User).where(User.email == normalized_email)).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user.")

    access_token = create_access_token(subject=str(user.id), role=user.role)
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user
