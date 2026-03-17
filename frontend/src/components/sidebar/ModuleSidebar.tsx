import { CheckCircle2, CircleDashed, Flag, ListChecks } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/lib/language';

type ModuleSidebarProps = {
  sessionReady: boolean;
};

export function ModuleSidebar({ sessionReady }: ModuleSidebarProps) {
  const { t } = useLanguage();
  const [module1, module2, module3, module4] = t.modules.items;
  const modules = [
    { id: 'm1', title: module1, complete: true },
    { id: 'm2', title: module2, complete: true },
    { id: 'm3', title: module3, complete: false },
    { id: 'm4', title: module4, complete: false },
  ];

  return (
    <Card className='h-[calc(100vh-7.5rem)]'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-sm'>
          <ListChecks className='h-4 w-4' /> {t.modules.title}
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
            <h4 className='font-semibold'>{t.modules.contextTitle}</h4>
            <p className='text-muted-foreground'>{t.modules.contextDescription}</p>
            <div className='rounded-xl border bg-muted/40 p-3'>
              <div className='flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground'>
                <Flag className='h-3.5 w-3.5' /> {t.modules.objectiveTitle}
              </div>
              <p className='mt-2 text-sm'>{t.modules.objectiveDescription}</p>
            </div>
            <div className='rounded-xl border bg-muted/40 p-3'>
              <div className='text-xs font-semibold uppercase text-muted-foreground'>{t.modules.workspaceStatusTitle}</div>
              <p className='mt-2 text-sm'>
                {sessionReady
                  ? t.modules.workspaceReady
                  : t.modules.workspaceStarting}
              </p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
