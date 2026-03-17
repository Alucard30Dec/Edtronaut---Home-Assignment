import { BookOpenText, Lightbulb, MessageSquareMore } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type ResourcePanelProps = {
  notes: string;
  onNotesChange: (value: string) => void;
};

export function ResourcePanel({ notes, onNotesChange }: ResourcePanelProps) {
  return (
    <Card className='h-[calc(100vh-7.5rem)]'>
      <CardHeader>
        <CardTitle className='text-sm'>Resources & Notes</CardTitle>
      </CardHeader>
      <CardContent className='h-[calc(100%-4.5rem)] p-0'>
        <ScrollArea className='h-full px-5 pb-5'>
          <div className='space-y-4'>
            <section className='rounded-xl border bg-muted/30 p-4'>
              <div className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                <BookOpenText className='h-4 w-4' /> Quick references
              </div>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                <li>• Validate execution states and transitions.</li>
                <li>• Persist source snapshot before queueing.</li>
                <li>• Keep retry and idempotency logic explicit.</li>
              </ul>
            </section>

            <section className='rounded-xl border bg-muted/30 p-4'>
              <div className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                <MessageSquareMore className='h-4 w-4' /> Mentor tip
              </div>
              <p className='text-sm text-muted-foreground'>
                Describe trade-offs in your notes: MVP isolation vs production sandboxing, and polling vs event-driven updates.
              </p>
            </section>

            <Separator />

            <section>
              <div className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                <Lightbulb className='h-4 w-4' /> Interview Notes
              </div>
              <Textarea
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                rows={9}
                placeholder='Capture assumptions, edge cases, and final explanation for reviewers.'
                aria-label='Simulation notes'
              />
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
