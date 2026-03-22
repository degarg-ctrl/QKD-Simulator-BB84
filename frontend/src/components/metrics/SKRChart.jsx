/**
 * src/components/metrics/SKRChart.jsx
 *
 * Renders Secret Key Rate as a function of distance.
 * SKR decreases with distance due to photon loss.
 * Shows where SKR drops to zero.
 */
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

export default function SKRChart({ data = [], currentSKR = null }) {
  const chartData = data.map(d => ({
    distance: Math.round(d.distance),
    skr: parseFloat(d.skr.toFixed(4))
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded 
                        p-2 text-xs font-mono">
          <p className="text-gray-400">{`${label} km`}</p>
          <p className="text-green-400">
            {`SKR: ${payload[0]?.value?.toFixed(4)}`}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-gray-500 
                         uppercase tracking-wider">
          SKR vs Distance (Theoretical)
        </span>
        {currentSKR !== null && (
          <span className="text-xs font-mono text-green-400">
            Simulated: {currentSKR.toFixed(4)}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={chartData}
                   margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis
            dataKey="distance"
            stroke="#4b5563"
            tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'monospace' }}
            label={{ value: 'km', position: 'insideRight',
                     fill: '#4b5563', fontSize: 10 }}
          />
          <YAxis
            stroke="#4b5563"
            tick={{ fill: '#4b5563', fontSize: 10, fontFamily: 'monospace' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="skr"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
