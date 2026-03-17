import { Loader2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language';

type RunButtonProps = {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
};

export function RunButton({ disabled, loading, onClick }: RunButtonProps) {
  const { t } = useLanguage();

  return (
    <Button onClick={onClick} disabled={disabled} className='min-w-36' aria-label={t.runButton.aria}>
      {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Play className='h-4 w-4' />}
      {loading ? t.runButton.running : t.runButton.run}
    </Button>
  );
}
