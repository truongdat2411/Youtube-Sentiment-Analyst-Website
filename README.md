# YouTube Comment Sentiment Web App

Local web app to analyze YouTube comments with a 3-class sentiment model (`NEG`, `NEU`, `POS`).

## Prerequisites

- Python 3.10+
- Node.js 18+

## Project Structure

- `backend/`: FastAPI API + YouTube fetch + model inference
- `frontend/`: React + Vite + TypeScript UI
- `backend/models/best_model/model/`: local trained Hugging Face model files

## Backend Setup

1. Go to backend folder:

   ```bash
   cd backend
   ```

2. Create environment file from example:

   ```bash
   cp .env.example .env
   ```

3. Edit `backend/.env`:

   ```env
   YOUTUBE_API_KEY=your_youtube_data_api_v3_key
   MODEL_DIR=./models/best_model/model
   MAX_LEN=256
   BATCH_SIZE=64
   DATABASE_URL=postgresql+psycopg2://postgres:postgres123@localhost:5432/web_sentiment
   JWT_SECRET_KEY=change-this-secret-in-production
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   ```

4. Ensure the trained model is in:

   ```text
   backend/models/best_model/model/
   ```

5. Create virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

6. (Optional) Start PostgreSQL with Docker Compose from project root:

   ```bash
   docker compose up -d postgres
   ```

7. Run migrations:

   ```bash
   alembic upgrade head
   ```

   This creates 3 tables: `users`, `analysis_history`, `comments`

8. Run backend server:

   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

9. Quick check:

   ```bash
   curl http://localhost:8000/health
   ```

   Expected response:

   ```json
   { "status": "ok" }
   ```

## Frontend Setup

1. Open a new terminal and go to frontend:

   ```bash
   cd frontend
   ```

2. Install dependencies and run dev server:

   ```bash
   npm i
   npm run dev
   ```

3. Open:

   ```text
   http://localhost:5173
   ```

## API

### Health & Analysis

- `GET /health` - Server health check
- `POST /api/analyze` - Analyze YouTube comments (returns comments in response + saves to DB)

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user (Bearer token required)

### History

- `GET /api/history` - List analysis history (Bearer token required)
- `GET /api/history/{history_id}` - Get analysis summary (Bearer token required)
- `GET /api/history/{history_id}/comments` - Get analysed comments from DB (Bearer token required)
- `DELETE /api/history/{history_id}` - Delete analysis (Bearer token required)

### Request & Response

```json
{
  "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "max_comments": 200
}
```

Response example:

```json
{
  "video_id": "dQw4w9WgXcQ",
  "video_title": "Example title",
  "items": [
    {
      "comment_id": "abc123",
      "author": "User",
      "published_at": "2026-01-01T00:00:00Z",
      "text": "Great video!",
      "label": "POS",
      "probs": { "NEG": 0.01, "NEU": 0.09, "POS": 0.9 }
    }
  ]
}
```

## Database Schema

The system uses **3 normalized tables**:

### D1: `users` Table

- Stores user accounts for authentication
- Fields: `id`, `email`, `username`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`

### D2: `comments` Table (New)

- Stores individual comment records from YouTube with sentiment predictions
- Fields: `id`, `analysis_history_id` (FK), `comment_id`, `author`, `text`, `published_at`, `label`, `probs` (JSONB), `created_at`
- Indexes: `analysis_history_id`, `label` for fast filtering
- Enables querying comments by label, date range, etc.

### D3: `analysis_history` Table

- Stores analysis session metadata + aggregated statistics
- Fields: `id`, `user_id` (FK), `youtube_url`, `video_id`, `video_title`, `thumbnail_url`, `total_comments`, `neg_count`, `neu_count`, `pos_count`, `result_json`, `created_at`
- Tracks: total NEG/NEU/POS counts per analysis
- `result_json`: Contains full response for backward compatibility

**Relationship**: `users` (1) ← `analysis_history` (M) ← `comments` (M)

## Data Flow

1. User submits YouTube URL + max_comments via Frontend
2. Backend validates URL & extracts video_id
3. YouTube Data API v3 fetches comments (with pagination)
4. Text preprocessing (clean, truncate)
5. Model inference: Tokenize → Batch process → Softmax → Get label + probabilities
6. Save to DB:
   - Create `analysis_history` record with aggregated stats
   - Create individual `comment` records (N records per analysis)
7. Return `AnalyzeResponse` with items list
8. Frontend displays table + filters + charts + export CSV
9. User can query history and view comments:
   - `GET /api/history` - List past analyses
   - `GET /api/history/{id}/comments` - Get comments from DB (D2 table)

## Development Fallback

If `YOUTUBE_API_KEY` is missing, `POST /api/analyze` still runs model inference using a small hardcoded sample comment set and returns the same response schema.

## Usage Examples

### 1. Analyze YouTube Video

```bash
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "max_comments": 50
  }'
```

### 2. Get Analysis History (with auth)

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8000/api/history
```

### 3. Get Comments from Database

After an analysis is saved, retrieve comments from D2 table:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:8000/api/history/{history_id}/comments
```

Response:

```json
{
  "items": [
    {
      "id": 1,
      "comment_id": "abc123",
      "author": "User",
      "text": "Great video!",
      "published_at": "2026-01-01T00:00:00Z",
      "label": "POS",
      "probs": { "NEG": 0.01, "NEU": 0.09, "POS": 0.9 },
      "created_at": "2026-03-20T10:00:00Z"
    }
  ],
  "total": 50
}
```

## Troubleshooting

- Invalid URL:
  - Backend returns `400 Invalid YouTube URL`.
- Quota/rate limit exceeded:
  - Backend returns `429`.
- CORS issue:
  - Backend allows `http://localhost:5173`. Confirm frontend runs on that URL.
- Model not found / cannot load:
  - Verify `MODEL_DIR` and that model files exist in `backend/models/best_model/model/`.
- Database migration errors:
  - Ensure PostgreSQL is running: `docker compose up -d postgres`
  - Check `DATABASE_URL` in `.env`
  - Run `alembic upgrade head` to create all 3 tables (users, analysis_history, comments)
- Cannot get comments:
  - Verify migration ran successfully: `alembic current` should show latest revision
  - Endpoint `GET /api/history/{id}/comments` requires Bearer token
  - History must be saved with authentication (analysis created by authenticated user)
