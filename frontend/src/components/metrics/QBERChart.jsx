/**
 * src/components/metrics/QBERChart.jsx
 *
 * Renders QBER as a function of distance.
 * Data comes from results.qber_vs_distance from backend.
 * Shows a horizontal red threshold line at 11%.
 */
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer
} from 'recharts'

function QBERTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded 
                      p-2 text-xs font-body">
        <p className="text-[var(--text-muted)]"><span className="font-mono tabular-nums">{label}</span> km</p>
        <p className="text-indigo-400">
          QBER: <span className="font-mono tabular-nums">{payload[0]?.value?.toFixed(2)}%</span>
        </p>
      </div>
    )
  }
  return null
}

export default function QBERChart({ data = [], currentQBER = null, distance = null }) {
  // data shape: [{distance: float, qber: float}, ...]
  // Convert qber to percentage for display
  const chartData = data.map(d => ({
    distance: Math.round(d.distance),
    qber: parseFloat((d.qber * 100).toFixed(2))
  }))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-body font-semibold text-[var(--q-text-2)] 
                         uppercase tracking-wider">
          QBER vs Distance (km)
        </span>
        {currentQBER !== null && currentQBER !== undefined && (
          <span className="text-xs font-body font-semibold text-indigo-400">
            Simulated: <span className="font-mono tabular-nums">{(currentQBER * 100).toFixed(2)}%</span>
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={chartData}
          margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="distance"
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}
          />
          <YAxis
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'monospace' }}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<QBERTooltip />} />
          <ReferenceLine
            y={11}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{
              value: '11% threshold', fill: '#ef4444',
              fontSize: 10, fontFamily: 'monospace'
            }}
          />
          <Line
            type="monotone"
            dataKey="qber"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1' }}
          />
          {currentQBER !== null && currentQBER !== undefined && distance !== null && (
            <ReferenceDot
              x={distance}
              y={parseFloat((currentQBER * 100).toFixed(2))}
              r={5}
              fill="#ffffff"
              stroke="#6366f1"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
