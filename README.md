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

## Execution Lifecycle (Phase 4)
- `POST /code-sessions/{session_id}/run` creates an execution row first with status `QUEUED`, then enqueues a background RQ job.
- `GET /executions/{execution_id}` returns the latest persisted execution state and output fields.
- Lifecycle states stay aligned with: `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `TIMEOUT`.
- `source_code_snapshot` is stored to preserve the exact source submitted at run-time, so later edits in the session do not alter execution history.

## Execution Worker and Isolation Strategy (Phase 5)
- RQ worker entrypoint: `python -m app.workers.rq_worker`.
- Worker flow: load execution -> atomically move `QUEUED` to `RUNNING` -> execute Python code -> persist `COMPLETED` / `FAILED` / `TIMEOUT`.
- Duplicate processing is reduced by an atomic status transition (`QUEUED` only). If a job was already taken, later workers skip it.
- Runner executes Python source with `subprocess`, captures `stdout`/`stderr`, and enforces timeout.
- Memory limit is best-effort via `RLIMIT_AS` on POSIX environments; it may not apply in all platforms.
- `source_code_snapshot` is executed instead of mutable session source to keep each run reproducible and auditable.
- MVP caveat: this is not a production-grade sandbox. It does not provide strong multi-tenant isolation against malicious code.
- Production caveat: use container/VM isolation, stricter syscall/network controls, hardened resource governance, and dedicated sandbox infra.

## Reliability (Phase 6)
- Lifecycle logging is added for key transitions (`queued`, `running`, `finished`, `retry_queued`, `skip_nonqueued`).
- Execution transitions are explicit and timestamped (`queued_at`, `started_at`, `finished_at`).
- Retry policy is intentionally narrow: only transient runner infrastructure outcomes are retried, with a small retry cap.

## Idempotency (Phase 6)
- Worker processing uses an atomic transition `QUEUED -> RUNNING`.
- Duplicate jobs that see non-`QUEUED` state are skipped and logged instead of re-running completed work.

## Failure Handling (Phase 6)
- User code failures are persisted as `FAILED` with captured stderr/output and without retries.
- Timeouts are persisted as `TIMEOUT` and are not retried by default.
- Infrastructure/runner failures are distinguished from user failures and may be re-queued up to `EXECUTION_INFRA_MAX_RETRIES`.
- If retry enqueue itself fails, the execution is finalized as `FAILED` with an infrastructure error message.

## Safety and Abuse Protection (Phase 6)
- Language allowlist is enforced at execution request time (`EXECUTION_ALLOWED_LANGUAGES`).
- Source size limit is enforced before queueing (`EXECUTION_MAX_SOURCE_SIZE_BYTES`).
- Minimal run-frequency protection is enforced per session (`EXECUTION_MIN_INTERVAL_SECONDS`).
- MVP caveat: this is only a baseline safety layer; robust auth/rate limiting and stronger isolation should be added for production.

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
