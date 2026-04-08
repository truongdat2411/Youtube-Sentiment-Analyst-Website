from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse

import httpx

VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/commentThreads"
YOUTUBE_VIDEO_API_URL = "https://www.googleapis.com/youtube/v3/videos"
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


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    try:
        parsed = int(value)
    except ValueError:
        return default
    return parsed if parsed > 0 else default


class YouTubeError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


@dataclass
class YouTubeComment:
    comment_id: str
    author: str
    published_at: str
    text: str


def extract_video_id(youtube_url: str) -> str | None:
    if not youtube_url or not youtube_url.strip():
        return None

    parsed = urlparse(youtube_url.strip())
    if not parsed.netloc:
        parsed = urlparse(f"https://{youtube_url.strip()}")

    host = parsed.netloc.lower()
    host = host.removeprefix("www.")
    host = host.removeprefix("m.")

    video_id: str | None = None

    if host == "youtu.be":
        path_parts = [part for part in parsed.path.split("/") if part]
        if path_parts:
            video_id = path_parts[0]
    elif host.endswith("youtube.com"):
        path_parts = [part for part in parsed.path.split("/") if part]
        if path_parts and path_parts[0] == "watch":
            qs = parse_qs(parsed.query)
            video_id = qs.get("v", [None])[0]
        elif parsed.path == "/watch":
            qs = parse_qs(parsed.query)
            video_id = qs.get("v", [None])[0]
        elif len(path_parts) >= 2 and path_parts[0] in {"shorts", "embed"}:
            video_id = path_parts[1]

    if video_id and VIDEO_ID_RE.fullmatch(video_id):
        return video_id
    return None


def get_sample_comments(max_comments: int) -> list[YouTubeComment]:
    sample = [
        YouTubeComment(
            comment_id="sample_1",
            author="Sample User A",
            published_at="2026-01-01T00:00:00Z",
            text="This video is amazing and super helpful!",
        ),
        YouTubeComment(
            comment_id="sample_2",
            author="Sample User B",
            published_at="2026-01-01T00:01:00Z",
            text="It is okay, nothing too special.",
        ),
        YouTubeComment(
            comment_id="sample_3",
            author="Sample User C",
            published_at="2026-01-01T00:02:00Z",
            text="I do not like this content at all.",
        ),
        YouTubeComment(
            comment_id="sample_4",
            author="Sample User D",
            published_at="2026-01-01T00:03:00Z",
            text="Thanks for sharing this!",
        ),
        YouTubeComment(
            comment_id="sample_5",
            author="Sample User E",
            published_at="2026-01-01T00:04:00Z",
            text="The explanation is confusing and poorly structured.",
        ),
    ]
    return sample[: max(1, min(max_comments, len(sample)))]


def _map_youtube_error(status_code: int, payload: dict) -> YouTubeError:
    error = payload.get("error", {})
    message = error.get("message", "YouTube API request failed.")
    details = error.get("errors", []) if isinstance(error.get("errors"), list) else []
    reasons = {detail.get("reason") for detail in details if isinstance(detail, dict)}

    if "commentsDisabled" in reasons:
        return YouTubeError(422, "Comments are disabled for this video.")
    if reasons.intersection(
        {"quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded", "userRateLimitExceeded"}
    ):
        return YouTubeError(429, "YouTube API quota/rate limit exceeded.")
    if "videoNotFound" in reasons:
        return YouTubeError(404, "Video not found.")
    if "keyInvalid" in reasons:
        return YouTubeError(500, "Invalid YouTube API key.")
    if status_code in {429, 503}:
        return YouTubeError(status_code, message)
    if status_code == 404:
        return YouTubeError(404, "Video not found.")
    return YouTubeError(503, message)


