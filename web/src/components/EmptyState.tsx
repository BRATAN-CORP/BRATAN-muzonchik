import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: 'default' | 'destructive';
  className?: string;
}

export function EmptyState({ title, description, icon, action, tone = 'default', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'hairline rounded-xl p-8 md:p-10 text-center flex flex-col items-center gap-3',
        tone === 'destructive' && 'border-destructive/30 bg-destructive/5',
        className,
      )}
      role="status"
    >
      {icon && <div className="text-muted-foreground" aria-hidden>{icon}</div>}
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description && <div className="text-sm text-muted-foreground max-w-md">{description}</div>}
      {action}
    </div>
  );
}
