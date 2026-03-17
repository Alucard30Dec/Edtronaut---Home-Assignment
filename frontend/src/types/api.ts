export type ExecutionStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

export interface SessionInfo {
  sessionId: string;
  status: string;
  language: 'python';
  sourceCode: string;
  version: number;
}

export interface ExecutionInfo {
  executionId: string;
  sessionId?: string;
  status: ExecutionStatus;
  stdout: string;
  stderr: string;
  errorMessage?: string;
  executionTimeMs?: number;
  queuedAt?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface ExecutionHistoryItem {
  executionId: string;
  status: ExecutionStatus;
  executionTimeMs?: number;
  timestamp: string;
}

export interface AutosavePayload {
  sessionId: string;
  language: 'python';
  sourceCode: string;
  version?: number;
}
