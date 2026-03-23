/**
 * src/components/ui/EditableValue.jsx
 *
 * Double-click to edit any numeric parameter value.
 * Shows value as text normally.
 * On double-click: becomes an input field.
 * On Enter or blur: applies the value with validation.
 */

import { useState, useRef, useEffect } from 'react'

export default function EditableValue({
  value,          // current display string e.g. "50 km"
  numericValue,   // current numeric value
  min,            // minimum allowed value
  max,            // maximum allowed value
  step,           // step increment
  onChange,        // callback: (newNumericValue) => void
  suffix = '',    // unit suffix e.g. "km", "%"
  color = '#00aacc'  // highlight color
}) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const startEdit = () => {
    setInputVal(String(numericValue))
    setEditing(true)
  }

  const commitEdit = () => {
    const parsed = parseFloat(inputVal)
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed))
      // Round to step precision
      const precision = step < 1 
        ? String(step).split('.')[1]?.length || 0 
        : 0
      const rounded = parseFloat(clamped.toFixed(precision))
      onChange(rounded)
    }
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          value={inputVal}
          min={min}
          max={max}
          step={step}
          onChange={e => setInputVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="w-16 px-1.5 py-0.5 text-xs font-mono
                     rounded outline-none text-right"
          style={{
            backgroundColor: '#1e1e1e',
            border: `1px solid ${color}`,
            color: color
          }}
        />
        {suffix && (
          <span className="text-xs font-mono text-gray-500">
            {suffix}
          </span>
        )}
      </div>
    )
  }

  return (
    <span
      onDoubleClick={startEdit}
      className="text-xs font-mono font-semibold 
                 cursor-pointer select-none
                 hover:underline hover:underline-offset-2
                 transition-colors"
      style={{ color }}
      title="Double-click to edit"
    >
      {value}
    </span>
  )
}

// Depends on: nothing
// Used by: ConfigPanel.jsx, ExperimentModal.jsx
