"""Chuan hoa datetime cho PostgreSQL TIMESTAMP WITHOUT TIME ZONE + asyncpg."""

from datetime import datetime, timezone


def utc_now_naive() -> datetime:
    """UTC 'naive' — dong bo voi cot DateTime khong timezone trong DB."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive_utc(value: datetime | None) -> datetime | None:
    """Chuyen datetime co timezone (vd. RFC3339 tu YouTube) sang naive UTC."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)
