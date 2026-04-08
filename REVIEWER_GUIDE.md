# Reviewer Guide - web_sentiment_class

## 1) Muc tieu du an
Ung dung web local de phan tich cam xuc binh luan YouTube (3 nhan: `NEG`, `NEU`, `POS`) bang model Hugging Face da fine-tune san.

## 2) Cau truc thu muc chinh
- `backend/`: FastAPI API, goi YouTube Data API, chay model inference.
- `frontend/`: React + Vite + TypeScript UI.
- `backend/models/best_model/model/`: model duoc backend load khi startup.
- `best_model/` va `best_model.zip`: ban model/tai nguyen tham khao o root.
- `prompts/`: dac ta bai toan va yeu cau tung phan.

## 3) Luong xu ly end-to-end
1. User nhap YouTube URL tren frontend.
2. Frontend goi `POST /api/analyze`.
3. Backend parse `video_id`.
4. Neu co `YOUTUBE_API_KEY`: fetch comment that tu YouTube API (co pagination + retry).
5. Neu thieu API key: backend dung sample comments de van test duoc pipeline.
6. Backend clean text, chay model theo batch, tra `label` + `probs`.
7. Frontend hien thi bang comment, filter, sort, thong ke chart va export CSV.

## 4) API backend
- `GET /health` -> `{"status":"ok"}`
- `POST /api/analyze`
  - Request:
    - `youtube_url` (string)
    - `max_comments` (1..500)
  - Response:
    - `video_id`, `video_title` (optional), `items[]`
    - Moi `item`: `comment_id`, `author`, `published_at`, `text`, `label`, `probs`

## 5) Cac file code can xem truoc
- Backend:
  - `backend/app/main.py`: app init, CORS, startup load model.
  - `backend/app/api.py`: `/health`, `/api/analyze`, timeout/error handling.
  - `backend/app/youtube.py`: parse URL, fetch comments, map loi YouTube.
  - `backend/app/model.py`: load HF model local, batch predict.
- Frontend:
  - `frontend/src/App.tsx`: trang chinh va luong submit/analyze.
  - `frontend/src/components/CommentTable.tsx`: render table/card comments.
  - `frontend/src/components/StatsCharts.tsx`: bieu do thong ke.
  - `frontend/src/components/ExportCSV.tsx`: export ket qua CSV.

## 6) Test hien co
- `frontend/tests/youtube.validation.test.ts`: validate URL YouTube.
- `frontend/tests/App.submit-flow.test.tsx`: submit flow, loading/error, filter/sort/export.
- `frontend/tests/e2e-browser-submit.mjs`: e2e bang Playwright (headless).

## 7) Cac diem reviewer nen luu y
- Backend load model 1 lan khi startup (`app.state.model_service`).
- Timeout va map loi da duoc xu ly o nhieu tang (`analyze`, fetch comments, inference).
- Frontend co validation URL truoc khi submit.
- CORS backend dang mo cho `http://localhost:5173`.
- Prompt `02_MODEL_INFERENCE.md` khong ton tai trong thu muc `prompts/` (chi co 00, 01, 03, 04, 05).
- `backend/.env.example` hien dang chua gia tri API key dang key-that; nen doi ve placeholder de an toan.
