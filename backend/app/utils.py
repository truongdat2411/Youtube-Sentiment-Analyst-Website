from __future__ import annotations

from collections.abc import Iterable
from typing import TypeVar

T = TypeVar("T")


def clean_text(text: str) -> str:
    return " ".join(text.strip().split())


def chunked(items: list[T], size: int) -> Iterable[list[T]]:
    if size <= 0:
        raise ValueError("size must be > 0")
    for index in range(0, len(items), size):
        yield items[index : index + size]

