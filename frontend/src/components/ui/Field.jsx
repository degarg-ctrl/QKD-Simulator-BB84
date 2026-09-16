import React from 'react'
import { cn } from '../../lib/utils'

/**
 * Standard Field wrapper for configuration parameters.
 */
export function Field({
  label,
  valueDisplay,
  description,
  tooltip,
  children,
  className,
}) {
  return (
    <div className={cn('flex flex-col gap-1.5 py-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-sans font-medium text-[var(--q-text-2)]">{label}</span>
          {tooltip}
        </div>
        {valueDisplay && (
          <span className="font-mono text-xs font-semibold text-[var(--q-accent)] tabular-nums">
            {valueDisplay}
          </span>
        )}
      </div>
      {children}
      {description && (
        <span className="text-[11px] text-[var(--q-text-4)] leading-tight">
          {description}
        </span>
      )}
    </div>
  )
}

export default Field
