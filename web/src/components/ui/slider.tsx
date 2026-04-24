import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  fillColor?: string
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, fillColor = 'var(--color-primary)', value, min = 0, max = 100, ...props }, ref) => {
    const numVal = Number(value || 0)
    const numMin = Number(min)
    const numMax = Number(max)
    const pct = numMax > numMin ? ((numVal - numMin) / (numMax - numMin)) * 100 : 0

    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        value={value}
        className={cn('w-full', className)}
        style={{
          background: `linear-gradient(90deg, ${fillColor} 0%, ${fillColor} ${pct}%, var(--color-border) ${pct}%)`,
        }}
        {...props}
      />
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }
