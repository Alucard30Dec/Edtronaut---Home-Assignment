# Live Code Execution Demo UI

Thin demo frontend for the backend take-home assignment: **Live Code Execution & Management**.

This UI is intentionally scoped to showcase backend behavior clearly:
- create code session
- autosave editor changes
- trigger async execution
- poll execution result
- display status, stdout, stderr, execution time, and run history

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS
- shadcn-style UI components
- Monaco Editor
- TanStack Query
- lucide-react icons

## Run Locally

```bash
cd frontend
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

## Environment Variables

Create `frontend/.env` (or copy from `.env.example`):

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_ENABLE_MOCK_FALLBACK=false
```

- `VITE_API_BASE_URL`: backend API base URL
- `VITE_ENABLE_MOCK_FALLBACK`: if `true`, mock responses are used only when the backend is unreachable (network-level failure)

## Backend API Mapping

- Session bootstrap:
  - UI action: auto-start session on first load
  - API: `POST /code-sessions`
- Autosave:
  - UI action: debounce save while typing
  - API: `PATCH /code-sessions/{session_id}`
- Run code:
  - UI action: Run button or `Ctrl/Cmd + Enter`
  - API: `POST /code-sessions/{session_id}/run`
- Execution polling:
  - UI action: auto-poll every 1s while `QUEUED`/`RUNNING`
  - API: `GET /executions/{execution_id}`

## UI Architecture

- `src/components/layout/AppShell.tsx`: orchestration, session lifecycle, run flow, polling
- `src/lib/api.ts`: typed API client + response normalization
- `src/hooks/useDebouncedAutosave.ts`: debounce + save state machine
- `src/components/editor/*`: Monaco editor and toolbar
- `src/components/execution/*`: status, run button, output tabs, history
- `src/components/sidebar/*`: simulation context, brief, notes/resources

## Design Decisions & Trade-offs

- Desktop-first 3-column workspace to mirror a technical simulation flow.
- Polling (1 second) is used instead of WebSocket for MVP simplicity.
- Python is the only language in UI to match backend MVP scope.
- Mock mode is optional and strictly fallback for backend unavailability, not for masking API validation errors.
- This is a demo layer, not a full product surface (no auth, no grading, no unrelated modules).

## Backend Assumptions

- Backend exposes:
  - `POST /code-sessions`
  - `PATCH /code-sessions/{session_id}`
  - `POST /code-sessions/{session_id}/run`
  - `GET /executions/{execution_id}`
  - `GET /health`
- CORS is enabled for the frontend dev origin (`http://localhost:5173`).
