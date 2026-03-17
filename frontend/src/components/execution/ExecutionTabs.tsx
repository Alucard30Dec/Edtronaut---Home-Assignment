import { Clock3, Loader2, TerminalSquare } from 'lucide-react';

import { EmptyState } from '@/components/states/EmptyState';
import { StatusBadge } from '@/components/execution/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/lib/language';
import type { ExecutionHistoryItem, ExecutionInfo } from '@/types/api';

type ExecutionTabsProps = {
  execution: ExecutionInfo | null;
  history: ExecutionHistoryItem[];
  isPolling: boolean;
  requestErrorMessage?: string | null;
};

export function ExecutionTabs({ execution, history, isPolling, requestErrorMessage }: ExecutionTabsProps) {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between gap-3'>
          <CardTitle>{t.execution.title}</CardTitle>
          {execution ? (
            <div className='flex items-center gap-2'>
              <StatusBadge status={execution.status} />
              {typeof execution.executionTimeMs === 'number' ? (
                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                  <Clock3 className='h-3.5 w-3.5' /> {execution.executionTimeMs} ms
                </div>
              ) : null}
              {isPolling ? <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' /> : null}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!execution ? (
          <EmptyState
            title={t.execution.emptyTitle}
            description={t.execution.emptyDescription}
            icon={<TerminalSquare className='h-5 w-5 text-muted-foreground' />}
          />
        ) : (
          <Tabs defaultValue='status'>
            <TabsList>
              <TabsTrigger value='status'>{t.execution.tabStatus}</TabsTrigger>
              <TabsTrigger value='stdout'>{t.execution.tabStdout}</TabsTrigger>
              <TabsTrigger value='stderr'>{t.execution.tabStderr}</TabsTrigger>
              <TabsTrigger value='history'>{t.execution.tabHistory}</TabsTrigger>
            </TabsList>

            <TabsContent value='status'>
              <div className='grid gap-4 rounded-xl border bg-muted/40 p-4 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>{t.execution.executionId}</span>
                  <code className='code-font text-xs'>{execution.executionId}</code>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>{t.execution.currentStatus}</span>
                  <StatusBadge status={execution.status} />
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>{t.execution.executionTime}</span>
                  <span>{typeof execution.executionTimeMs === 'number' ? `${execution.executionTimeMs} ms` : '-'}</span>
                </div>
                {requestErrorMessage ? (
                  <p className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600'>
                    {requestErrorMessage}
                  </p>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value='stdout'>
              <ScrollArea className='h-52 rounded-xl border bg-muted/30 p-3'>
                <pre className='code-font whitespace-pre-wrap text-sm'>
                  {execution.stdout || t.execution.noStdout}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value='stderr'>
              <ScrollArea className='h-52 rounded-xl border bg-muted/30 p-3'>
                <pre className='code-font whitespace-pre-wrap text-sm text-red-700'>
                  {execution.stderr || t.execution.noStderr}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value='history'>
              <ScrollArea className='h-52 rounded-xl border'>
                <div className='space-y-2 p-3'>
                  {history.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>{t.execution.historyEmpty}</p>
                  ) : (
                    history.map((item) => (
                      <div key={item.executionId} className='flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm'>
                        <div>
                          <p className='font-medium'>{item.executionId}</p>
                          <p className='text-xs text-muted-foreground'>
                            {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          {typeof item.executionTimeMs === 'number' ? (
                            <span className='text-xs text-muted-foreground'>{item.executionTimeMs} ms</span>
                          ) : null}
                          <StatusBadge status={item.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
