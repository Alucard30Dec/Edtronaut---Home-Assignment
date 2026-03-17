import { AlertCircle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';

import type { AutosaveState } from '@/hooks/useDebouncedAutosave';
import { useLanguage } from '@/lib/language';

type AutosaveIndicatorProps = {
  state: AutosaveState;
  errorMessage?: string | null;
};

export function AutosaveIndicator({ state, errorMessage }: AutosaveIndicatorProps) {
  const { t } = useLanguage();

  if (state === 'saving') {
    return (
      <div className='flex items-center gap-2 text-xs text-muted-foreground'>
        <Loader2 className='h-3.5 w-3.5 animate-spin' /> {t.autosave.saving}
      </div>
    );
  }

  if (state === 'saved') {
    return (
      <div className='flex items-center gap-2 text-xs text-emerald-700'>
        <CheckCircle2 className='h-3.5 w-3.5' /> {t.autosave.saved}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className='flex items-center gap-2 text-xs text-red-600' title={errorMessage ?? t.autosave.failedTooltip}>
        <AlertCircle className='h-3.5 w-3.5' /> {t.autosave.saveFailed}
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
      <Clock3 className='h-3.5 w-3.5' /> {t.autosave.waiting}
    </div>
  );
}
