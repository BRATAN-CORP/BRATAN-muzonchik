import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'accent' | 'muted';
}

export function Badge({ variant = 'muted', className, ...rest }: BadgeProps) {
  const styles = {
    default: 'bg-primary text-primary-foreground',
    outline: 'border border-border text-foreground',
    accent: 'bg-accent-soft text-accent-foreground',
    muted: 'bg-secondary text-muted-foreground',
  }[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        styles,
        className,
      )}
      {...rest}
    />
  );
}
