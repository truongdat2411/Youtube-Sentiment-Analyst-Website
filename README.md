# YouTube Comment Sentiment Analysis

He thong phan tich cam xuc binh luan YouTube theo huong production-ready: **FastAPI** + **PostgreSQL** + **PhoBERT (Transformers)** + **MLflow** + **Next.js** (dashboard) + **Docker**. **Nguoi dung** dang ky / dang nhap bang **JWT**; moi lan phan tich duoc **ghi lai trong lich su** (`analysis_history`).

## Muc luc

1. [Muc tieu du an](#1-muc-tieu-du-an)
2. [Cong nghe su dung](#2-cong-nghe-su-dung)
3. [Kien truc tong quan](#3-kien-truc-tong-quan)
4. [Cau truc thu muc](#4-cau-truc-thu-muc)
5. [Bien moi truong](#5-bien-moi-truong)
6. [Chay bang Docker](#6-huong-dan-chay-bang-docker-khuyen-nghi)
7. [Chay local (khong Docker)](#7-huong-dan-chay-local-khong-docker)
8. [API va dashboard](#8-api-va-dashboard)
9. [MLflow tracking](#9-mlflow-tracking)
10. [Kiem tra nhanh](#10-kiem-tra-nhanh)
11. [Troubleshooting](#11-troubleshooting)
12. [Dinh huong tiep theo](#12-dinh-huong-tiep-theo)

**Docker E2E:** xem [End-to-end voi Docker](#end-to-end-voi-docker) (muc 6).

---

## 1) Muc tieu du an

- **Dang ky / dang nhap** (email + mat khau, JWT Bearer token).
- **Lich su phan tich** theo tung tai khoan (snapshot breakdown moi lan goi API).
- Nhap URL video YouTube (sau khi da xac thuc).
- He thong trich xuat comments tu **YouTube Data API v3**.
- Tien xu ly van ban tieng Viet.
- Du doan nhan cam xuc: `positive`, `neutral`, `negative`.
- Luu ket qua vao PostgreSQL (`videos`, `comments`, `predictions`, `users`, `analysis_history`).
- Theo doi training/evaluation bang MLflow.
- Trinh bay ket qua tren **dashboard Next.js** (Tailwind CSS, UI kieu shadcn, Recharts, Framer Motion): **Home**, **Analysis** (can dang nhap), **Login**, **Register**, **History**.

## 2) Cong nghe su dung

| Tang | Cong nghe |
|------|-----------|
| API | FastAPI, Pydantic, Uvicorn; JWT (**python-jose**), mat khau **bcrypt** (**passlib**) |
| DB | PostgreSQL 16, SQLAlchemy async, Alembic |
| NLP | Hugging Face Transformers, PyTorch, PhoBERT (sentiment) |
| MLOps | MLflow (tracking + artifact) |
| Web | Next.js 15 (App Router), React 19, Tailwind CSS, Recharts, Framer Motion |
| DevOps | Docker Compose |

**Luu y:** Thu muc `frontend/streamlit_app.py` con trong repo (legacy, tuy chon); can **JWT** (sidebar hoac bien `AUTH_ACCESS_TOKEN`). Luong chinh la `web/`.

## 3) Kien truc tong quan

- `app/api/`: routers, endpoints, dependency injection (`app/api/deps.py`: JWT `get_current_active_user`)
- `app/services/`: ingestion, preprocessing, phan tich (orchestration)
- `app/repositories/`: truy cap du lieu
- `app/models/`: ORM SQLAlchemy
- `app/db/`: engine/session
- `app/ml/inference/`: tai model + pipeline inference
- `app/ml/tracking/`: tich hop MLflow
- `web/`: dashboard Next.js
- `alembic/`: migration

## 4) Cau truc thu muc

```text
.
├── app/
│   ├── api/
│   ├── core/
│   ├── db/
│   ├── ml/
│   │   ├── inference/
│   │   ├── tracking/
│   │   └── training/
│   ├── models/
│   ├── repositories/
│   ├── schemas/
│   ├── services/
│   └── utils/
├── alembic/
│   └── versions/
├── web/                      # Next.js dashboard
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/              # App Router: /, /analysis, /login, /register, /history
│       ├── components/
│       ├── lib/
│       └── types/
├── frontend/                 # Streamlit (legacy)
│   └── streamlit_app.py
├── scripts/                  # seed, register model, ...
├── tests/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt              # Cai dat local (co the co torch GPU tu PyPI)
├── requirements-docker.txt     # Chi backend image: khong torch; torch CPU cai trong Dockerfile
└── .env.example
```

## 5) Bien moi truong

Tao `.env` tu `.env.example`:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### Backend / DB / YouTube / MLflow

| Bien | Mo ta |
|------|--------|
| `APP_NAME`, `APP_ENV`, `APP_PORT`, `LOG_LEVEL` | Cau hinh ung dung |
| `DATABASE_URL` | PostgreSQL (asyncpg). Trong Compose: host `db`, cong `5432`. Chay backend tren may host: dung `localhost` + cong da publish (vi du `5432` hoac `5433`). |
| `YOUTUBE_API_KEY` | API key YouTube Data API v3 |
| `YOUTUBE_MAX_COMMENTS`, ... | Gioi han/trang thai API (xem `.env.example`) |
| `MLFLOW_TRACKING_URI`, `MLFLOW_EXPERIMENT_NAME`, `MLFLOW_REGISTERED_MODEL_NAME` | MLflow |
| `MODEL_NAME` | Mac dinh: `wonrax/phobert-base-vietnamese-sentiment` (**khong** dung `vinai/phobert-base` lam classifier 3 lop). |
| `MODEL_VERSION`, `MODEL_MAX_LENGTH`, `INFERENCE_BATCH_SIZE`, `MODEL_CACHE_DIR` | Tuy chon inference |

### Xac thuc JWT (backend)

| Bien | Mo ta |
|------|--------|
| `JWT_SECRET_KEY` | **Bat buoc doi** tren moi truong that (chuoi dai ngau nhien). Mac dinh trong `.env.example` chi cho dev. |
| `JWT_ALGORITHM` | Mac dinh `HS256`. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Mac dinh `10080` (~7 ngay). |

Trong **Docker Compose**, backend nhan `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` tu bien moi truong (xem `docker-compose.yml`).

### CORS va dashboard Next.js

| Bien | Mo ta |
|------|--------|
| `CORS_ORIGINS` | Danh sach origin (phay), vi du `http://localhost:3000,http://127.0.0.1:3000`. Bat buoc de trinh duyet goi API tu Next.js. |
| `NEXT_PUBLIC_API_BASE_URL` | Mac dinh nen la **`/api/v1`** (duong tuong doi): trinh duyet goi cung origin, Next **rewrite** sang FastAPI — tranh CORS va loi **Failed to fetch** khi mo dashboard bang IP. Chi dang URL tuyet doi `http://...:8000/api/v1` neu ban chac chan CORS da gom dung origin. |
| `API_PROXY_TARGET` | Chi dung khi Next rewrite: URL FastAPI phia **server** (Docker Compose: `http://backend:8000`; chay local: `http://127.0.0.1:8000`). Xem `web/next.config.ts`. |

## 6) Huong dan chay bang Docker (khuyen nghi)

**Yeu cau:** Docker Desktop hoac Docker Engine + Compose v2.

```bash
docker compose up --build
```

**Backend image:** Dockerfile cai **PyTorch CPU-only** (`download.pytorch.org/whl/cpu`) roi `requirements-docker.txt`, tranh ban CUDA + cuDNN hang gigabyte tu PyPI (thuong la nguyen nhan `pip` **exit code 2** khi het d dia Docker hoac timeout). Inference trong container la **CPU**. Cai dat Python tren may host van dung `pip install -r requirements.txt` (co the co torch GPU).

### Dich vu va cong

| Service | Mo ta | Cong host (mac dinh) |
|---------|--------|------------------------|
| `backend` | FastAPI + migration (code mount `./:/app`) | [http://localhost:8000](http://localhost:8000) — [Swagger](http://localhost:8000/docs) |
| `web` | Next.js dev (`./web:/app`, `npm run dev`) | [http://localhost:3000](http://localhost:3000) |
| `db` | PostgreSQL 16 | `localhost:5432` |
| `mlflow` | MLflow server (SQLite backend trong volume) | [http://localhost:5000](http://localhost:5000) |

`backend` phu thuoc `db` (healthy) va `mlflow`. `web` phu thuoc `backend` da **start** (khong cho healthy) de cong 3000 mo som; API co the can them vai giay sau khi backend healthy.

### End-to-end voi Docker

Luong day du tu may host: DB + MLflow + API + dashboard + phan tich mot video YouTube.

```mermaid
flowchart LR
  subgraph compose["docker compose"]
    DB[(PostgreSQL)]
    ML[MLflow]
    API[Backend FastAPI]
    FE[Next.js web]
  end
  Browser((Trinh duyet)) --> FE
  FE -->|HTTP API| API
  API --> DB
  API --> ML
  API -->|YouTube Data API| YT[(YouTube)]
```

#### Buoc 1 — Chuan bi

1. Cai **Docker Desktop** (Windows/macOS) hoac Docker Engine + Compose plugin (Linux); bat **WSL2** neu Windows khuyen nghi.
2. Mo terminal tai **thu muc goc repo** (noi co `docker-compose.yml`).
3. Tao `.env` neu chua co: `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`).
4. Trong `.env`, dat **`YOUTUBE_API_KEY`** = key that tu [Google Cloud Console](https://console.cloud.google.com/) (bat API **YouTube Data API v3**).
5. **JWT:** Tren moi truong that, dat **`JWT_SECRET_KEY`** manh trong `.env` (khong dung placeholder mac dinh).
6. **CORS / API URL cho trinh duyet** (thuong khong can sua neu chay local):
   - `CORS_ORIGINS` co `http://localhost:3000` (mac dinh trong `docker-compose.yml` da co them `127.0.0.1:3000`).
   - `NEXT_PUBLIC_API_BASE_URL=/api/v1` va `API_PROXY_TARGET=http://backend:8000` (mac dinh trong `docker-compose.yml`) — trinh duyet khong goi thang `localhost:8000`, tranh CORS.

#### Buoc 2 — Khoi dong stack

```bash
docker compose up --build
```

- Lan dau **image backend** build va **container `web`** chay `npm install` co the mat **vai phut**.
- Doi log backend co dang **healthy** (healthcheck goi `/api/v1/health`).
- Doi log `web` co dong kieu **Ready** / **compiled** cua Next.js dev server.

#### Buoc 3 — Migration database (tu dong voi Docker Compose)

**Mac dinh** (`docker-compose.yml`): moi lan container `backend` khoi dong se chay `alembic upgrade head` **truoc** `uvicorn`, nen schema (`videos`, `comments`, `predictions`, `users`, `analysis_history`) duoc cap nhat **tu dong**.

Neu ban **doi** `command` cua service `backend` (bo buoc Alembic), hay sau loi DB, chay tay:

```bash
docker compose exec backend alembic upgrade head
```

Revision chinh: `0001_init_schema` roi `0002_users_analysis_history`.

#### Buoc 4 — Kiem tra nhanh dich vu

| Kiem tra | URL / lenh |
|----------|------------|
| API health | Mo [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) hoac `curl http://localhost:8000/api/v1/health` |
| Swagger | [http://localhost:8000/docs](http://localhost:8000/docs) — **Authorize** Bearer JWT (lay token tu `POST /auth/login` hoac `POST /auth/register`). Sau do thu `POST /api/v1/analysis/comments`. |
| Dashboard | [http://localhost:3000](http://localhost:3000) |
| MLflow (tuy chon) | [http://localhost:5000](http://localhost:5000) |

#### Buoc 5 — Phan tich end-to-end qua UI

1. Mo **http://localhost:3000**.
2. **Dang ky** hoac **dang nhap** (menu ben phai header).
3. Tu **Home** nhap **URL video YouTube** hoac vao **Dashboard / Analysis** (video co bat binh luan; mot so video tat comment se khong co du lieu).
4. Chay **Phan tich**. Neu chua dang nhap, ung dung chuyen toi `/login?next=...`.
5. **Lan dau** backend tai model Hugging Face (`MODEL_NAME`) — co the **rat lau** va can **RAM / dung luong** du; xem log: `docker compose logs -f backend`.
6. Khi xong, dashboard hien **thumbnail, tieu de, luot xem / like / so comment**, **tong quan sentiment**, **bieu do**, **bang comment**. Mo **Lich su** (`/history`) de xem cac lan phan tich da luu.

#### Buoc 6 — Khi gap loi (goi y)

```bash
docker compose logs -f backend
docker compose logs -f web
```

- **502 / Failed to fetch:** uu tien `NEXT_PUBLIC_API_BASE_URL=/api/v1` + `API_PROXY_TARGET` dung host backend. Neu van dung URL `http://localhost:8000/...` tu trinh duyet thi `CORS_ORIGINS` phai khop **chinh xac** origin (localhost vs 127.0.0.1 vs IP LAN).
- **Loi DB / bang khong ton tai:** chay lai `docker compose exec backend alembic upgrade head`.
- **Het quota YouTube / key sai:** kiem tra key va quota trong Google Cloud.

#### Reset sach de chay E2E lai

```bash
docker compose down -v
docker compose up --build
```

Roi lap lai **Buoc 3** (migration) va thu lai UI.

### Map Postgres ra cong khac (vi du 5433)

Trong `docker-compose.yml`:

```yaml
db:
  ports:
    - "5433:5432"
```

Khi do tu may host ket noi bang `localhost:5433`; **trong** Compose backend van dung `db:5432` trong `DATABASE_URL` mac dinh.

### Dung stack

```bash
docker compose down
```

Xoa ca volume (reset DB + MLflow local):

```bash
docker compose down -v
```

## 7) Huong dan chay local (khong Docker)

### 7.1 Yeu cau

- **Python 3.11+**
- **Node.js 20+** (khuyen nghi 22 LTS cho dong bo voi image `web`)
- PostgreSQL dang chay (hoac chi chay DB bang Docker)

### 7.2 Cai dat backend

```bash
python -m venv .venv
source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
```

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 7.3 Migration

Dat `DATABASE_URL` trong `.env` dung `localhost` va cong Postgres tren may ban, vi du:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/youtube_sentiment
```

```bash
alembic upgrade head
```

Du lieu mau (tuy chon):

```bash
python scripts/seed_database.py
```

### 7.4 Chay API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 7.5 Chay dashboard Next.js

```bash
cd web
npm install
npm run dev
```

Mo [http://localhost:3000](http://localhost:3000).

- Dat `CORS_ORIGINS` trong `.env` cua backend co origin Next (vd `http://localhost:3000`) — bat buoc neu trinh duyet goi **thang** FastAPI; neu dung rewrite `/api/v1` thi it phu thuoc hon.
- Khuyen nghi: tao `web/.env.local` (xem `web/.env.example`):

```env
API_PROXY_TARGET=http://127.0.0.1:8000
NEXT_PUBLIC_API_BASE_URL=/api/v1
```

Build production (kiem tra CI):

```bash
cd web
npm run build
```

### 7.6 Streamlit (legacy, tuy chon)

Can **JWT**: sidebar nhap token (`POST /api/v1/auth/login`), hoac dat bien moi truong `AUTH_ACCESS_TOKEN` khi chay.

```bash
streamlit run frontend/streamlit_app.py --server.port 8501
```

## 8) API va dashboard

### Endpoint chinh

- `GET /api/v1/health` — suc khoe dich vu (khong can JWT)
- `POST /api/v1/auth/register` — body: `{ "email", "password", "full_name?" }` — tra ve `{ "access_token", "token_type": "bearer" }`
- `POST /api/v1/auth/login` — body: `{ "email", "password" }` — tra ve token nhu tren
- `GET /api/v1/auth/me` — header **`Authorization: Bearer <token>`** — thong tin user
- `POST /api/v1/analysis/comments` — **bat buoc Bearer JWT** — body: `{ "youtube_url": "<url hoac id video>" }` — dong thoi **tao ban ghi lich su** (`analysis_history`) cho user hien tai
- `GET /api/v1/analysis/history?skip=0&limit=50` — **Bearer JWT** — danh sach lich su phan tich (join metadata video)

Dashboard Next.js luu token trong **localStorage** (`sentiment_studio_access_token`) va gui header Authorization qua proxy `/api/v1/**`.

### Vi du curl — dang nhap roi phan tich (Git Bash / WSL / macOS / Linux)

```bash
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}' | jq -r '.access_token')

# Neu khong co jq: mo JSON tu auth/login va dat TOKEN="<paste access_token>"

curl -s -X POST "http://localhost:8000/api/v1/analysis/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"youtube_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

PowerShell (token luu bien roi goi Analyze):

```powershell
$body = @{ email = "you@example.com"; password = "your-password" } | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/auth/login" -ContentType "application/json" -Body $body
$token = $r.access_token
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/api/v1/analysis/comments" `
  -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" `
  -Body '{"youtube_url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### Response (tom tat)

Phan hoi phan tich gom (khong day du schema): metadata video (`title`, `thumbnail_url`, `view_count`, `like_count`, `comment_count_total`), `sentiment_breakdown`, danh sach comment kem nhan du doan (`sentiment`, `confidence`, ...). Dashboard Next doc cac truong nay o trang **Analysis**.

Neu thieu hoac sai JWT: **401** / **403** (Authorization). Tra loi validation FastAPI co the la mang `detail` (Swagger hien ro).

## 9) MLflow tracking

Module `app/ml/tracking/mlflow_tracking_service.py`: parameters, metrics, artifacts, dang ky model trong Model Registry.

Metric toi thieu: `accuracy`, `precision`, `recall`, `f1-score`.

**Phien ban:** `requirements*.txt` ghim `mlflow==2.13.0` de khop voi image `ghcr.io/mlflow/mlflow:v2.13.0` trong Compose. Neu client MLflow 3.x noi voi server 2.x, script dang ky model co the loi **404** tren endpoint `/logged-models`.

### Vi sao UI MLflow trong?

**Luong phan tich YouTube (API + dashboard) hien khong ghi gi vao MLflow.** Model inference lay truc tiep tu Hugging Face (`MODEL_NAME`); khong co buoc `log_experiment_run` / `register_model` trong `analysis_service`. MLflow trong repo duoc chuan bi cho **pipeline training** va script bootstrap — chu khong tu dong khi ban bam "Phan tich".

De **co it nhat mot model trong Model Registry** (kiem tra UI), chay (local venv, `MLFLOW_TRACKING_URI` trung voi server):

```bash
python scripts/register_dummy_model.py
```

Trong Docker (backend da `up`, MLflow dang chay):

```bash
docker compose exec backend python scripts/register_dummy_model.py
```

Sau do mo lai MLflow — tab **Experiments** se co run, **Models** se co ten mac dinh tu `MLFLOW_REGISTERED_MODEL_NAME` (vd `sentiment-model`).

## 10) Kiem tra nhanh

```bash
curl http://localhost:8000/api/v1/health
```

Ket qua ky vong (tom tat):

```json
{
  "status": "ok",
  "service": "YouTube Comment Sentiment Analysis",
  "environment": "development"
}
```

## 11) Troubleshooting

| Van de | Huong xu ly |
|--------|-------------|
| **401 / Not authenticated** khi Phan tich hoac `/analysis/history` | Dang nhap lai tren Next.js; kiem tra token trong localStorage. Voi curl/Swagger: gui header `Authorization: Bearer <access_token>` lay tu `/auth/login`. Dam bao `JWT_SECRET_KEY` khong doi giua lan phat token va lan verify (restart backend sau khi doi secret). |
| Next.js **Failed to fetch** / CORS | Dung rewrite: `NEXT_PUBLIC_API_BASE_URL=/api/v1`, `API_PROXY_TARGET` toi FastAPI. Tranh de `NEXT_PUBLIC` la `http://localhost:8000/...` roi mo site bang IP khac. Neu goi thang API: `CORS_ORIGINS` phai co dung origin (scheme + host + cong). |
| Bien Next khong an | Voi `npm run dev`, dat `web/.env.local` va khoi dong lai dev server. |
| `failed to resolve host 'db'` khi chay backend tren may host | `DATABASE_URL` dang dung host Docker. Doi thanh `localhost` + cong Postgres tren host. |
| YouTube API loi | Kiem tra `YOUTUBE_API_KEY`, quota API. |
| Migration / ket noi DB | Kiem tra Postgres chay, `DATABASE_URL`, cong map. |
| `Internal server error` khi Analyze | `docker compose logs -f backend`. Model: dung `wonrax/phobert-base-vietnamese-sentiment`; cap nhat `.env` roi `docker compose up -d --force-recreate backend`. |
| Alembic `value too long for type character varying(32)` | Revision khoi tao: `0001_init_schema`; tiep theo `0002_users_analysis_history` (users + analysis_history). Neu van revision cu: rebuild/restart backend, kiem tra mount `./:/app` va file trong `alembic/versions/`. |
| Docker build: `failed to solve: archive/tar: unknown file mode` hoac context ~GB (Windows) | Nguyen nhan thuong la **build context** chua `venv/`, `web/node_modules` (symlink). Repo da **loai** chung trong `.dockerignore` va Dockerfile chi `COPY` `app/`, `alembic/`, `alembic.ini`. Chay lai `docker compose build --no-cache backend`. Neu van loi: dat project tren o dia WSL2 native (`\\wsl$\...`) thay vi `C:\...` tuy chon. |
| Docker build: `pip install ... exit code: 2` | Thuong do **torch ban CUDA** tu PyPI (hang GB + nvidia-cudnn) — het d dia Docker / mang timeout. Image backend da chuyen sang **torch CPU** + `requirements-docker.txt`. Chay `docker compose build --no-cache backend`. Tang dung luong image trong Docker Desktop neu can. |
| Khong mo duoc `http://localhost:3000` (connection refused) | 1) `docker compose ps` — `web` co **Up** khong. 2) `docker compose logs web` — xem `npm install` / `next dev` co loi khong (lan dau can doi). 3) Dam bao cong 3000 khong bi app khac chiem (`netstat` / Resource Monitor). 4) Thu `http://127.0.0.1:3000`. 5) Neu `web` khong chay: truoc day `depends_on: service_healthy` co the chan mai — hien `web` chi cho `backend` **start**. |

## 12) Dinh huong tiep theo

- Test integration voi YouTube API key that.
- Training pipeline day du + tu dong register model tot nhat trong MLflow.
- Mo rong tai khoan: doi mat khau, refresh token, vai tro admin, xuat CSV tu lich su dashboard.
