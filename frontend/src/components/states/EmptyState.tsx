import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <Card className='border-dashed'>
      <CardContent className='flex min-h-40 flex-col items-center justify-center gap-3 text-center'>
        {icon}
        <h4 className='text-sm font-semibold'>{title}</h4>
        <p className='max-w-sm text-sm text-muted-foreground'>{description}</p>
      </CardContent>
    </Card>
  );
}
