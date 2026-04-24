import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '@/lib/cn';

// Minimal single-handle horizontal slider matching shadcn's look. Uses
// pointer events so it works identically on desktop and mobile. Full
// keyboard support for a11y.

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
  'aria-label'?: string;
  'aria-valuetext'?: string;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function snap(v: number, step: number) {
  if (step <= 0) return v;
  return Math.round(v / step) * step;
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  {
    value,
    min = 0,
    max = 100,
    step = 1,
    onChange,
    onCommit,
    disabled,
    className,
    trackClassName,
    rangeClassName,
    thumbClassName,
    ...aria
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);
  const [dragging, setDragging] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;

  const computeFromClientX = useCallback(
    (clientX: number) => {
      const el = rootRef.current;
      if (!el) return value;
      const rect = el.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return clamp(snap(min + ratio * (max - min), step), min, max);
    },
    [min, max, step, value],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    onChange?.(computeFromClientX(e.clientX));
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || disabled) return;
    onChange?.(computeFromClientX(e.clientX));
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    setDragging(false);
    const next = computeFromClientX(e.clientX);
    onChange?.(next);
    onCommit?.(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const big = (max - min) / 10;
    let next = value;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        next = clamp(snap(value - step, step), min, max);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        next = clamp(snap(value + step, step), min, max);
        break;
      case 'PageDown':
        next = clamp(snap(value - big, step), min, max);
        break;
      case 'PageUp':
        next = clamp(snap(value + big, step), min, max);
        break;
      case 'Home':
        next = min;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange?.(next);
    onCommit?.(next);
  };

  // If the user dragged out of the element, release capture on global pointerup.
  useEffect(() => {
    if (!dragging) return;
    const stop = () => setDragging(false);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [dragging]);

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative flex h-5 w-full touch-none select-none items-center',
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
      {...aria}
    >
      <div
        className={cn(
          'relative h-1 w-full overflow-hidden rounded-full bg-border',
          trackClassName,
        )}
      >
        <div
          className={cn('absolute inset-y-0 left-0 bg-foreground', rangeClassName)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className={cn(
          'absolute size-3 -translate-x-1/2 rounded-full bg-foreground shadow-sm',
          'transition-transform',
          dragging && 'scale-125',
          thumbClassName,
        )}
        style={{ left: `${pct}%` }}
        aria-hidden
      />
    </div>
  );
});
