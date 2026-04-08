# MASTER PROMPT — YouTube Comment Sentiment Web App (Local Dev)

Bạn là Senior Fullstack Engineer + ML Engineer. Hãy xây dựng một website (local dev) có chức năng:
1) Người dùng nhập link YouTube
2) Backend lấy comment từ video
3) Backend chạy sentiment classification 3 lớp (NEG/NEU/POS) bằng mô hình HuggingFace đã fine-tune
4) Frontend hiển thị danh sách comment + nhãn + xác suất + filter

## Tech stack (bắt buộc)
- Frontend: React + Vite + TypeScript.
- Styling: Tailwind (ưu tiên) hoặc CSS modules.
- Backend: FastAPI (Python) + Uvicorn.
- Model inference: transformers + torch (load model local từ folder).
- Fetch comments: YouTube Data API v3 (dùng API key từ .env).

## Repo structure (bắt buộc)
root/
  backend/
    app/
      main.py
      api.py
      youtube.py
      model.py
      schemas.py
      utils.py
    requirements.txt
    .env.example
  frontend/
    src/
      App.tsx
      api.ts
      components/
    index.html
    vite.config.ts
    package.json
  prompts/
  README.md
  .gitignore

## API contract (bắt buộc)
POST /api/analyze
Request JSON:
{
  "youtube_url": "https://www.youtube.com/watch?v=....",
  "max_comments": 200
}
Response JSON:
{
  "video_id": "...",
  "video_title": "... (optional nếu lấy được)",
  "items": [
     {
       "comment_id": "...",
       "author": "...",
       "published_at": "...",
       "text": "...",
       "label": "POS|NEU|NEG",
       "probs": {"NEG":0.1,"NEU":0.2,"POS":0.7}
     }
  ]
}

GET /health -> { "status": "ok" }

## UX requirements (bắt buộc)
- Input URL + button Analyze
- Loading state + error state
- Bảng list comments: text, label badge, confidence/probs
- Filter theo label
- Export CSV (download client-side)

## ML requirements (bắt buộc)
- Load model 1 lần khi backend start (singleton).
- Batch inference (batch_size=32/64).
- max_length = 256
- Label mapping: NEG=0, NEU=1, POS=2
- Trả probs softmax.
- Device: cuda nếu có, không thì cpu.

## YouTube requirements (bắt buộc)
- Parse video_id từ:
  - youtube.com/watch?v=ID
  - youtu.be/ID
  - youtube.com/shorts/ID
  - youtube.com/embed/ID
- Dùng YouTube Data API commentThreads.list.
- Có pagination, dừng khi đủ max_comments.
- Handle: comments disabled / quota error / invalid URL.

## Run local (bắt buộc)
- Backend:
  - python -m venv .venv && source .venv/bin/activate
  - pip install -r requirements.txt
  - uvicorn app.main:app --reload --port 8000
- Frontend:
  - npm i
  - npm run dev (port 5173)
- Frontend gọi backend qua http://localhost:8000

## Deliverables
- Full working code cho backend + frontend
- README.md hướng dẫn setup API key + copy model folder + run
- Basic validation + error handling + CORS
