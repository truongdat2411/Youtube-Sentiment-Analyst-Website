# PROMPT — README + Setup instructions

Write README.md:
1) Prerequisites: Python 3.10+; Node 18+
2) Backend .env from backend/.env.example:
   - YOUTUBE_API_KEY
   - MODEL_DIR=./models/best_model/model
3) Copy trained model:
   - backend/models/best_model/model/ (already prepared)
4) Run backend:
   - cd backend
   - python -m venv .venv && source .venv/bin/activate
   - pip install -r requirements.txt
   - uvicorn app.main:app --reload --port 8000
5) Run frontend:
   - cd frontend
   - npm i
   - npm run dev
6) Troubleshooting: invalid URL, quota exceeded, CORS, model not found
