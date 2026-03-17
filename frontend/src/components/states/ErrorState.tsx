import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type ErrorStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({ title, description, actionLabel, onRetry }: ErrorStateProps) {
  return (
    <Card className='border-red-200'>
      <CardContent className='flex min-h-44 flex-col items-center justify-center gap-4 text-center'>
        <AlertTriangle className='h-6 w-6 text-red-600' />
        <div>
          <h4 className='text-sm font-semibold text-red-700'>{title}</h4>
          <p className='mt-1 max-w-sm text-sm text-red-600'>{description}</p>
        </div>
        {onRetry && actionLabel ? (
          <Button variant='outline' onClick={onRetry}>
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
