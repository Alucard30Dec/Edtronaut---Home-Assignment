import { Loader2, Play } from 'lucide-react';

import { Button } from '@/components/ui/button';

type RunButtonProps = {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
};

export function RunButton({ disabled, loading, onClick }: RunButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled} className='min-w-36' aria-label='Run code execution'>
      {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Play className='h-4 w-4' />}
      {loading ? 'Running...' : 'Run Code'}
    </Button>
  );
}
