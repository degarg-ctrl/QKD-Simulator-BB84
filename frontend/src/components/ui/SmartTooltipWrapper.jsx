import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * SmartTooltipWrapper
 * 
 * Wraps a trigger element and renders a tooltip via portal.
 * 
 * Positioning uses direct top-left coordinates (no CSS transforms)
 * so clamping to viewport edges is exact.
 * 
 * Features:
 *   - Viewport-aware positioning (clamps to screen edges with padding)
 *   - Hover persistence (tooltip stays when mouse moves to it)
 *   - Scrollable content (max-height with overflow)
 *   - Configurable placement (right, left, bottom)
 */
export default function SmartTooltipWrapper({
  children,
  tooltipContent,
  placement = 'right',
  offset = 12,
  maxHeight = 500,
}) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ left: 0, top: 0, actualMaxH: maxHeight })
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const hideTimeout = useRef(null)
  const showTimeout = useRef(null)

  const clearTimeouts = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current)
      hideTimeout.current = null
    }
    if (showTimeout.current) {
      clearTimeout(showTimeout.current)
      showTimeout.current = null
    }
  }

  const scheduleHide = useCallback(() => {
    clearTimeouts()
    hideTimeout.current = setTimeout(() => {
      setVisible(false)
    }, 200)
  }, [])

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 20 // minimum distance from any screen edge

    // Measure actual tooltip size, fallback to estimates
    const tw = tooltipRef.current?.scrollWidth || 288
    const th = tooltipRef.current?.scrollHeight || 300

    let left, top

    if (placement === 'right' || placement === 'left') {
      // ── Horizontal placement (tooltip appears beside trigger) ──

      // Try preferred side, flip if needed
      if (placement === 'right') {
        left = trigger.right + offset
        if (left + tw > vw - pad) {
          left = trigger.left - tw - offset
        }
      } else {
        left = trigger.left - tw - offset
        if (left < pad) {
          left = trigger.right + offset
        }
      }

      // If STILL overflows (both sides blocked), center on screen
      if (left < pad || left + tw > vw - pad) {
        left = Math.max(pad, (vw - tw) / 2)
      }

      // Vertical: center tooltip on trigger, then clamp
      top = trigger.top + trigger.height / 2 - th / 2

      // Clamp top edge
      if (top < pad) top = pad
      // Clamp bottom edge
      if (top + th > vh - pad) top = vh - pad - th
      // If tooltip taller than viewport, pin to top
      if (top < pad) top = pad

    } else {
      // ── Vertical placement (tooltip appears below/above trigger) ──

      // Try below first
      top = trigger.bottom + offset
      if (top + th > vh - pad) {
        // Flip above
        top = trigger.top - th - offset
      }
      // If still overflows top, pin to top
      if (top < pad) top = pad

      // Horizontal: center on trigger, then clamp
      left = trigger.left + trigger.width / 2 - tw / 2

      if (left < pad) left = pad
      if (left + tw > vw - pad) left = vw - pad - tw
      // If tooltip wider than viewport, pin to left
      if (left < pad) left = pad
    }

    // Calculate how much vertical space is actually available
    const availableH = vh - top - pad
    const actualMaxH = Math.min(maxHeight, Math.max(availableH, 200))

    setCoords({ left, top, actualMaxH })
  }, [placement, offset, maxHeight])

  const handleTriggerEnter = () => {
    clearTimeouts()
    showTimeout.current = setTimeout(() => {
      setVisible(true)
      calculatePosition()
      requestAnimationFrame(() => {
        calculatePosition()
      })
    }, 400) // 400ms delay to prevent accidental hovers
  }

  const handleTriggerLeave = () => {
    scheduleHide()
  }

  const handleTooltipEnter = () => {
    clearTimeouts()
  }

  const handleTooltipLeave = () => {
    scheduleHide()
  }

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (visible) calculatePosition()
    }
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeouts()
      window.removeEventListener('resize', handleResize)
    }
  }, [visible, calculatePosition])

  const tooltip = (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12 }}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            zIndex: 99999,
            maxHeight: coords.actualMaxH,
            maxWidth: `calc(100vw - 40px)`,
            pointerEvents: 'auto',
          }}
          className="overflow-y-auto overflow-x-hidden"
        >
          {tooltipContent}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleTriggerEnter}
      onMouseLeave={handleTriggerLeave}
      className="inline-flex"
    >
      {children}
      {createPortal(tooltip, document.body)}
    </div>
  )
}
