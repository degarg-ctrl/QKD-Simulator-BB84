/**
 * src/components/metrics/SKRChart.jsx
 *
 * Renders Secret Key Rate as a function of distance.
 * SKR decreases with distance due to photon loss.
 * Shows where SKR drops to zero.
 */
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceDot, ResponsiveContainer
} from 'recharts'

function SKRTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded 
                      p-2 text-xs font-body">
        <p className="text-[var(--text-muted)]"><span className="font-mono tabular-nums">{label}</span> km</p>
        <p className="text-green-400">
          SKR: <span className="font-mono tabular-nums">{payload[0]?.value?.toFixed(4)}</span>
        </p>
      </div>
    )
  }
  return null
}

export default function SKRChart({ data = [], currentSKR = null, distance = null }) {
  const chartData = data.map(d => ({
    distance: Math.round(d.distance),
    skr: parseFloat(d.skr.toFixed(4))
  }))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-body font-semibold text-[var(--q-text-2)] 
                         uppercase tracking-wider">
          SKR vs Distance (km)
        </span>
        {currentSKR !== null && (
          <span className="text-xs font-body font-semibold text-emerald-400">
            Simulated: <span className="font-mono tabular-nums">{currentSKR.toFixed(4)}</span>
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
          />
          <Tooltip content={<SKRTooltip />} />
          <Line
            type="monotone"
            dataKey="skr"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e' }}
          />
          {currentSKR !== null && distance !== null && (
            <ReferenceDot
              x={distance}
              y={parseFloat(currentSKR.toFixed(4))}
              r={5}
              fill="#ffffff"
              stroke="#22c55e"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
