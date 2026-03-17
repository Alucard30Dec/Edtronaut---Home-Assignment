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
1. Create virtual environment
```bash
python -m venv .venv
source .venv/bin/activate
```
2. Install dependencies
```bash
pip install -r requirements.txt
```
3. Copy environment template
```bash
cp .env.example .env
```
4. Start API
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
5. Start worker (new terminal)
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

## Design Notes
See `DESIGN.md` for:
- architecture overview
- end-to-end request flow
- data model and lifecycle
- idempotency
- retry/failure strategy
- scalability, trade-offs, and production gaps

## MVP Caveat
Execution isolation is MVP-level. The subprocess runner is not a production-grade sandbox for hostile multi-tenant workloads.
