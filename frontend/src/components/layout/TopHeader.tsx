import { Activity, Gauge, ServerCog } from 'lucide-react';

import type { AutosaveState } from '@/hooks/useDebouncedAutosave';
import { AutosaveIndicator } from '@/components/execution/AutosaveIndicator';
import { RunButton } from '@/components/execution/RunButton';
import { StatusBadge } from '@/components/execution/StatusBadge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type TopHeaderProps = {
  backendHealth: 'online' | 'offline' | 'checking';
  autosaveState: AutosaveState;
  autosaveErrorMessage?: string | null;
  onRun: () => void;
  runDisabled: boolean;
  runLoading: boolean;
  progressLabel: string;
};

export function TopHeader({
  backendHealth,
  autosaveState,
  autosaveErrorMessage,
  onRun,
  runDisabled,
  runLoading,
  progressLabel,
}: TopHeaderProps) {
  const healthStatus = backendHealth === 'online' ? 'ONLINE' : backendHealth === 'offline' ? 'OFFLINE' : 'CHECKING';

  return (
    <header className='sticky top-0 z-20 border-b bg-card/95 backdrop-blur'>
      <div className='mx-auto flex h-16 max-w-[1800px] items-center justify-between px-4'>
        <div className='flex items-center gap-4'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>AI Job Simulation Platform</p>
            <h1 className='text-base font-semibold'>Live Code Execution & Management</h1>
          </div>
          <div className='hidden items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs md:flex'>
            <Gauge className='h-3.5 w-3.5 text-muted-foreground' />
            {progressLabel}
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
                  ? 'Backend reachable'
                  : backendHealth === 'offline'
                    ? 'Backend not reachable'
                    : 'Checking backend health'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
