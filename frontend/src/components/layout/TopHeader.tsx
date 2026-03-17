import { Activity, ServerCog } from 'lucide-react';

import type { AutosaveState } from '@/hooks/useDebouncedAutosave';
import { AutosaveIndicator } from '@/components/execution/AutosaveIndicator';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { RunButton } from '@/components/execution/RunButton';
import { StatusBadge } from '@/components/execution/StatusBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/lib/language';

type TopHeaderProps = {
  backendHealth: 'online' | 'offline' | 'checking';
  autosaveState: AutosaveState;
  autosaveErrorMessage?: string | null;
  onRun: () => void;
  runDisabled: boolean;
  runLoading: boolean;
};

export function TopHeader({
  backendHealth,
  autosaveState,
  autosaveErrorMessage,
  onRun,
  runDisabled,
  runLoading,
}: TopHeaderProps) {
  const { t } = useLanguage();
  const healthStatus = backendHealth === 'online' ? 'ONLINE' : backendHealth === 'offline' ? 'OFFLINE' : 'CHECKING';

  return (
    <header className='sticky top-0 z-20 border-b bg-card/95 backdrop-blur'>
      <div className='mx-auto flex h-16 max-w-[1800px] items-center justify-between px-4'>
        <div className='flex items-center gap-4'>
          <div>
            <h1 className='text-base font-semibold'>{t.header.title}</h1>
          </div>
        </div>

        <div className='flex items-center gap-4'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2'>
                  <ServerCog className='h-4 w-4 text-muted-foreground' />
                  <StatusBadge status={healthStatus} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {backendHealth === 'online'
                  ? t.header.backendReachable
                  : backendHealth === 'offline'
                    ? t.header.backendNotReachable
                    : t.header.backendChecking}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <LanguageToggle />

          <div className='hidden items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2 sm:flex'>
            <Activity className='h-4 w-4 text-muted-foreground' />
            <AutosaveIndicator state={autosaveState} errorMessage={autosaveErrorMessage} />
          </div>

          <RunButton disabled={runDisabled} loading={runLoading} onClick={onRun} />
        </div>
      </div>
    </header>
  );
}
