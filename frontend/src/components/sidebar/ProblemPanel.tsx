import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProblemPanel() {
  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm'>Simulation Brief</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4 text-sm'>
        <p className='text-muted-foreground'>
          Implement and validate a backend flow for live coding sessions. Your goal is to keep session state stable,
          execute code asynchronously, and return output signals useful for technical interviews.
        </p>

        <div className='grid gap-4 md:grid-cols-2'>
          <div className='rounded-xl border bg-muted/30 p-3'>
            <h4 className='font-semibold'>Requirements</h4>
            <ul className='mt-2 space-y-1 text-muted-foreground'>
              <li>• Create and maintain active coding sessions.</li>
              <li>• Autosave edits with version-aware updates.</li>
              <li>• Trigger asynchronous execution and poll status.</li>
            </ul>
          </div>

          <div className='rounded-xl border bg-muted/30 p-3'>
            <h4 className='font-semibold'>Constraints</h4>
            <ul className='mt-2 space-y-1 text-muted-foreground'>
              <li>• Python only for MVP language support.</li>
              <li>• Handle QUEUED/RUNNING/COMPLETED/FAILED/TIMEOUT.</li>
              <li>• Keep behavior deterministic and review-friendly.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
