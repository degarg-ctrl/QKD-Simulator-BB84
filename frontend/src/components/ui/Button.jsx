import React from 'react'
import { cn } from '../../lib/utils'

/**
 * Standard semantic Button primitive for QKDSimFlow.
 * Variants: primary | secondary | outline | ghost | danger
 * Sizes: sm | md | lg | icon
 */
export const Button = React.forwardRef(function Button(
  {
    className,
    variant = 'secondary',
    size = 'md',
    type = 'button',
    disabled = false,
    children,
    ...props
  },
  ref
) {
  const baseStyles = 'inline-flex items-center justify-center gap-1.5 font-sans font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--q-accent)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]'

  const variants = {
    primary:
      'bg-[var(--q-accent)] text-black font-semibold hover:brightness-110 shadow-sm border border-transparent',
    secondary:
      'bg-[var(--q-surface-2)] text-[var(--q-text-1)] hover:bg-white/10 border border-[var(--border-color)]',
    outline:
      'bg-transparent text-[var(--q-text-2)] hover:text-[var(--q-text-1)] hover:bg-white/5 border border-[var(--border-color)]',
    ghost:
      'bg-transparent text-[var(--q-text-3)] hover:text-[var(--q-text-1)] hover:bg-white/5 border border-transparent',
    danger:
      'bg-[rgba(239,68,68,0.15)] text-[var(--q-danger)] hover:bg-[rgba(239,68,68,0.25)] border border-[rgba(239,68,68,0.3)]',
  }

  const sizes = {
    sm: 'text-xs px-2.5 py-1 rounded-md h-7',
    md: 'text-xs px-3 py-1.5 rounded-lg h-8',
    lg: 'text-sm px-4 py-2 rounded-lg h-10',
    icon: 'h-8 w-8 rounded-lg p-0',
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
})

export default Button
