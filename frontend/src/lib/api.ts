import type { AutosavePayload, ExecutionInfo, ExecutionStatus, SessionInfo } from '@/types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000';
const ENABLE_MOCK_FALLBACK = String(import.meta.env.VITE_ENABLE_MOCK_FALLBACK).toLowerCase() === 'true';

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

type RawSessionResponse = {
  session_id?: string;
  id?: string | number;
  status?: string;
  language?: string;
  source_code?: string;
  current_source_code?: string;
  version?: number;
};

type RawRunResponse = {
  execution_id?: string | number;
  status?: ExecutionStatus;
};

type RawExecutionResponse = {
  execution_id?: string | number;
  id?: string | number;
  session_id?: string | number;
  status?: ExecutionStatus;
  stdout?: string | null;
  stderr?: string | null;
  error_message?: string | null;
  execution_time_ms?: number | null;
  queued_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof body === 'object' && body ? (body.detail as string | undefined) : undefined;
    throw new ApiError(detail || response.statusText || 'Request failed', response.status, detail);
  }

  return body as T;
}

function toSessionInfo(raw: RawSessionResponse): SessionInfo {
  const sessionId = String(raw.session_id ?? raw.id ?? '');
  return {
    sessionId,
    status: raw.status ?? 'ACTIVE',
    language: 'python',
    sourceCode: raw.source_code ?? raw.current_source_code ?? '',
    version: raw.version ?? 1,
  };
}

function toExecutionInfo(raw: RawExecutionResponse): ExecutionInfo {
  return {
    executionId: String(raw.execution_id ?? raw.id ?? ''),
    sessionId: raw.session_id !== undefined ? String(raw.session_id) : undefined,
    status: raw.status ?? 'FAILED',
    stdout: raw.stdout ?? '',
    stderr: raw.stderr ?? '',
    errorMessage: raw.error_message ?? undefined,
    executionTimeMs: raw.execution_time_ms ?? undefined,
    queuedAt: raw.queued_at,
    startedAt: raw.started_at ?? undefined,
    finishedAt: raw.finished_at ?? undefined,
  };
}

type MockExecution = ExecutionInfo & {
  createdAtMs: number;
  sourceCodeSnapshot: string;
};

const mockStore: {
  session: SessionInfo | null;
  executionCounter: number;
  executions: Map<string, MockExecution>;
} = {
  session: null,
  executionCounter: 0,
  executions: new Map(),
};

function withMockFallback<T>(fn: () => Promise<T>, fallback: () => Promise<T>) {
  return fn().catch((error) => {
    const backendUnavailable = error instanceof TypeError;

    if (!ENABLE_MOCK_FALLBACK || !backendUnavailable) {
      throw error;
    }
    return fallback();
  });
}

async function mockCreateSession(initialCode: string): Promise<SessionInfo> {
  const session: SessionInfo = {
    sessionId: 'mock-session-1',
    status: 'ACTIVE',
    language: 'python',
    sourceCode: initialCode,
    version: 1,
  };
  mockStore.session = session;
  return session;
}

async function mockAutosave(payload: AutosavePayload): Promise<SessionInfo> {
  if (!mockStore.session || mockStore.session.sessionId !== payload.sessionId) {
    throw new ApiError('Session not found in mock store.', 404);
  }

  mockStore.session = {
    ...mockStore.session,
    sourceCode: payload.sourceCode,
    version: mockStore.session.version + 1,
  };
  return mockStore.session;
}

async function mockRun(sessionId: string): Promise<{ executionId: string; status: ExecutionStatus }> {
  if (!mockStore.session || mockStore.session.sessionId !== sessionId) {
    throw new ApiError('Session not found in mock store.', 404);
  }

  mockStore.executionCounter += 1;
  const executionId = `mock-exec-${mockStore.executionCounter}`;
  const now = new Date().toISOString();
  mockStore.executions.set(executionId, {
    executionId,
    sessionId,
    status: 'QUEUED',
    stdout: '',
    stderr: '',
    createdAtMs: Date.now(),
    queuedAt: now,
    sourceCodeSnapshot: mockStore.session.sourceCode,
  });

  return { executionId, status: 'QUEUED' };
}

async function mockExecution(executionId: string): Promise<ExecutionInfo> {
  const entry = mockStore.executions.get(executionId);
  if (!entry) {
    throw new ApiError('Execution not found in mock store.', 404);
  }

  const elapsed = Date.now() - entry.createdAtMs;
  if (elapsed > 2_200) {
    entry.status = 'COMPLETED';
    entry.stdout = entry.sourceCodeSnapshot.includes('Hello')
      ? 'Hello World\\n'
      : 'Mock execution completed successfully.\\n';
    entry.executionTimeMs = 150;
    entry.finishedAt = new Date().toISOString();
  } else if (elapsed > 700) {
    entry.status = 'RUNNING';
    entry.startedAt = entry.startedAt ?? new Date().toISOString();
  }

  return {
    executionId: entry.executionId,
    sessionId: entry.sessionId,
    status: entry.status,
    stdout: entry.stdout,
    stderr: entry.stderr,
    errorMessage: entry.errorMessage,
    executionTimeMs: entry.executionTimeMs,
    queuedAt: entry.queuedAt,
    startedAt: entry.startedAt,
    finishedAt: entry.finishedAt,
  };
}

export async function checkHealth(): Promise<{ status: string }> {
  return withMockFallback(
    () => request<{ status: string }>('/health'),
    async () => ({ status: 'mock-online' }),
  );
}

export async function createCodeSession(initialCode: string): Promise<SessionInfo> {
  return withMockFallback(
    async () => {
      const raw = await request<RawSessionResponse>('/code-sessions', {
        method: 'POST',
        body: JSON.stringify({
          language: 'python',
          template_code: initialCode,
          current_source_code: initialCode,
        }),
      });
      return toSessionInfo(raw);
    },
    () => mockCreateSession(initialCode),
  );
}

export async function autosaveCodeSession(payload: AutosavePayload): Promise<SessionInfo> {
  return withMockFallback(
    async () => {
      const raw = await request<RawSessionResponse>(`/code-sessions/${payload.sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          language: payload.language,
          source_code: payload.sourceCode,
          current_source_code: payload.sourceCode,
          version: payload.version,
        }),
      });
      return toSessionInfo(raw);
    },
    () => mockAutosave(payload),
  );
}

export async function runCodeSession(
  sessionId: string,
): Promise<{ executionId: string; status: ExecutionStatus }> {
  return withMockFallback(
    async () => {
      const raw = await request<RawRunResponse>(`/code-sessions/${sessionId}/run`, {
        method: 'POST',
      });

      return {
        executionId: String(raw.execution_id ?? ''),
        status: raw.status ?? 'QUEUED',
      };
    },
    () => mockRun(sessionId),
  );
}

export async function getExecution(executionId: string): Promise<ExecutionInfo> {
  return withMockFallback(
    async () => {
      const raw = await request<RawExecutionResponse>(`/executions/${executionId}`);
      return toExecutionInfo(raw);
    },
    () => mockExecution(executionId),
  );
}
