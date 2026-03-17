import { AlertCircle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';

import type { AutosaveState } from '@/hooks/useDebouncedAutosave';

type AutosaveIndicatorProps = {
  state: AutosaveState;
  errorMessage?: string | null;
};

export function AutosaveIndicator({ state, errorMessage }: AutosaveIndicatorProps) {
  if (state === 'saving') {
    return (
      <div className='flex items-center gap-2 text-xs text-muted-foreground'>
        <Loader2 className='h-3.5 w-3.5 animate-spin' /> Saving...
      </div>
    );
  }

  if (state === 'saved') {
    return (
      <div className='flex items-center gap-2 text-xs text-emerald-700'>
        <CheckCircle2 className='h-3.5 w-3.5' /> Saved
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className='flex items-center gap-2 text-xs text-red-600' title={errorMessage ?? 'Autosave failed'}>
        <AlertCircle className='h-3.5 w-3.5' /> Save failed
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2 text-xs text-muted-foreground'>
      <Clock3 className='h-3.5 w-3.5' /> Waiting for changes
    </div>
  );
}
