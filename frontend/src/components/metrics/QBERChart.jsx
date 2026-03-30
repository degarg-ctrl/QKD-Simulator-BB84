/**
 * src/components/metrics/QBERChart.jsx
 *
 * Renders QBER as a function of distance.
 * Data comes from results.qber_vs_distance from backend.
 * Shows a horizontal red threshold line at 11%.
 */
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts'

export default function QBERChart({ data = [], currentQBER = null }) {
  // data shape: [{distance: float, qber: float}, ...]
  // Convert qber to percentage for display
  const chartData = data.map(d => ({
    distance: Math.round(d.distance),
    qber: parseFloat((d.qber * 100).toFixed(2))
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded 
                        p-2 text-xs font-mono">
          <p className="text-[var(--text-muted)]">{`${label} km`}</p>
          <p className="text-indigo-400">
            {`QBER: ${payload[0]?.value?.toFixed(2)}%`}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-[var(--text-muted)] 
                         uppercase tracking-wider">
          QBER vs Distance (Theoretical)
        </span>
        {currentQBER !== null && (
          <span className="text-xs font-mono text-indigo-400">
            Simulated: {(currentQBER * 100).toFixed(2)}%
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} 
                   margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis 
            dataKey="distance" 
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}
            label={{ value: 'km', position: 'insideRight', 
                     fill: 'var(--text-muted)', fontSize: 10 }}
          />
          <YAxis 
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine 
            y={11} 
            stroke="#ef4444" 
            strokeDasharray="4 4"
            label={{ value: '11% threshold', fill: '#ef4444', 
                     fontSize: 9, fontFamily: 'monospace' }}
          />
          <Line 
            type="monotone" 
            dataKey="qber" 
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
