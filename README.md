# Live Code Execution & Management (Backend)

This repository contains the backend for the take-home assignment focused on secure live code execution and job management.

## Tech Stack
- Python
- FastAPI
- PostgreSQL
- Redis + RQ
- Docker + docker-compose

## Current Status (Bootstrap)
- Base FastAPI app scaffolded
- Package-oriented folder structure created
- Basic health-check endpoint available at `/health`

## Phase 2 Complete
- Environment-driven app/database settings are centralized in `app/core/config.py`.
- Example environment variables are documented in `.env.example`.
- SQLAlchemy foundation is in place with shared base metadata and DB session management in `app/db/`.
- Initial PostgreSQL-oriented models are added for `code_sessions` and `executions`, including `source_code_snapshot` for immutable run history.

## API (Phase 3)
- `POST /code-sessions`: create a new `ACTIVE` code session (MVP language: `python` only).
- `PATCH /code-sessions/{session_id}`: lightweight autosave for `current_source_code` with optimistic version check.

## Planned Milestones
1. Configuration management and environment loading
2. PostgreSQL schema and migrations setup
3. Redis + RQ worker wiring and queue lifecycle
4. Code execution workflow (submit, run, status, logs)
5. API validation, error handling, and test coverage
6. Containerization and local multi-service orchestration

## Quick Start
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then open `http://127.0.0.1:8000/health`.
