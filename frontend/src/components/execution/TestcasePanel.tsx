import { CheckCircle2, CircleDashed, Loader2, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/language';

export type TestCaseDefinition = {
  index: number;
  input: string;
  expectedOutput: string;
};

export type TestCaseResultStatus = 'NOT_RUN' | 'RUNNING' | 'PASS' | 'FAIL';

export type TestCaseResult = {
  status: TestCaseResultStatus;
  actualOutput?: string;
  executionId?: string;
  note?: string;
};

type TestcasePanelProps = {
  testCases: readonly TestCaseDefinition[];
  results: Record<number, TestCaseResult>;
};

export function TestcasePanel({ testCases, results }: TestcasePanelProps) {
  const { language } = useLanguage();

  const labels =
    language === 'vi'
      ? {
          title: '5 Test Case',
          summary: 'Đã pass',
          notRun: 'Chưa chạy',
          running: 'Đang chạy',
          pass: 'PASS',
          fail: 'NOT PASS',
          input: 'Input',
          expected: 'Expected',
          actual: 'Output',
        }
      : {
          title: '5 Test Cases',
          summary: 'Passed',
          notRun: 'Not run',
          running: 'Running',
          pass: 'PASS',
          fail: 'NOT PASS',
          input: 'Input',
          expected: 'Expected',
          actual: 'Output',
        };

  const passedCount = testCases.reduce((count, testCase) => {
    const result = results[testCase.index];
    return count + (result?.status === 'PASS' ? 1 : 0);
  }, 0);

  return (
    <Card className='h-fit xl:sticky xl:top-20'>
      <CardHeader className='space-y-2 pb-3'>
        <div className='flex items-center justify-between gap-2'>
          <CardTitle>{labels.title}</CardTitle>
          <Badge variant={passedCount === testCases.length ? 'success' : 'outline'}>
            {passedCount}/{testCases.length} {labels.summary}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-3'>
        {testCases.map((testCase) => {
          const result = results[testCase.index] ?? { status: 'NOT_RUN' as const };
          const actual = result.actualOutput && result.actualOutput.length > 0 ? result.actualOutput : '-';

          let badgeVariant: 'outline' | 'warning' | 'success' | 'danger' = 'outline';
          let badgeText = labels.notRun;
          let icon = <CircleDashed className='h-4 w-4 text-muted-foreground' />;

          if (result.status === 'RUNNING') {
            badgeVariant = 'warning';
            badgeText = labels.running;
            icon = <Loader2 className='h-4 w-4 animate-spin text-amber-700' />;
          } else if (result.status === 'PASS') {
            badgeVariant = 'success';
            badgeText = labels.pass;
            icon = <CheckCircle2 className='h-4 w-4 text-emerald-600' />;
          } else if (result.status === 'FAIL') {
            badgeVariant = 'danger';
            badgeText = labels.fail;
            icon = <XCircle className='h-4 w-4 text-red-600' />;
          }

          return (
            <div key={testCase.index} className='rounded-xl border bg-muted/30 p-3'>
              <div className='mb-2 flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-sm font-semibold'>
                  {icon}
                  <span>Test {testCase.index}</span>
                </div>
                <Badge variant={badgeVariant}>{badgeText}</Badge>
              </div>

              <div className='space-y-1 text-xs text-muted-foreground'>
                <p>
                  {labels.input}: <span className='code-font text-foreground'>{testCase.input}</span>
                </p>
                <p>
                  {labels.expected}: <span className='code-font text-foreground'>{testCase.expectedOutput}</span>
                </p>
                <p>
                  {labels.actual}: <span className='code-font text-foreground'>{actual}</span>
                </p>
                {result.note ? <p className='text-red-600'>{result.note}</p> : null}
                {result.executionId ? (
                  <p>
                    Execution ID: <span className='code-font text-foreground'>{result.executionId}</span>
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
