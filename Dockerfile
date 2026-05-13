FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DEFAULT_TIMEOUT=300 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# PyTorch: chi dung ban CPU tu repo PyTorch (tranh torch + CUDA + cudnn ~1GB+ tu PyPI mac dinh).
COPY requirements-docker.txt /app/requirements-docker.txt
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r /app/requirements-docker.txt

# Chi copy phan backend can chay API (tranh COPY . keo venv/web vao neu .dockerignore loi)
COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic
COPY app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
