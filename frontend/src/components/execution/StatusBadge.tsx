import { Badge } from '@/components/ui/badge';

type StatusBadgeProps = {
  status: string;
};

function resolveVariant(status: string): 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' {
  const normalized = status.toUpperCase();
  if (normalized === 'COMPLETED') return 'success';
  if (normalized === 'FAILED') return 'danger';
  if (normalized === 'TIMEOUT') return 'warning';
  if (normalized === 'RUNNING') return 'default';
  if (normalized === 'QUEUED') return 'secondary';
  if (normalized === 'ACTIVE') return 'default';
  if (normalized === 'ONLINE') return 'success';
  if (normalized === 'OFFLINE') return 'danger';
  return 'outline';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={resolveVariant(status)}>{status}</Badge>;
}
