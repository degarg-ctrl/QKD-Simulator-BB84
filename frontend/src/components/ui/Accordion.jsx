import React from 'react'
import * as RadixAccordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Accordion = RadixAccordion.Root

export const AccordionItem = React.forwardRef(function AccordionItem(
  { className, ...props },
  ref
) {
  return (
    <RadixAccordion.Item
      ref={ref}
      className={cn('border-b border-[var(--border-color)] py-0.5', className)}
      {...props}
    />
  )
})

export const AccordionTrigger = React.forwardRef(function AccordionTrigger(
  { className, children, ...props },
  ref
) {
  return (
    <RadixAccordion.Header className="flex">
      <RadixAccordion.Trigger
        ref={ref}
        className={cn(
          'flex flex-1 items-center justify-between py-2 text-xs font-sans font-semibold tracking-wide uppercase text-[var(--q-text-2)] hover:text-[var(--q-text-1)] transition-all [&[data-state=open]>svg]:rotate-180',
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown size={14} className="shrink-0 text-[var(--q-text-3)] transition-transform duration-200" />
      </RadixAccordion.Trigger>
    </RadixAccordion.Header>
  )
})

export const AccordionContent = React.forwardRef(function AccordionContent(
  { className, children, ...props },
  ref
) {
  return (
    <RadixAccordion.Content
      ref={ref}
      className={cn(
        'overflow-hidden text-xs transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down pb-2',
        className
      )}
      {...props}
    >
      {children}
    </RadixAccordion.Content>
  )
})

export default {
  Root: Accordion,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
}
