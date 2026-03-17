import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/states/ErrorState';
import { CodeEditorPanel } from '@/components/editor/CodeEditorPanel';
import { ExecutionTabs } from '@/components/execution/ExecutionTabs';
import {
  TestcasePanel,
  type TestCaseResult,
} from '@/components/execution/TestcasePanel';
import { TopHeader } from '@/components/layout/TopHeader';
import { ProblemPanel } from '@/components/sidebar/ProblemPanel';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError, checkHealth, createCodeSession, getCodeSession, getExecution, runCodeSession } from '@/lib/api';
import { useDebouncedAutosave } from '@/hooks/useDebouncedAutosave';
import { useLanguage } from '@/lib/language';
import type { ExecutionHistoryItem, ExecutionInfo, ExecutionStatus, SessionInfo } from '@/types/api';

const INITIAL_TEMPLATE = `import math


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    if n == 2:
        return True
    if n % 2 == 0:
        return False

    limit = math.isqrt(n)
    for i in range(3, limit + 1, 2):
        if n % i == 0:
            return False
    return True


def solve() -> None:
    n = int(input().strip())
    print('YES' if is_prime(n) else 'NO')


if __name__ == '__main__':
    solve()
`;

const PRIME_TEST_CASES = [
  { index: 1, input: '2', expectedOutput: 'YES' },
  { index: 2, input: '4', expectedOutput: 'NO' },
  { index: 3, input: '17', expectedOutput: 'YES' },
  { index: 4, input: '1', expectedOutput: 'NO' },
  { index: 5, input: '999983', expectedOutput: 'YES' },
] as const;

const EXECUTION_POLL_INTERVAL_MS = 1_000;
const EXECUTION_POLL_TIMEOUT_MS = 25_000;
const RUN_REQUEST_GAP_MS = 1_100;
const SESSION_STORAGE_KEY = 'live_code_session_id';

