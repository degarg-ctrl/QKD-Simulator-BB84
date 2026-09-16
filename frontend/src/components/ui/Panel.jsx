import React from 'react'
import { cn } from '../../lib/utils'

/**
 * Surface Panel primitive adhering to the 3-surface hierarchy:
 * surface = 0 (workspace background) | 1 (panel/card) | 2 (overlay/raised)
 */
export const Panel = React.forwardRef(function Panel(
  {
    className,
    surface = 1,
    bordered = true,
    children,
    ...props
  },
  ref
) {
  const surfaceClasses = {
    0: 'bg-[var(--q-surface-0)]',
    1: 'bg-[var(--q-surface-1)]',
    2: 'bg-[var(--q-surface-2)] shadow-xl',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl transition-colors',
        surfaceClasses[surface],
        bordered && 'border border-[var(--border-color)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

export default Panel
