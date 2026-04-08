# PROMPT — YouTube Data API v3 comment fetcher

Implement backend/app/youtube.py:

## Must do
- Extract video_id from:
  - youtube.com/watch?v=ID
  - youtu.be/ID
  - youtube.com/shorts/ID
  - youtube.com/embed/ID

- Fetch comments with YouTube Data API v3:
  GET https://www.googleapis.com/youtube/v3/commentThreads
  params:
    part=snippet
    videoId=VIDEO_ID
    maxResults=100
    textFormat=plainText
    key=API_KEY
    pageToken=... (optional)

- Loop pages until reach max_comments.

## Returned per comment
- comment_id
- authorDisplayName
- publishedAt
- textDisplay (plainText)

## Edge cases
- Comments disabled
- Video not found
- Quota exceeded
- Network error -> retry 1-2 lần backoff
