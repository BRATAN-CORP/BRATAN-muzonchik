import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'icon';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// shadcn-ish monochrome button — all variants stay within the graphite scale
// except `primary`, which is the one place the accent shows up for emphasis.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, ...rest },
  ref
) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-md ' +
    'transition-[background-color,border-color,color,opacity] duration-150 ' +
    'disabled:opacity-50 disabled:pointer-events-none select-none';

  const variants: Record<Variant, string> = {
    primary:
      'bg-fg-base text-bg-base hover:opacity-90 active:opacity-80',
    secondary:
      'bg-bg-overlay text-fg-base border border-border-base hover:bg-bg-elevated',
    ghost:
      'text-fg-muted hover:text-fg-base hover:bg-bg-overlay',
    outline:
      'border border-border-strong text-fg-base hover:bg-bg-overlay',
    icon:
      'text-fg-muted hover:text-fg-base hover:bg-bg-overlay rounded-full',
  };

  const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-[15px]',
    xl: 'h-14 px-6 text-base',
  };

  const iconSizes: Record<Size, string> = {
    sm: 'h-8 w-8 p-0',
    md: 'h-10 w-10 p-0',
    lg: 'h-12 w-12 p-0',
    xl: 'h-14 w-14 p-0',
  };

  const dim = variant === 'icon' ? iconSizes[size] : sizes[size];

  return (
    <button ref={ref} className={cn(base, variants[variant], dim, className)} {...rest} />
  );
});