async def _request_with_retries(
    client: httpx.AsyncClient, url: str, params: dict, retries: int = 2
) -> dict:
    for attempt in range(retries + 1):
        try:
            response = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            logger.warning("YouTube API timeout on attempt %s/%s", attempt + 1, retries + 1)
            if attempt == retries:
                raise YouTubeError(504, "Timed out while calling YouTube API.") from exc
            await asyncio.sleep(0.5 * (attempt + 1))
            continue
        except httpx.RequestError as exc:
            logger.warning("YouTube API network error on attempt %s/%s: %s", attempt + 1, retries + 1, exc)
            if attempt == retries:
                raise YouTubeError(503, f"Network error while calling YouTube API: {exc}") from exc
            await asyncio.sleep(0.5 * (attempt + 1))
            continue

        if response.status_code == 200:
            return response.json()

        payload = {}
        try:
            payload = response.json()
        except ValueError:
            payload = {"error": {"message": response.text}}

        error = _map_youtube_error(response.status_code, payload)
        if response.status_code >= 500 and attempt < retries:
            await asyncio.sleep(0.5 * (attempt + 1))
            continue
        raise error

    raise YouTubeError(503, "Unexpected YouTube API error.")


async def fetch_comments(video_id: str, api_key: str, max_comments: int = 200) -> list[YouTubeComment]:
    if not api_key:
        raise YouTubeError(500, "YOUTUBE_API_KEY is not configured.")

    started = time.perf_counter()
    per_request_timeout = _env_float("YOUTUBE_HTTP_TIMEOUT_SECONDS", 15.0)
    total_timeout_seconds = _env_float("YOUTUBE_FETCH_TIMEOUT_SECONDS", 45.0)
    retries = _env_int("YOUTUBE_MAX_RETRIES", 2)
    configured_max_pages = _env_int("YOUTUBE_MAX_PAGES", 20)
    page_limit = min(configured_max_pages, max(1, (max_comments + 99) // 100 + 2))

    comments: list[YouTubeComment] = []
    page_token: str | None = None
    seen_tokens: set[str] = set()
    page_count = 0

    async with httpx.AsyncClient(timeout=per_request_timeout) as client:
        while len(comments) < max_comments:
            elapsed = time.perf_counter() - started
            if elapsed > total_timeout_seconds:
                raise YouTubeError(504, "Timed out while fetching YouTube comments.")
            if page_count >= page_limit:
                raise YouTubeError(504, "Comment fetch exceeded page limit and was stopped.")

            params = {
                "part": "snippet",
                "videoId": video_id,
                "maxResults": 100,
                "textFormat": "plainText",
                "key": api_key,
            }
            if page_token:
                params["pageToken"] = page_token

            logger.info(
                "YouTube fetch page start video_id=%s page=%s token_present=%s",
                video_id,
                page_count + 1,
                bool(page_token),
            )
            data = await _request_with_retries(client, YOUTUBE_API_URL, params, retries=retries)
            page_count += 1

            items = data.get("items", [])
            if not isinstance(items, list):
                items = []

            for item in items:
                top_comment = item.get("snippet", {}).get("topLevelComment", {})
                snippet = top_comment.get("snippet", {})
                comment_id = top_comment.get("id") or item.get("id") or ""
                comments.append(
                    YouTubeComment(
                        comment_id=comment_id,
                        author=snippet.get("authorDisplayName", ""),
                        published_at=snippet.get("publishedAt", ""),
                        text=snippet.get("textDisplay", ""),
                    )
                )
                if len(comments) >= max_comments:
                    break

            next_page_token = data.get("nextPageToken")
            logger.info(
                "YouTube fetch page done video_id=%s page=%s comments_accumulated=%s next_token_present=%s",
                video_id,
                page_count,
                len(comments),
                bool(next_page_token),
            )

            if not next_page_token:
                break
            if next_page_token == page_token or next_page_token in seen_tokens:
                raise YouTubeError(503, "YouTube pagination did not advance; request aborted.")

            seen_tokens.add(next_page_token)
            page_token = next_page_token

    return comments


async def fetch_video_title(video_id: str, api_key: str) -> str | None:
    if not api_key:
        return None

    per_request_timeout = _env_float("YOUTUBE_HTTP_TIMEOUT_SECONDS", 15.0)
    retries = _env_int("YOUTUBE_MAX_RETRIES", 2)
    async with httpx.AsyncClient(timeout=per_request_timeout) as client:
        params = {
            "part": "snippet",
            "id": video_id,
            "key": api_key,
            "maxResults": 1,
        }
        data = await _request_with_retries(client, YOUTUBE_VIDEO_API_URL, params, retries=retries)
        items = data.get("items", [])
        if not items:
            return None
        return items[0].get("snippet", {}).get("title")
