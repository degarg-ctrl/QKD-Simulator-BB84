import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * SmartTooltipWrapper
 * 
 * Central public tooltip API for QKDSimFlow.
 * Renders tooltip via portal with viewport collision detection.
 * 
 * Features:
 *   - Guaranteed header clearance (never occludes top transport bar)
 *   - Trigger non-occlusion (flips or shifts rather than covering source)
 *   - Hover persistence (cursor can move into tooltip to scroll/interact)
 *   - Clamping to viewport bounds
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
    }, 150)
  }, [])

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 12
    const headerHeight = 56 // Clearance for the top header bar

    const tw = tooltipRef.current?.scrollWidth || 300
    const th = tooltipRef.current?.scrollHeight || 360

    let left, top

    if (placement === 'right' || placement === 'left') {
      // Horizontal placement
      if (placement === 'right') {
        left = trigger.right + offset
        if (left + tw > vw - pad) {
          left = Math.max(pad, trigger.left - tw - offset)
        }
      } else {
        left = trigger.left - tw - offset
        if (left < pad) {
          left = Math.min(vw - pad - tw, trigger.right + offset)
        }
      }

      // Vertical alignment: center on trigger, clamped below header
      top = trigger.top + trigger.height / 2 - th / 2

      // Prevent occluding the header (B8 fix)
      if (top < headerHeight + pad) {
        top = headerHeight + pad
      }

      // Clamp bottom edge
      if (top + th > vh - pad) {
        top = Math.max(headerHeight + pad, vh - pad - th)
      }
    } else {
      // Vertical placement (bottom / top)
      top = trigger.bottom + offset
      if (top + th > vh - pad) {
        // Flip above if space permits
        const aboveTop = trigger.top - th - offset
        if (aboveTop >= headerHeight + pad) {
          top = aboveTop
        } else {
          top = headerHeight + pad
        }
      }

      left = trigger.left + trigger.width / 2 - tw / 2
      if (left < pad) left = pad
      if (left + tw > vw - pad) left = vw - pad - tw
    }

    const availableH = Math.max(160, vh - top - pad)
    const actualMaxH = Math.min(maxHeight, availableH)

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
    }, 250)
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

  useEffect(() => {
    const handleResize = () => {
      if (visible) calculatePosition()
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && visible) {
        setVisible(false)
      }
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeouts()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, calculatePosition])

  const tooltip = (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={tooltipRef}
          role="tooltip"
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
            maxWidth: 'calc(100vw - 32px)',
            pointerEvents: 'auto',
          }}
          className="overflow-y-auto overflow-x-hidden shadow-2xl"
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
      onFocus={handleTriggerEnter}
      onBlur={handleTriggerLeave}
      className="inline-flex"
    >
      {children}
      {typeof document !== 'undefined' && createPortal(tooltip, document.body)}
    </div>
  )
}
