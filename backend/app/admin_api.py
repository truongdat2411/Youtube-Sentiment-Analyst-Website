from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.admin_schemas import AdminUserListResponse, AdminUserResponse, AdminUserUpdateRequest
from app.auth_schemas import UserRole
from app.db import get_db
from app.dependencies import get_current_admin_user
from app.history_schemas import HistoryListResponse
from app.models import AnalysisHistory, User

router = APIRouter(prefix="/admin", tags=["admin"])


def _build_admin_user_response(user: User, analysis_count: int = 0) -> AdminUserResponse:
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
        analysis_count=analysis_count,
    )


@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    search: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> AdminUserListResponse:
    counts_subquery = (
        select(
            AnalysisHistory.user_id.label("user_id"),
            func.count(AnalysisHistory.id).label("analysis_count"),
        )
        .group_by(AnalysisHistory.user_id)
        .subquery()
    )
    query = (
        select(User, func.coalesce(counts_subquery.c.analysis_count, 0).label("analysis_count"))
        .outerjoin(counts_subquery, counts_subquery.c.user_id == User.id)
    )

    normalized_search = search.strip() if search else None
    if normalized_search:
        wildcard = f"%{normalized_search}%"
        query = query.where(or_(User.email.ilike(wildcard), User.username.ilike(wildcard)))

    query = query.order_by(User.created_at.desc()).limit(limit).offset(offset)
    rows = db.execute(query).all()
    items = [_build_admin_user_response(user=row[0], analysis_count=int(row[1] or 0)) for row in rows]
    return AdminUserListResponse(items=items, limit=limit, offset=offset)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: int,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> AdminUserResponse:
    if payload.role is None and payload.is_active is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update fields provided.")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    next_role = payload.role.value if payload.role is not None else user.role
    next_is_active = payload.is_active if payload.is_active is not None else user.is_active

    # Business rule: once a user is admin, admin role cannot be downgraded to user.
    if user.role == UserRole.admin.value and next_role != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change role for an admin user.",
        )

    is_active_admin_being_removed = (
        user.role == UserRole.admin.value
        and user.is_active
        and (next_role != UserRole.admin.value or not next_is_active)
    )
    if is_active_admin_being_removed:
        other_active_admin_count = db.execute(
            select(func.count(User.id)).where(
                User.role == UserRole.admin.value,
                User.is_active.is_(True),
                User.id != user.id,
            )
        ).scalar_one()
        if int(other_active_admin_count or 0) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove or deactivate the last active admin.",
            )

    user.role = next_role
    user.is_active = next_is_active
    db.commit()
    db.refresh(user)

    analysis_count = db.execute(
        select(func.count(AnalysisHistory.id)).where(AnalysisHistory.user_id == user.id)
    ).scalar_one()
    return _build_admin_user_response(user=user, analysis_count=int(analysis_count or 0))


@router.get("/users/{user_id}/history", response_model=HistoryListResponse)
def get_user_history(
    user_id: int,
    search: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> HistoryListResponse:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    query = select(AnalysisHistory).where(AnalysisHistory.user_id == user_id)
    normalized_search = search.strip() if search else None
    if normalized_search:
        query = query.where(AnalysisHistory.video_title.ilike(f"%{normalized_search}%"))

    query = query.order_by(AnalysisHistory.created_at.desc()).limit(limit).offset(offset)
    items = db.execute(query).scalars().all()
    return HistoryListResponse(items=items, limit=limit, offset=offset)
