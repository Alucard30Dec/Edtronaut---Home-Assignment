import { BookOpenText, Lightbulb, MessageSquareMore } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/lib/language';

type ResourcePanelProps = {
  notes: string;
  onNotesChange: (value: string) => void;
};

export function ResourcePanel({ notes, onNotesChange }: ResourcePanelProps) {
  const { t } = useLanguage();

  return (
    <Card className='h-[calc(100vh-7.5rem)]'>
      <CardHeader>
        <CardTitle className='text-sm'>{t.resources.title}</CardTitle>
      </CardHeader>
      <CardContent className='h-[calc(100%-4.5rem)] p-0'>
        <ScrollArea className='h-full px-5 pb-5'>
          <div className='space-y-4'>
            <section className='rounded-xl border bg-muted/30 p-4'>
              <div className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                <BookOpenText className='h-4 w-4' /> {t.resources.quickReferencesTitle}
              </div>
              <ul className='space-y-2 text-sm text-muted-foreground'>
                {t.resources.quickReferences.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>

            <section className='rounded-xl border bg-muted/30 p-4'>
              <div className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                <MessageSquareMore className='h-4 w-4' /> {t.resources.mentorTipTitle}
              </div>
              <p className='text-sm text-muted-foreground'>{t.resources.mentorTip}</p>
            </section>

            <Separator />

            <section>
              <div className='mb-2 flex items-center gap-2 text-sm font-semibold'>
                <Lightbulb className='h-4 w-4' /> {t.resources.notesTitle}
              </div>
              <Textarea
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                rows={9}
                placeholder={t.resources.notesPlaceholder}
                aria-label='Simulation notes'
              />
            </section>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
