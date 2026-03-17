import { CheckCircle2, CircleDashed, Flag, ListChecks } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type ModuleSidebarProps = {
  sessionReady: boolean;
};

const modules = [
  { id: 'm1', title: 'Read Brief', complete: true },
  { id: 'm2', title: 'Implement Solution', complete: true },
  { id: 'm3', title: 'Run & Verify', complete: false },
  { id: 'm4', title: 'Submit Notes', complete: false },
];

export function ModuleSidebar({ sessionReady }: ModuleSidebarProps) {
  return (
    <Card className='h-[calc(100vh-7.5rem)]'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-sm'>
          <ListChecks className='h-4 w-4' /> Simulation Modules
        </CardTitle>
      </CardHeader>
      <CardContent className='h-[calc(100%-4.5rem)] p-0'>
        <ScrollArea className='h-full px-5 pb-5'>
          <div className='space-y-3'>
            {modules.map((module) => (
              <div key={module.id} className='rounded-xl border bg-muted/30 p-3'>
                <div className='flex items-center gap-2 text-sm font-medium'>
                  {module.complete ? (
                    <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                  ) : (
                    <CircleDashed className='h-4 w-4 text-muted-foreground' />
                  )}
                  {module.title}
                </div>
              </div>
            ))}
          </div>

          <Separator className='my-5' />

          <div className='space-y-3 text-sm'>
            <h4 className='font-semibold'>Simulation Context</h4>
            <p className='text-muted-foreground'>
              You are the backend engineer on a hiring platform team. The interviewer expects robust async execution,
              clean autosave, and traceable run history.
            </p>
            <div className='rounded-xl border bg-muted/40 p-3'>
              <div className='flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground'>
                <Flag className='h-3.5 w-3.5' /> Current objective
              </div>
              <p className='mt-2 text-sm'>
                Build a Python-first execution flow and show stable behavior under repeated runs and autosave updates.
              </p>
            </div>
            <div className='rounded-xl border bg-muted/40 p-3'>
              <div className='text-xs font-semibold uppercase text-muted-foreground'>Workspace status</div>
              <p className='mt-2 text-sm'>{sessionReady ? 'Session is active and ready to execute.' : 'Starting session...'}</p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
