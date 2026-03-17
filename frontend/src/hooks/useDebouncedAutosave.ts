import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { ApiError, autosaveCodeSession } from '@/lib/api';
import { useLanguage } from '@/lib/language';
import type { SessionInfo } from '@/types/api';

export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';

type UseDebouncedAutosaveProps = {
  session: SessionInfo | null;
  sourceCode: string;
  enabled: boolean;
  debounceMs?: number;
  onSaved: (session: SessionInfo) => void;
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error.detail || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export function useDebouncedAutosave({
  session,
  sourceCode,
  enabled,
  debounceMs = 1200,
  onSaved,
}: UseDebouncedAutosaveProps) {
  const { t } = useLanguage();
  const [state, setState] = useState<AutosaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const lastSavedCodeRef = useRef(sourceCode);

  const autosaveMutation = useMutation({
    mutationFn: async (codeToSave: string) => {
      if (!session) {
        throw new Error(t.appShell.sessionNotReady);
      }

      return autosaveCodeSession({
        sessionId: session.sessionId,
        language: 'python',
        sourceCode: codeToSave,
        version: session.version,
      });
    },
  });

  const persistNow = useCallback(
    async (codeToSave: string) => {
      if (!enabled || !session) {
        return null;
      }

      setState('saving');
      setErrorMessage(null);

      try {
        const savedSession = await autosaveMutation.mutateAsync(codeToSave);
        lastSavedCodeRef.current = codeToSave;
        setState('saved');
        onSaved(savedSession);
        return savedSession;
      } catch (error) {
        setState('error');
        setErrorMessage(getErrorMessage(error, t.autosave.failedTooltip));
        throw error;
      }
    },
    [autosaveMutation, enabled, onSaved, session, t.autosave.failedTooltip],
  );

  useEffect(() => {
    if (!enabled || !session) {
      return;
    }

    if (sourceCode === lastSavedCodeRef.current) {
      return;
    }

    setState('idle');
    const timer = window.setTimeout(() => {
      void persistNow(sourceCode);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, enabled, persistNow, session, sourceCode]);

  const isDirty = useMemo(() => sourceCode !== lastSavedCodeRef.current, [sourceCode]);

  const resetBaseline = useCallback((value: string) => {
    lastSavedCodeRef.current = value;
    setState('saved');
    setErrorMessage(null);
  }, []);

  return {
    autosaveState: state,
    autosaveErrorMessage: errorMessage,
    saveNow: persistNow,
    isDirty,
    resetBaseline,
  };
}
