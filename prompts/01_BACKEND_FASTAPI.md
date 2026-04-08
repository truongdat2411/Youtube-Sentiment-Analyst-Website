# PROMPT — Backend FastAPI (YouTube fetch + Sentiment inference)

Hãy viết backend FastAPI theo cấu trúc:
backend/app/
  main.py        # create app, CORS, include router, load model at startup
  api.py         # router /api/analyze + /health
  youtube.py     # parse video_id + call YouTube Data API v3 to fetch comments
  model.py       # load HF model from local folder + batch predict
  schemas.py     # Pydantic request/response schemas
  utils.py       # helpers: clean text, batching

## Constraints
- Không dùng database.
- Dùng httpx hoặc requests.
- Dùng pydantic models.
- Có backend/.env.example:
  - YOUTUBE_API_KEY=
  - MODEL_DIR=./models/best_model/model
  - MAX_LEN=256
  - BATCH_SIZE=64

## Endpoints
- POST /api/analyze: validate URL, fetch comments, predict, return response
- GET /health

## Robustness
- URL invalid -> 400
- Comments disabled -> 422
- API key thiếu -> 500
- Quota exceeded / rate limit -> 429 hoặc 503

## Output format
- label in {"NEG","NEU","POS"}
- probs in {"NEG":float,"NEU":float,"POS":float}
