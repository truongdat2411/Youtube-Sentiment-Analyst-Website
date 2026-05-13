import asyncio
import html
import logging
from typing import Any
from urllib.parse import parse_qs, urlparse

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from starlette import status
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.schemas.youtube import NormalizedYouTubeComment, YouTubeIngestionResponse, YouTubeVideoMetadata

logger = logging.getLogger("app.services.youtube")


class YouTubeIngestionService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _extract_video_id(self, youtube_url: str) -> str:
        parsed = urlparse(youtube_url.strip())
        host = parsed.netloc.lower()

        if "youtu.be" in host:
            video_id = parsed.path.strip("/")
            if video_id:
                return video_id

        if "youtube.com" in host:
            query = parse_qs(parsed.query)
            video_id = query.get("v", [""])[0]
            if video_id:
                return video_id

        raise AppException("Invalid YouTube URL: unable to extract video_id", status.HTTP_422_UNPROCESSABLE_ENTITY)

    def _normalize_comment(self, comment_item: dict[str, Any], video_id: str) -> NormalizedYouTubeComment:
        comment_data = comment_item.get("snippet", {}).get("topLevelComment", {})
        snippet = comment_data.get("snippet", {})

        text_original = html.unescape(snippet.get("textDisplay", ""))
        text_original = " ".join(text_original.split()).strip()
        comment_id = comment_data.get("id", "").strip()

        if not comment_id or not text_original:
            raise AppException("Invalid YouTube comment payload returned by API")

        return NormalizedYouTubeComment(
            youtube_comment_id=comment_id,
            video_id=video_id,
            author_display_name=snippet.get("authorDisplayName"),
            text_original=text_original,
            like_count=int(snippet.get("likeCount", 0)),
            published_at=snippet.get("publishedAt"),
            updated_at=snippet.get("updatedAt"),
        )

    def _is_quota_error(self, error: HttpError) -> bool:
        reason = ""
        if hasattr(error, "error_details") and isinstance(error.error_details, list) and error.error_details:
            reason = str(error.error_details[0].get("reason", ""))
        return "quota" in reason.lower() or error.status_code == 403

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(HttpError),
        reraise=True,
    )
    def _fetch_comment_page(self, client: Any, video_id: str, page_token: str | None) -> dict[str, Any]:
        request = client.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=min(self.settings.youtube_max_results_per_page, 100),
            pageToken=page_token,
            textFormat="plainText",
            order="time",
        )
        return request.execute()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception_type(HttpError),
        reraise=True,
    )
    def _fetch_video_details_page(self, client: Any, video_id: str) -> dict[str, Any]:
        request = client.videos().list(part="snippet,statistics", id=video_id)
        return request.execute()

    async def fetch_video_metadata(self, video_id: str) -> YouTubeVideoMetadata:
        if not self.settings.youtube_api_key:
            raise AppException("Missing YOUTUBE_API_KEY configuration", status.HTTP_500_INTERNAL_SERVER_ERROR)

        client = build(
            serviceName=self.settings.youtube_api_service_name,
            version=self.settings.youtube_api_version,
            developerKey=self.settings.youtube_api_key,
        )
        try:
            response = await asyncio.to_thread(self._fetch_video_details_page, client, video_id)
        except HttpError as error:
            if self._is_quota_error(error):
                raise AppException(
                    "YouTube API quota exceeded. Please try again later.",
                    status.HTTP_429_TOO_MANY_REQUESTS,
                ) from error
            logger.exception("YouTube videos.list failed for video_id=%s", video_id)
            raise AppException("YouTube API request failed", status.HTTP_502_BAD_GATEWAY) from error

        items = response.get("items", [])
        if not items:
            raise AppException("Video not found or not accessible", status.HTTP_404_NOT_FOUND)

        item = items[0]
        snippet = item.get("snippet", {})
        statistics = item.get("statistics", {})
        thumbnails = snippet.get("thumbnails", {}) or {}
        thumb = (
            thumbnails.get("maxres")
            or thumbnails.get("high")
            or thumbnails.get("medium")
            or thumbnails.get("default")
            or {}
        )
        thumbnail_url = str(thumb.get("url", "") or "")
        title = str(snippet.get("title", "") or "Untitled")

        view_count = int(statistics["viewCount"]) if statistics.get("viewCount") is not None else 0
        like_count = int(statistics["likeCount"]) if statistics.get("likeCount") is not None else 0
        comment_count_total: int | None = None
        if statistics.get("commentCount") is not None:
            comment_count_total = int(statistics["commentCount"])

        return YouTubeVideoMetadata(
            title=title,
            thumbnail_url=thumbnail_url,
            view_count=view_count,
            like_count=like_count,
            comment_count_total=comment_count_total,
        )

    async def ingest_comments(self, youtube_url: str) -> YouTubeIngestionResponse:
        if not self.settings.youtube_api_key:
            raise AppException("Missing YOUTUBE_API_KEY configuration", status.HTTP_500_INTERNAL_SERVER_ERROR)

        video_id = self._extract_video_id(youtube_url)
        logger.info("Starting comment ingestion for video_id=%s", video_id)

        client = build(
            serviceName=self.settings.youtube_api_service_name,
            version=self.settings.youtube_api_version,
            developerKey=self.settings.youtube_api_key,
        )

        collected: list[NormalizedYouTubeComment] = []
        page_token: str | None = None

        while len(collected) < self.settings.youtube_max_comments:
            try:
                response = await asyncio.to_thread(self._fetch_comment_page, client, video_id, page_token)
            except HttpError as error:
                if self._is_quota_error(error):
                    logger.warning("YouTube API quota exceeded for video_id=%s", video_id)
                    raise AppException(
                        "YouTube API quota exceeded. Please try again later.",
                        status.HTTP_429_TOO_MANY_REQUESTS,
                    ) from error
                logger.exception("YouTube API request failed for video_id=%s", video_id)
                raise AppException("YouTube API request failed", status.HTTP_502_BAD_GATEWAY) from error

            items = response.get("items", [])
            for item in items:
                try:
                    normalized = self._normalize_comment(item, video_id)
                except AppException:
                    continue
                collected.append(normalized)
                if len(collected) >= self.settings.youtube_max_comments:
                    break

            page_token = response.get("nextPageToken")
            if not page_token:
                break

        logger.info("Completed comment ingestion for video_id=%s total_comments=%s", video_id, len(collected))
        return YouTubeIngestionResponse(video_id=video_id, total_comments=len(collected), comments=collected)
