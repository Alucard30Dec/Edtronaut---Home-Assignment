import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/states/ErrorState';
import { CodeEditorPanel } from '@/components/editor/CodeEditorPanel';
import { ExecutionTabs } from '@/components/execution/ExecutionTabs';
import { TopHeader } from '@/components/layout/TopHeader';
import { ModuleSidebar } from '@/components/sidebar/ModuleSidebar';
import { ProblemPanel } from '@/components/sidebar/ProblemPanel';
import { ResourcePanel } from '@/components/sidebar/ResourcePanel';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError, checkHealth, createCodeSession, getExecution, runCodeSession } from '@/lib/api';
import { useDebouncedAutosave } from '@/hooks/useDebouncedAutosave';
import type { ExecutionHistoryItem, ExecutionInfo, ExecutionStatus, SessionInfo } from '@/types/api';

const INITIAL_TEMPLATE = `# AI Job Simulation: Backend Reliability Check\n\ndef solve():\n    message = 'Hello World'\n    print(message)\n\n\nif __name__ == '__main__':\n    solve()\n`;

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.detail || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error occurred.';
}

function isExecutionActive(status: ExecutionStatus | null) {
  return status === 'QUEUED' || status === 'RUNNING';
}

export function AppShell() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [code, setCode] = useState(INITIAL_TEMPLATE);
  const [notes, setNotes] = useState('');
  const [sessionBootstrapping, setSessionBootstrapping] = useState(true);
  const [sessionBootError, setSessionBootError] = useState<string | null>(null);

  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [activeExecutionStatus, setActiveExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryItem[]>([]);
  const [executionRequestError, setExecutionRequestError] = useState<string | null>(null);
  const sessionInitializedRef = useRef(false);
  const terminalToastKeyRef = useRef<string | null>(null);

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
      const createdSession = await createSession(INITIAL_TEMPLATE);
      const nextCode = createdSession.sourceCode || INITIAL_TEMPLATE;
      setSession(createdSession);
      setCode(nextCode);
      autosave.resetBaseline(nextCode);
      toast.success('Simulation session started.');
    } catch (error) {
      const message = getErrorMessage(error);
      setSessionBootError(message);
      toast.error(message);
    } finally {
      setSessionBootstrapping(false);
    }
  }, [autosave.resetBaseline, createSession]);

  useEffect(() => {
    if (sessionInitializedRef.current) {
      return;
    }
    sessionInitializedRef.current = true;
    void startSession();
  }, [startSession]);

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!session) {
        throw new Error('Session is not ready.');
      }

      if (autosave.isDirty) {
        const saved = await autosave.saveNow(code);
        if (saved) {
          setSession(saved);
        }
      }

      return runCodeSession(session.sessionId);
    },
    onSuccess: (runData) => {
      setExecutionRequestError(null);
      setActiveExecutionId(runData.executionId);
      setActiveExecutionStatus(runData.status);
      const now = new Date().toISOString();
      setExecutionHistory((previous) => {
        const next: ExecutionHistoryItem = {
          executionId: runData.executionId,
          status: runData.status,
          timestamp: now,
        };
        return [next, ...previous.filter((item) => item.executionId !== runData.executionId)].slice(0, 20);
      });
      toast.success('Execution queued. Polling for result...');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setExecutionRequestError(message);
      toast.error(message);
    },
  });

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

    const nextExecution = executionQuery.data;
    setActiveExecutionStatus(nextExecution.status);
    setExecutionRequestError(null);
    setExecutionHistory((previous) => {
      const next: ExecutionHistoryItem = {
        executionId: nextExecution.executionId,
        status: nextExecution.status,
        executionTimeMs: nextExecution.executionTimeMs,
        timestamp: new Date().toISOString(),
      };

      return [next, ...previous.filter((item) => item.executionId !== nextExecution.executionId)].slice(0, 20);
    });

    const terminal = nextExecution.status === 'COMPLETED' || nextExecution.status === 'FAILED' || nextExecution.status === 'TIMEOUT';
    const toastKey = `${nextExecution.executionId}:${nextExecution.status}`;

    if (terminal && terminalToastKeyRef.current !== toastKey) {
      terminalToastKeyRef.current = toastKey;
      if (nextExecution.status === 'COMPLETED') {
        toast.success('Execution completed successfully.');
      } else if (nextExecution.status === 'TIMEOUT') {
        toast.warning('Execution timed out.');
      } else {
        toast.error('Execution failed. Review stderr for details.');
      }
    }
  }, [executionQuery.data]);

  useEffect(() => {
    if (executionQuery.error) {
      const message = getErrorMessage(executionQuery.error);
      setExecutionRequestError(message);
    }
  }, [executionQuery.error]);

  const handleRun = useCallback(async () => {
    await runMutation.mutateAsync();
  }, [runMutation]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== 'Enter') {
        return;
      }

      if (runMutation.isPending || !session || isExecutionActive(activeExecutionStatus)) {
        return;
      }

      event.preventDefault();
      void handleRun();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeExecutionStatus, handleRun, runMutation.isPending, session]);

  const backendHealth = useMemo<'online' | 'offline' | 'checking'>(() => {
    if (healthQuery.isPending) {
      return 'checking';
    }
    return healthQuery.isError ? 'offline' : 'online';
  }, [healthQuery.isError, healthQuery.isPending]);

  const activeExecution: ExecutionInfo | null = executionQuery.data ?? null;
  const running = isExecutionActive(activeExecutionStatus);
  const runDisabled = !session || runMutation.isPending || running || sessionBootstrapping;

  if (!session && sessionBootstrapping) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-app-surface p-6'>
        <Card className='w-full max-w-lg'>
          <CardContent className='flex min-h-52 flex-col items-center justify-center gap-4 fade-in-up'>
            <Loader2 className='h-6 w-6 animate-spin text-primary' />
            <div className='space-y-1 text-center'>
              <h2 className='text-lg font-semibold'>Preparing your simulation workspace</h2>
              <p className='text-sm text-muted-foreground'>Creating a live coding session and loading editor context.</p>
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
            title='Unable to start coding session'
            description={sessionBootError}
            actionLabel='Retry Start Session'
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
        runLoading={runMutation.isPending || running}
        progressLabel='Step 3 of 5 · Execute & Validate'
      />

      <div className='mx-auto grid max-w-[1800px] grid-cols-1 gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]'>
        <aside className='order-2 fade-in-up xl:order-1' style={{ animationDelay: '50ms' }}>
          <ModuleSidebar sessionReady={Boolean(session)} />
        </aside>

        <main className='order-1 flex min-h-[calc(100vh-7.5rem)] flex-col gap-4 fade-in-up xl:order-2' style={{ animationDelay: '90ms' }}>
          <ProblemPanel />
          <CodeEditorPanel
            code={code}
            language='python'
            autosaveState={autosave.autosaveState}
            onCodeChange={setCode}
            onLanguageChange={() => undefined}
          />
          <ExecutionTabs
            execution={activeExecution}
            history={executionHistory}
            isPolling={running}
            requestErrorMessage={executionRequestError}
          />
        </main>

        <aside className='order-3 fade-in-up' style={{ animationDelay: '130ms' }}>
          <ResourcePanel notes={notes} onNotesChange={setNotes} />
        </aside>
      </div>
    </div>
  );
}
