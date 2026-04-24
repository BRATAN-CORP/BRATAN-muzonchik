import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionProps {
  title: string;
  description?: string;
  /** Backwards compatible alias used by pages that predate the rename. */
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Section({ title, description, subtitle, action, children, className }: SectionProps) {
  const desc = description ?? subtitle;
  return (
    <section className={cn('mt-10', className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h2>
          {desc && <p className="mt-1 text-xs text-muted-foreground">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
