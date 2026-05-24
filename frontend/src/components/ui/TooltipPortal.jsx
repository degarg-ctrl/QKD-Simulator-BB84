import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export function TooltipPortal({
  children,
  content,
  width = 256,
  color = null
}) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const showTimeout = useRef(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (showTimeout.current) clearTimeout(showTimeout.current)
    }
  }, [])

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const tooltipH = 200
    const tooltipW = width

    let top, left

    // Horizontal — prefer left if in right half
    if (rect.left > vw / 2) {
      left = rect.left - tooltipW - 8
    } else {
      left = rect.right + 8
    }

    // Vertical — prefer above if in bottom half
    if (rect.top > vh / 2) {
      top = rect.top - tooltipH
    } else {
      top = rect.top
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(left, vw - width - 8))
    top = Math.max(8, Math.min(top, vh - tooltipH - 8))

    setCoords({ top, left })
  }, [width])

  const handleMouseEnter = () => {
    if (showTimeout.current) clearTimeout(showTimeout.current)
    showTimeout.current = setTimeout(() => {
      calculatePosition()
      setVisible(true)
    }, 400)
  }

  const handleMouseLeave = () => {
    if (showTimeout.current) clearTimeout(showTimeout.current)
    setVisible(false)
  }

  const tooltip = (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: width,
            zIndex: 99999,
            pointerEvents: 'none',
          }}
          className="p-3 bg-gray-950 border border-gray-700
                     rounded-lg shadow-2xl text-xs 
                     text-gray-300 leading-relaxed
                     whitespace-pre-line"
        >
          {color && (
            <div className="font-mono font-bold mb-1.5 text-xs"
                 style={{ color }}>
              {typeof children === 'string' ? children : ''}
            </div>
          )}
          <div>{content}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-flex"
    >
      {children}
      {createPortal(tooltip, document.body)}
    </div>
  )
}

// Convenience component for ? icon tooltips
export function QuestionTooltip({ content, width = 256 }) {
  return (
    <TooltipPortal content={content} width={width}>
      <button
        className="w-4 h-4 rounded-full border border-gray-600
                   text-gray-500 hover:text-gray-300
                   hover:border-gray-400 text-xs flex items-center
                   justify-center transition-colors ml-1 
                   flex-shrink-0"
      >
        ?
      </button>
    </TooltipPortal>
  )
}

// Depends on: framer-motion, react-dom
// Used by: ConfigPanel.jsx, Sidebar.jsx
