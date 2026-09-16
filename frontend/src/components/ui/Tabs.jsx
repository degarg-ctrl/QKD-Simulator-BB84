import React from 'react'
import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '../../lib/utils'

export const Tabs = RadixTabs.Root

export const TabsList = React.forwardRef(function TabsList(
  { className, ...props },
  ref
) {
  return (
    <RadixTabs.List
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 border-b border-[var(--border-color)] bg-transparent',
        className
      )}
      {...props}
    />
  )
})

export const TabsTrigger = React.forwardRef(function TabsTrigger(
  { className, ...props },
  ref
) {
  return (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-xs font-sans font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--q-accent)] disabled:pointer-events-none disabled:opacity-50 text-[var(--q-text-3)] hover:text-[var(--q-text-1)] border-b-2 border-transparent data-[state=active]:border-[var(--q-accent)] data-[state=active]:text-[var(--q-text-1)] data-[state=active]:font-semibold',
        className
      )}
      {...props}
    />
  )
})

export const TabsContent = React.forwardRef(function TabsContent(
  { className, ...props },
  ref
) {
  return (
    <RadixTabs.Content
      ref={ref}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--q-accent)] outline-none',
        className
      )}
      {...props}
    />
  )
})

export default {
  Root: Tabs,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
}
