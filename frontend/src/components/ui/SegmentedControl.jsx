import React from 'react'
import { cn } from '../../lib/utils'

/**
 * Segmented Control for mutually exclusive options (e.g. Eve strategies, view modes).
 */
export function SegmentedControl({
  options = [],
  value,
  onChange,
  className,
  size = 'sm',
  fullWidth = false,
}) {
  const sizeClasses = {
    xs: 'p-0.5 text-xs',
    sm: 'p-1 text-xs',
    md: 'p-1.5 text-sm',
  }

  const btnSizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm font-semibold',
  }

  const isFullWidth = fullWidth || className?.includes('w-full')

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg bg-[var(--q-surface-0)] border border-[var(--border-color)] select-none',
        sizeClasses[size],
        className
      )}
      role="radiogroup"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md font-sans font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--q-accent)]',
              btnSizes[size],
              isFullWidth && 'flex-1 text-center justify-center',
              isSelected
                ? 'bg-[var(--q-surface-2)] text-[var(--q-text-1)] font-semibold shadow-sm border border-white/10'
                : 'text-[var(--q-text-3)] hover:text-[var(--q-text-2)] hover:bg-white/5',
              opt.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
