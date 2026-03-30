/**
 * src/components/metrics/MetricCard.jsx
 *
 * Displays a single simulation metric with label,
 * value, and optional status color coding.
 */
import { motion } from 'framer-motion'

export default function MetricCard({ 
  label,          // string: "QBER", "SKR", etc
  value,          // string: formatted value to display
  unit,           // string: "%", "bits", "kbps", etc  
  status,         // 'normal' | 'warning' | 'danger' | 'inactive'
  subtitle,       // optional string: secondary info
  className = ''
}) {
  const statusColors = {
    normal:   'text-green-400  border-green-900/40  bg-green-950/20',
    warning:  'text-yellow-400     border-yellow-900/40 bg-yellow-950/20',
    danger:   'text-red-400    border-red-900/40    bg-red-950/20',
    inactive: 'text-[var(--text-muted)] border-[var(--border-color)] bg-[var(--panel-dark)]/10',
  }

  // Use quantum-prefixed colors if available in tailwind config, 
  // but falling back to standard colors for safety as per user_global rule
  // (Note: user_global mentioned quantum-blue/green but standard tailwind colors work too)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border ${statusColors[status]} ${className}`}
      style={{ 
        background: '#1e1e2e', 
        border: '1px solid rgba(255,255,255,0.1)' 
      }}
    >
      <div className="text-xs font-mono uppercase tracking-widest 
                      mb-1"
           style={{ color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-mono font-bold">
          {value}
        </span>
        <span className="text-xs font-mono"
              style={{ color: 'rgba(255,255,255,0.5)' }}>
          {unit}
        </span>
      </div>
      {subtitle && (
        <div className="text-xs font-mono mt-1"
             style={{ color: 'rgba(255,255,255,0.4)' }}>
          {subtitle}
        </div>
      )}
    </motion.div>
  )
}