function createInitialTestCaseResults(): Record<number, TestCaseResult> {
  return PRIME_TEST_CASES.reduce<Record<number, TestCaseResult>>((accumulator, testCase) => {
    accumulator[testCase.index] = { status: 'NOT_RUN' };
    return accumulator;
  }, {});
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error.detail || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function isExecutionActive(status: ExecutionStatus | null) {
  return status === 'QUEUED' || status === 'RUNNING';
}

function isExecutionTerminal(status: ExecutionStatus) {
  return status === 'COMPLETED' || status === 'FAILED' || status === 'TIMEOUT';
}

function normalizeOutput(value: string) {
  return value.replace(/\r\n/g, '\n').trim();
}

function readStoredSessionId() {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
  return stored && stored.trim() ? stored.trim() : null;
}

function storeSessionId(sessionId: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
}

function clearStoredSessionId() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function sleep(durationMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export function AppShell() {
  const { t, language } = useLanguage();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [code, setCode] = useState(INITIAL_TEMPLATE);
  const [sessionBootstrapping, setSessionBootstrapping] = useState(true);
  const [sessionBootError, setSessionBootError] = useState<string | null>(null);

  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [activeExecutionStatus, setActiveExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryItem[]>([]);
  const [executionRequestError, setExecutionRequestError] = useState<string | null>(null);
  const [judgeRunning, setJudgeRunning] = useState(false);
  const [testcaseResults, setTestcaseResults] = useState<Record<number, TestCaseResult>>(() =>
    createInitialTestCaseResults(),
  );
  const sessionInitializedRef = useRef(false);

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 15_000,
  });

  const autosave = useDebouncedAutosave({
    session,
    sourceCode: code,
    enabled: Boolean(session),
    onSaved: (savedSession) => {
      setSession(savedSession);
      storeSessionId(savedSession.sessionId);
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: createCodeSession,
  });
  const createSession = createSessionMutation.mutateAsync;

  const startSession = useCallback(async () => {
    setSessionBootstrapping(true);
    setSessionBootError(null);

    try {
      const storedSessionId = readStoredSessionId();
      if (storedSessionId) {
        try {
          const resumedSession = await getCodeSession(storedSessionId);
          const resumedCode = resumedSession.sourceCode || INITIAL_TEMPLATE;
          setSession(resumedSession);
          setCode(resumedCode);
          autosave.resetBaseline(resumedCode);
          storeSessionId(resumedSession.sessionId);
          setSessionBootstrapping(false);
          return;
        } catch (error) {
          if (error instanceof ApiError && error.status === 404) {
            clearStoredSessionId();
          } else {
            throw error;
          }
        }
      }

      const createdSession = await createSession(INITIAL_TEMPLATE);
      const nextCode = createdSession.sourceCode || INITIAL_TEMPLATE;
      setSession(createdSession);
      setCode(nextCode);
      autosave.resetBaseline(nextCode);
      storeSessionId(createdSession.sessionId);
      toast.success(t.appShell.sessionStarted);
    } catch (error) {
      const message = getErrorMessage(error, t.appShell.unexpectedError);
      setSessionBootError(message);
      toast.error(message);
    } finally {
      setSessionBootstrapping(false);
    }
  }, [autosave.resetBaseline, createSession, t.appShell.sessionStarted, t.appShell.unexpectedError]);

  useEffect(() => {
    if (sessionInitializedRef.current) {
      return;
    }
    sessionInitializedRef.current = true;
    void startSession();
  }, [startSession]);

  const executionQuery = useQuery({
    queryKey: ['execution', activeExecutionId],
    queryFn: async () => getExecution(activeExecutionId as string),
    enabled: Boolean(activeExecutionId),
    refetchInterval: isExecutionActive(activeExecutionStatus) ? 1_000 : false,
  });

  useEffect(() => {
    if (!executionQuery.data) {
      return;
    }

    setActiveExecutionStatus(executionQuery.data.status);
    setExecutionRequestError(null);
  }, [executionQuery.data]);

  useEffect(() => {
    if (executionQuery.error) {
      const message = getErrorMessage(executionQuery.error, t.appShell.unexpectedError);
      setExecutionRequestError(message);
    }
  }, [executionQuery.error, t.appShell.unexpectedError]);

  const waitForExecutionTerminal = useCallback(async (executionId: string): Promise<ExecutionInfo> => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < EXECUTION_POLL_TIMEOUT_MS) {
      const execution = await getExecution(executionId);
      setActiveExecutionStatus(execution.status);

      if (isExecutionTerminal(execution.status)) {
        return execution;
      }

      await sleep(EXECUTION_POLL_INTERVAL_MS);
    }

    throw new Error(
      language === 'vi'
        ? 'Hệ thống chấm quá thời gian chờ cho test case.'
        : 'Judging timed out while waiting for testcase execution.',
    );
  }, [language]);

  const runSingleTestCase = useCallback(
    async (sessionId: string, testCase: (typeof PRIME_TEST_CASES)[number]) => {
      try {
        const runData = await runCodeSession(sessionId, `${testCase.input}\n`);
        setActiveExecutionId(runData.executionId);
        setActiveExecutionStatus(runData.status);

        setTestcaseResults((previous) => ({
          ...previous,
          [testCase.index]: {
            ...(previous[testCase.index] ?? { status: 'RUNNING' }),
            status: 'RUNNING',
            executionId: runData.executionId,
          },
        }));

        setExecutionHistory((previous) => {
          const queuedItem: ExecutionHistoryItem = {
            executionId: runData.executionId,
            status: runData.status,
            timestamp: new Date().toISOString(),
          };
          return [queuedItem, ...previous.filter((item) => item.executionId !== runData.executionId)].slice(0, 20);
        });

        const execution = await waitForExecutionTerminal(runData.executionId);
        setActiveExecutionId(execution.executionId);
        setActiveExecutionStatus(execution.status);

        setExecutionHistory((previous) => {
          const finishedItem: ExecutionHistoryItem = {
            executionId: execution.executionId,
            status: execution.status,
            executionTimeMs: execution.executionTimeMs,
            timestamp: new Date().toISOString(),
          };
          return [finishedItem, ...previous.filter((item) => item.executionId !== execution.executionId)].slice(0, 20);
        });

        const actualOutput = normalizeOutput(execution.stdout ?? '');
        const expectedOutput = normalizeOutput(testCase.expectedOutput);
        const fallbackOutput = normalizeOutput(execution.stderr ?? '');
        const isPassed = execution.status === 'COMPLETED' && actualOutput === expectedOutput;

        setTestcaseResults((previous) => ({
          ...previous,
          [testCase.index]: {
            status: isPassed ? 'PASS' : 'FAIL',
            actualOutput: actualOutput || fallbackOutput || '-',
            executionId: execution.executionId,
            note: isPassed
              ? undefined
              : execution.status === 'COMPLETED'
                ? `Expected: ${expectedOutput}`
                : execution.errorMessage || fallbackOutput || execution.status,
          },
        }));

        return isPassed;
      } catch (error) {
        const message = getErrorMessage(error, t.appShell.unexpectedError);
        setTestcaseResults((previous) => ({
          ...previous,
          [testCase.index]: {
            status: 'FAIL',
            actualOutput: '-',
            executionId: previous[testCase.index]?.executionId,
            note: message,
          },
        }));
        return false;
      }
    },
    [t.appShell.unexpectedError, waitForExecutionTerminal],
  );

  const handleRun = useCallback(async () => {
    if (!session || judgeRunning) {
      return;
    }

    setExecutionRequestError(null);
    setTestcaseResults(
      PRIME_TEST_CASES.reduce<Record<number, TestCaseResult>>((accumulator, testCase) => {
        accumulator[testCase.index] = { status: 'RUNNING', actualOutput: '', executionId: undefined, note: undefined };
        return accumulator;
      }, {}),
    );
    setJudgeRunning(true);

    try {
      let sessionIdForRun = session.sessionId;
      if (autosave.isDirty) {
        const saved = await autosave.saveNow(code);
        if (saved) {
          setSession(saved);
          sessionIdForRun = saved.sessionId;
        }
      }

      let passedCount = 0;
      for (const [index, testCase] of PRIME_TEST_CASES.entries()) {
        const passed = await runSingleTestCase(sessionIdForRun, testCase);
        if (passed) {
          passedCount += 1;
        }

        if (index < PRIME_TEST_CASES.length - 1) {
          await sleep(RUN_REQUEST_GAP_MS);
        }
      }

      const summaryMessage =
        language === 'vi'
          ? `Chấm xong: ${passedCount}/${PRIME_TEST_CASES.length} test case pass.`
          : `Judging complete: ${passedCount}/${PRIME_TEST_CASES.length} test cases passed.`;
      toast.success(summaryMessage);
    } catch (error) {
      const message = getErrorMessage(error, t.appShell.unexpectedError);
      setExecutionRequestError(message);
      toast.error(message);
    } finally {
      setJudgeRunning(false);
    }
  }, [
    autosave,
    code,
    judgeRunning,
    language,
    session,
    runSingleTestCase,
    t.appShell.unexpectedError,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') {
        return;
      }

      if (judgeRunning || !session || isExecutionActive(activeExecutionStatus)) {
        return;
      }

      event.preventDefault();
      void handleRun();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeExecutionStatus, handleRun, judgeRunning, session]);

  const backendHealth = useMemo<'online' | 'offline' | 'checking'>(() => {
    if (healthQuery.isPending) {
      return 'checking';
    }
    return healthQuery.isError ? 'offline' : 'online';
  }, [healthQuery.isError, healthQuery.isPending]);

  const activeExecution: ExecutionInfo | null = executionQuery.data ?? null;
  const running = isExecutionActive(activeExecutionStatus);
  const runDisabled = !session || judgeRunning || running || sessionBootstrapping;

  if (!session && sessionBootstrapping) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-app-surface p-6'>
        <Card className='w-full max-w-lg'>
          <CardContent className='flex min-h-52 flex-col items-center justify-center gap-4 fade-in-up'>
            <Loader2 className='h-6 w-6 animate-spin text-primary' />
            <div className='space-y-1 text-center'>
              <h2 className='text-lg font-semibold'>{t.appShell.sessionBootTitle}</h2>
              <p className='text-sm text-muted-foreground'>{t.appShell.sessionBootDescription}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session && sessionBootError) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-app-surface p-6'>
        <div className='w-full max-w-xl'>
          <ErrorState
            title={t.appShell.startSessionErrorTitle}
            description={sessionBootError}
            actionLabel={t.appShell.retryStartSession}
            onRetry={() => {
              void startSession();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-app-surface'>
      <TopHeader
        backendHealth={backendHealth}
        autosaveState={autosave.autosaveState}
        autosaveErrorMessage={autosave.autosaveErrorMessage}
        onRun={() => {
          void handleRun();
        }}
        runDisabled={runDisabled}
        runLoading={judgeRunning || running}
      />

      <div className='mx-auto max-w-[1600px] p-4'>
        <main className='grid min-h-[calc(100vh-7.5rem)] gap-4 xl:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)_minmax(340px,1fr)] fade-in-up'>
          <section className='order-1 xl:order-2 flex min-h-0 flex-col gap-4'>
            <ProblemPanel />
            <CodeEditorPanel
              code={code}
              language='python'
              autosaveState={autosave.autosaveState}
              onCodeChange={setCode}
              onLanguageChange={() => undefined}
            />
          </section>

          <section className='order-3 xl:order-1 xl:sticky xl:top-20 h-fit'>
            <ExecutionTabs
              execution={activeExecution}
              history={executionHistory}
              isPolling={running}
              requestErrorMessage={executionRequestError}
            />
          </section>

          <aside className='order-2 xl:order-3'>
            <TestcasePanel testCases={PRIME_TEST_CASES} results={testcaseResults} />
          </aside>
        </main>
      </div>
    </div>
  );
}
