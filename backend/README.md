# StudyAI Backend Service

FastAPI + SQLAlchemy 2.x + Alembic learning data persistence service for StudyAI.

## Features
- **Health check**: `/api/v1/health`
- **Lesson Progress API**: Range validation (0–80–100), idempotent upsert, conflict resolution (newer `updatedAt` wins, no 100% downgrade).
- **Assessment Attempts & Responses API**: SCORM-inspired metrics, multi-attempt tracking, non-downgrade completed status.
- **Learning Event Batch API**: Deduplicated event logging with client-generated event IDs.
- **Bootstrap Sync API**: Idempotent one-time synchronization from frontend localStorage.

## Local Development Setup

```bash
cd backend

# 1. Create and activate virtual environment
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux/macOS:
# source .venv/bin/activate

# 2. Install dependencies with development tools
pip install -e ".[dev]"

# 3. Create local data directory and run database migrations
mkdir data
alembic upgrade head

# 4. Start local development server
uvicorn app.main:app --reload --port 8000
```

- API Docs (Swagger UI): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/v1/health`

## Run Tests

```bash
pytest
```
