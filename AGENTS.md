Follow prompts in prompts/ in this order:
00_MASTER_PROMPT.md
01_BACKEND_FASTAPI.md
02_MODEL_INFERENCE.md
03_YOUTUBE_API.md
04_FRONTEND_REACT.md
05_README_AND_SETUP.md

Repo layout:
- backend/ FastAPI + inference + YouTube API
- frontend/ React UI
- backend/models/best_model/model contains the trained HF model. Do not modify model files.

Implement incrementally:
1) backend /health + load model
2) YouTube fetch comments
3) /api/analyze end-to-end
4) frontend UI
