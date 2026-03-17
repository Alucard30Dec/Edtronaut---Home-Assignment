import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/language';

export function ProblemPanel() {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm'>{t.problem.title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4 text-sm'>
        <div className='grid gap-3 md:grid-cols-2'>
          <div className='rounded-xl border bg-muted/30 p-3'>
            <h4 className='font-semibold'>{t.problem.statementTitle}</h4>
            <p className='mt-1 text-muted-foreground'>{t.problem.statement}</p>
          </div>

          <div className='rounded-xl border bg-muted/30 p-3'>
            <h4 className='font-semibold'>{t.problem.constraintsTitle}</h4>
            <p className='mt-1 text-muted-foreground'>{t.problem.constraints}</p>
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-3'>
          <div className='rounded-xl border bg-muted/30 p-3'>
            <h4 className='font-semibold'>{t.problem.inputTitle}</h4>
            <p className='mt-1 text-muted-foreground'>{t.problem.input}</p>
          </div>

          <div className='rounded-xl border bg-muted/30 p-3'>
            <h4 className='font-semibold'>{t.problem.outputTitle}</h4>
            <p className='mt-1 text-muted-foreground'>{t.problem.output}</p>
          </div>

          <div className='rounded-xl border bg-muted/30 p-3'>
            <h4 className='font-semibold'>{t.problem.sampleTitle}</h4>
            <p className='mt-1 text-muted-foreground'>
              {t.problem.sampleInputLabel}: {t.problem.sampleInput}
            </p>
            <p className='text-muted-foreground'>
              {t.problem.sampleOutputLabel}: {t.problem.sampleOutput}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
