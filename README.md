# Live Code Execution & Management (Backend)

Backend take-home project for asynchronous code execution management using FastAPI, PostgreSQL, Redis, and RQ.

## Stack
- Python 3.12
- FastAPI
- SQLAlchemy
- PostgreSQL
- Redis + RQ
- Docker + Docker Compose

## Project Layout
- `app/` application code
- `tests/` lightweight tests
- `Dockerfile` API/worker image build
- `docker-compose.yml` local multi-service setup
- `DESIGN.md` architecture and trade-offs

## Setup (Local, Without Docker)
Prerequisites:
- Python 3.12
- PostgreSQL (running and reachable from `DATABASE_URL`)
- Redis (running and reachable from `REDIS_URL`)

1. Create virtual environment
```bash
python -m venv .venv
source .venv/bin/activate
```
2. Install dependencies
```bash
pip install -r requirements.txt
```
This includes `httpx`, required by FastAPI `TestClient`-based API tests.
3. Copy environment template
```bash
cp .env.example .env
```
4. Start API
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
5. Initialize database tables (MVP bootstrap)
```bash
python -m app.db.init_db
```
6. Start worker (new terminal)
```bash
python -m app.workers.rq_worker
```

## Environment Variables
| Variable | Purpose | Default |
|---|---|---|
| `APP_NAME` | API title | `Live Code Execution & Management API` |
| `ENVIRONMENT` | Runtime environment | `development` |
| `DATABASE_URL` | SQLAlchemy DB URL | `postgresql+psycopg2://postgres:postgres@localhost:5432/live_exec` |
| `REDIS_URL` | Redis URL for RQ | `redis://localhost:6379/0` |
| `RQ_QUEUE_NAME` | Queue name | `code_execution` |
| `EXECUTION_TIMEOUT_SECONDS` | Per-run timeout | `5` |
| `EXECUTION_MEMORY_LIMIT_MB` | Best-effort memory cap | `128` |
| `PYTHON_RUNNER_EXECUTABLE` | Python binary used by runner | `python3` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated frontend origins allowed by API CORS | `http://localhost:5173,http://127.0.0.1:5173` |
| `EXECUTION_ALLOWED_LANGUAGES` | Allowed execution languages | `python` |
| `EXECUTION_MAX_SOURCE_SIZE_BYTES` | Max source snapshot size | `50000` |
| `EXECUTION_MIN_INTERVAL_SECONDS` | Min interval between runs per session | `1` |
| `EXECUTION_INFRA_MAX_RETRIES` | Infra retry cap | `1` |

## Run With Docker Compose
Start everything:
```bash
docker compose up --build
```

Services:
- API: `http://localhost:8000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

Stop and remove:
```bash
docker compose down
```

Notes:
- Compose startup runs `python -m app.db.init_db` for both API and worker before service startup.
- This project uses SQLAlchemy `create_all` for MVP setup (no migration tool yet).

## API Usage Example
1. Create session
```bash
curl -X POST http://localhost:8000/code-sessions \
  -H "Content-Type: application/json" \
  -d '{"language":"python","current_source_code":"print(\"hello\")"}'
```

2. Trigger execution
```bash
curl -X POST http://localhost:8000/code-sessions/1/run
```
If queue enqueue fails (for example Redis is unavailable), the API returns `503` and the created execution row is marked as `FAILED` with an error message.

3. Check execution status
```bash
curl http://localhost:8000/executions/1
```

## Manual Run Commands
- API only:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- Worker only:
```bash
python -m app.workers.rq_worker
```
- One-time DB table bootstrap:
```bash
python -m app.db.init_db
```

## Minimal Checks
```bash
python3 -m py_compile app/main.py app/workers/rq_worker.py app/workers/execution_worker.py
python3 -m unittest -v \
  tests/test_execution_policy.py \
  tests/test_python_runner.py \
  tests/test_code_sessions_api.py \
  tests/test_executions_api.py \
  tests/test_execution_service.py
```

## Design Notes
See `DESIGN.md` for:
- architecture overview
- end-to-end request flow
- data model and lifecycle
- idempotency
- retry/failure strategy
- scalability, trade-offs, and production gaps

## Frontend Demo UI
The thin React demo UI used to showcase session/autosave/run/polling flows is in [`frontend/`](frontend).
Run and environment instructions are documented in [`frontend/README.md`](frontend/README.md).

## MVP Caveat
Execution isolation is MVP-level. The subprocess runner is not a production-grade sandbox for hostile multi-tenant workloads.
