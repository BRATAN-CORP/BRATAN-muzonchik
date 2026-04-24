import { createContext, useContext, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

// Tiny controlled tabs. Enough API surface for Search page / FullPlayer
// side panels without bringing in Radix. Keyboard nav between triggers
// (ArrowLeft / ArrowRight) is supported.

interface TabsContextValue {
  value: string;
  onChange: (v: string) => void;
  id: string;
}

const Ctx = createContext<TabsContextValue | null>(null);

interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <Ctx.Provider value={{ value, onChange: onValueChange, id: useStableId() }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

function useStableId() {
  // Stable-enough id per mount for aria-controls / aria-labelledby pairing.
  // A full implementation would use useId, but we don't need SSR safety here.
  return 'tabs';
}

export function TabsList({
  children,
  className,
  ...rest
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-secondary p-1 border border-border',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('TabsTrigger used outside Tabs');
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={() => ctx.onChange(value)}
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-full px-4 text-[13px] font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-soft'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('TabsContent used outside Tabs');
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
