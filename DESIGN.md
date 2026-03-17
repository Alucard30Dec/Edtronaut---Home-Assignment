# Design Overview

## Architecture Overview
- **API service (FastAPI):** accepts session and execution requests.
- **PostgreSQL:** stores sessions and execution records.
- **Redis + RQ:** queue and background execution dispatch.
- **Worker service:** consumes queue jobs and runs Python code via subprocess.

## End-to-End Request Flow
1. Client creates a code session via `POST /code-sessions`.
2. Client autosaves source via `PATCH /code-sessions/{session_id}`.
3. Client triggers run via `POST /code-sessions/{session_id}/run`.
4. API validates safety limits and stores an `executions` row with `QUEUED`.
5. API enqueues job to RQ and returns immediately (`execution_id`, `QUEUED`).
6. Worker atomically transitions `QUEUED -> RUNNING`.
7. Worker executes `source_code_snapshot` and persists terminal state/result.
8. Client polls `GET /executions/{execution_id}` for latest status/output.

## Data Model
- `code_sessions`
  - `id`, `language`, `template_code`, `current_source_code`, `status`, `version`, `created_at`, `updated_at`
- `executions`
  - `id`, `session_id`, `status`, `source_code_snapshot`, `stdout`, `stderr`, `error_message`, `execution_time_ms`, `retry_count`, `queued_at`, `started_at`, `finished_at`

## Execution Lifecycle
- States: `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `TIMEOUT`
- Worker logic:
  - claim queued record atomically
  - run Python subprocess with timeout (+ best-effort memory cap)
  - persist final state and captured outputs

## Idempotency
- Duplicate or delayed jobs do not re-run finished work.
- Worker updates rows only when current state is `QUEUED`.
- If state is already `RUNNING` or terminal, worker skips processing.

## Retry and Failure Handling
- Retry is only for transient infrastructure runner failures.
- User code errors are not retried and remain `FAILED`.
- Timeouts are marked `TIMEOUT` and are not retried by default.
- Retry attempts are capped by `EXECUTION_INFRA_MAX_RETRIES`.
- If queue enqueue fails after record creation, execution is immediately marked `FAILED` to avoid stuck `QUEUED` rows.

## Scalability
- Horizontal API scaling is straightforward (stateless API layer).
- Worker can scale horizontally by adding more consumers on same queue.
- Queue decouples request latency from execution latency.
- PostgreSQL and Redis can be upgraded to managed/distributed deployments.

## Trade-offs
- Current design favors clarity and MVP delivery over strong isolation.
- Polling for execution status is simpler than websockets/events.
- Minimal retry policy avoids runaway retries and hidden costs.
- Database setup currently uses `create_all` bootstrap for simplicity instead of migrations.

## Production Gaps
- No hard sandbox isolation (container/VM per execution not implemented).
- No auth/tenant isolation and no robust global rate limiting.
- No dedicated migration tool or schema versioning in this MVP.
- No deep observability stack (metrics/tracing/log shipping).
- No dead-letter queue and advanced retry backoff strategy.
