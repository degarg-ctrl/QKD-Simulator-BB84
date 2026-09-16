import React from 'react'
import * as RadixSlider from '@radix-ui/react-slider'
import { cn } from '../../lib/utils'

export const Slider = React.forwardRef(function Slider(
  {
    className,
    value,
    defaultValue,
    min = 0,
    max = 100,
    step = 1,
    onChange,
    disabled = false,
    accentColor,
    divisions = [], // Array of percentages e.g. [33.33, 66.67] or [50]
    ...props
  },
  ref
) {
  const currentVal = Array.isArray(value) ? value : [value ?? defaultValue ?? min]

  return (
    <div className="relative flex w-full items-center">
      <RadixSlider.Root
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={currentVal}
        onValueChange={(vals) => onChange && onChange(vals[0])}
        disabled={disabled}
        className={cn(
          'relative flex w-full touch-none select-none items-center h-5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        <RadixSlider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[#18181b] border border-[#3a3a42]">
          <RadixSlider.Range
            className="absolute h-full bg-[var(--q-accent,#00B8E6)]"
            style={accentColor ? { backgroundColor: accentColor } : undefined}
          />
          {divisions.map((pct, idx) => (
            <div
              key={`div-line-${idx}`}
              className="absolute top-0 bottom-0 w-[2px] bg-white/60 pointer-events-none z-10"
              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            />
          ))}
        </RadixSlider.Track>

        {/* Division Tick Marks extending slightly outside the track */}
        {divisions.map((pct, idx) => (
          <div
            key={`div-tick-${idx}`}
            className="absolute -top-1 -bottom-1 w-[2px] bg-white/70 pointer-events-none z-0 rounded-full"
            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
          />
        ))}

        <RadixSlider.Thumb
          className="block h-4 w-4 rounded-full border-2 border-[var(--q-accent,#00B8E6)] bg-white shadow-sm transition-transform hover:scale-115 focus-visible:outline-none cursor-grab active:cursor-grabbing z-20"
          style={accentColor ? { borderColor: accentColor } : undefined}
          aria-label="Slider thumb"
        />
      </RadixSlider.Root>
    </div>
  )
})

export default Slider

