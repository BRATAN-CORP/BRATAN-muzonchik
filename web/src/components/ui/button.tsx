import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// shadcn-style Button. Variants stay within the design-token palette — every
// state (hover / active / disabled / focus-visible) resolves through CSS
// variables so both themes look identical without per-variant overrides.

export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'accent'
  | 'destructive'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg' | 'icon-xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BASE =
  'inline-flex items-center justify-center gap-2 font-medium rounded-md select-none ' +
  'transition-[background-color,border-color,color,opacity,transform] duration-150 ' +
  'active:translate-y-px disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const VARIANTS: Record<ButtonVariant, string> = {
  default:
    'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border',
  ghost:
    'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
  outline:
    'bg-transparent border border-border-strong text-foreground hover:bg-secondary',
  accent:
    'bg-accent text-accent-foreground hover:bg-accent/90',
  destructive:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  link:
    'bg-transparent text-foreground hover:underline underline-offset-4 p-0 h-auto',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-md',
  md: 'h-10 px-4 text-sm rounded-md',
  lg: 'h-11 px-5 text-[15px] rounded-md',
  xl: 'h-14 px-6 text-base rounded-xl',
  icon: 'h-10 w-10 p-0 rounded-full',
  'icon-sm': 'h-8 w-8 p-0 rounded-full',
  'icon-lg': 'h-12 w-12 p-0 rounded-full',
  'icon-xl': 'h-16 w-16 p-0 rounded-full',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    />
  );
});
