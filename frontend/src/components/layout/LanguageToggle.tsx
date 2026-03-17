import { Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className='flex items-center gap-1 rounded-xl border bg-muted/20 p-1'>
      <Languages className='ml-1 h-4 w-4 text-muted-foreground' />
      <Button
        variant='ghost'
        size='sm'
        className={cn('h-8 px-2', language === 'en' && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground')}
        aria-label={t.header.switchToEnglish}
        onClick={() => setLanguage('en')}
      >
        EN
      </Button>
      <Button
        variant='ghost'
        size='sm'
        className={cn('h-8 px-2', language === 'vi' && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground')}
        aria-label={t.header.switchToVietnamese}
        onClick={() => setLanguage('vi')}
      >
        VI
      </Button>
    </div>
  );
}
