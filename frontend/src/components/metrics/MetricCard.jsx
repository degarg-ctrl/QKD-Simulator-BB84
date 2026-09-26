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
  gauge,          // optional { value: number, max: number, label: string }
  className = ''
}) {
  const statusColors = {
    normal:   'text-green-400  border-green-900/40  bg-green-950/20',
    warning:  'text-yellow-400     border-yellow-900/40 bg-yellow-950/20',
    danger:   'text-red-400    border-red-900/40    bg-red-950/20',
    inactive: 'text-[var(--text-muted)] border-[var(--border-color)] bg-[var(--panel-dark)]/10',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border transition-all ${statusColors[status] || statusColors.normal} ${className}`}
      style={{ 
        backgroundColor: status === 'danger'
          ? 'rgba(239, 68, 68, 0.1)'
          : status === 'warning'
          ? 'rgba(245, 158, 11, 0.08)'
          : 'var(--q-surface-1, #242424)',
        borderColor: status === 'danger'
          ? 'rgba(239, 68, 68, 0.35)'
          : status === 'warning'
          ? 'rgba(245, 158, 11, 0.35)'
          : 'var(--q-border-subtle, rgba(255,255,255,0.1))'
      }}
    >
      <div className="text-xs font-body uppercase tracking-wider mb-1 text-[var(--q-text-2)] font-semibold">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
        <span className="text-2xl font-mono tabular-nums font-bold tracking-tight text-[var(--q-text-1)]">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-body text-[var(--q-text-3)] whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="text-xs font-body mt-1.5 text-[var(--q-text-3)]">
          {subtitle}
        </div>
      )}
      {gauge && (
        <div className="mt-2 pt-1.5 border-t border-[var(--border-color)]/40">
          <div className="flex justify-between text-[10px] font-body text-[var(--q-text-3)] mb-1">
            <span>{gauge.label || 'Threshold'}</span>
            <span className="font-mono tabular-nums">{((gauge.value / gauge.max) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full bg-[var(--q-surface-0)] rounded-full overflow-hidden border border-[var(--border-color)]">
            <div
              className={`h-full transition-all duration-300 ${
                gauge.value >= gauge.max
                  ? 'bg-red-500'
                  : gauge.value >= gauge.max * 0.65
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, (gauge.value / gauge.max) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}
