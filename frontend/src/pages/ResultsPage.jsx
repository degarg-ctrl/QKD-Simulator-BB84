/**
 * src/pages/ResultsPage.jsx
 *
 * Results page for BB84 QKD Simulator.
 * Shows detailed comparison of simulated vs theoretical 
 * results from the most recent experiment run.
 *
 * Sections:
 *   1. Experiment Parameters — what was run
 *   2. Comparison Table — simulated vs theoretical vs delta
 *   3. QBER chart with simulated point marked
 *   4. SKR chart with simulated point marked  
 *   5. Security Verdict — full analysis
 *   6. Bit Stream Detail — filterable table
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
  ReferenceDot
} from 'recharts'
import useSimulationStore from '../store/simulationStore'

// ─── HELPER: compute theoretical values at exact distance ─
function getTheoreticalAtDistance(results, distanceKm) {
  if (!results?.qber_vs_distance?.length) return null
  
  // Find closest point in theoretical curve
  const qberPoint = results.qber_vs_distance.reduce((prev, curr) =>
    Math.abs(curr.distance - distanceKm) < 
    Math.abs(prev.distance - distanceKm) ? curr : prev
  )
  const skrPoint = results.skr_vs_distance.reduce((prev, curr) =>
    Math.abs(curr.distance - distanceKm) < 
    Math.abs(prev.distance - distanceKm) ? curr : prev
  )
  
  return {
    qber: qberPoint.qber,
    skr: skrPoint.skr,
  }
}

// ─── HELPER: compute theoretical survival at distance ─────
function theoreticalSurvival(distanceKm) {
  const lossdB = 0.2 * distanceKm
  return Math.pow(10, -lossdB / 10) * 0.85  // * detector efficiency
}

// ─── HELPER: format delta with sign and color ─────────────
function DeltaBadge({ simulated, theoretical, isPercent = false, 
                      invertGood = false }) {
  const delta = simulated - theoretical
  const isGood = invertGood ? delta < 0 : delta >= 0
  const sign = delta >= 0 ? '+' : ''
  const formatted = isPercent 
    ? `${sign}${(delta * 100).toFixed(2)}%`
    : `${sign}${delta.toFixed(4)}`
  
  return (
    <span className={`font-mono text-xs px-1.5 py-0.5 rounded
                     ${Math.abs(delta) < 0.001 
                       ? 'text-gray-400 bg-gray-800/50'
                       : isGood 
                         ? 'text-green-400 bg-green-950/40'
                         : 'text-yellow-400 bg-yellow-950/40'
                     }`}>
      {Math.abs(delta) < 0.0001 ? '≈ 0' : formatted}
    </span>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────
function EmptyResults() {
  const { setActiveView } = useSimulationStore()
  return (
    <div className="flex flex-col items-center justify-center 
                    h-full gap-6 text-center py-20">
      <div className="text-6xl opacity-20">📊</div>
      <div>
        <div className="text-lg font-mono text-gray-400 mb-2">
          No Results Yet
        </div>
        <div className="text-sm text-gray-600 max-w-sm">
          Run a simulation first, then come back here 
          to see a detailed analysis of your experiment.
        </div>
      </div>
      <button
        onClick={() => setActiveView('simulator')}
        className="px-6 py-2 bg-quantum-blue hover:bg-indigo-500
                   text-white rounded font-mono text-sm
                   transition-colors"
      >
        ▶ Go to Simulator
      </button>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────
export default function ResultsPage() {
  const { results, params } = useSimulationStore()
  const [bitStreamFilter, setBitStreamFilter] = useState('all')
  const [runTimestamp] = useState(() => new Date().toLocaleString())

  if (!results) return <EmptyResults />

  const theoretical = getTheoreticalAtDistance(
    results, params.distance_km
  )
  const theoreticalSurvivalRate = theoreticalSurvival(
    params.distance_km
  )
  const actualSurvivalRate = results.sifted_key_length / 
    params.n_bits * 2  // approximate

  // Prepare chart data with simulated point marked
  const qberChartData = results.qber_vs_distance.map(d => ({
    distance: Math.round(d.distance),
    theoretical: parseFloat((d.qber * 100).toFixed(2))
  }))

  const skrChartData = results.skr_vs_distance.map(d => ({
    distance: Math.round(d.distance),
    theoretical: parseFloat(d.skr.toFixed(4))
  }))

  // Filter bit stream
  const filteredBitStream = results.bit_stream.filter(p => {
    if (bitStreamFilter === 'matched') return p.match
    if (bitStreamFilter === 'intercepted') return p.intercepted
    if (bitStreamFilter === 'lost') return p.lost
    return true
  })

  const comparisonRows = [
    {
      metric: 'QBER',
      simulated: `${(results.qber * 100).toFixed(2)}%`,
      theoretical: theoretical 
        ? `${(theoretical.qber * 100).toFixed(2)}%` 
        : 'N/A',
      simulatedRaw: results.qber,
      theoreticalRaw: theoretical?.qber || 0,
      isPercent: true,
      invertGood: true,
      note: results.qber >= 0.11 
        ? '⚠ Threshold breached' 
        : '✓ Within safe range'
    },
    {
      metric: 'SKR',
      simulated: results.skr.toFixed(4),
      theoretical: theoretical 
        ? theoretical.skr.toFixed(4) 
        : 'N/A',
      simulatedRaw: results.skr,
      theoreticalRaw: theoretical?.skr || 0,
      isPercent: false,
      invertGood: false,
      note: results.skr === 0 
        ? '⚠ No secure key' 
        : '✓ Key extractable'
    },
    {
      metric: 'Sifted Key',
      simulated: `${results.sifted_key_length} bits`,
      theoretical: `~${Math.round(
        params.n_bits * theoreticalSurvivalRate * 0.5
      )} bits`,
      simulatedRaw: results.sifted_key_length,
      theoreticalRaw: Math.round(
        params.n_bits * theoreticalSurvivalRate * 0.5
      ),
      isPercent: false,
      invertGood: false,
      note: `of ${results.raw_key_length} raw bits`
    },
    {
      metric: 'Efficiency',
      simulated: `${results.efficiency.toFixed(1)}%`,
      theoretical: `${(theoreticalSurvivalRate * 50).toFixed(1)}%`,
      simulatedRaw: results.efficiency / 100,
      theoreticalRaw: theoreticalSurvivalRate * 0.5,
      isPercent: true,
      invertGood: false,
      note: 'sifted / raw bits'
    },
  ]

  const isSecure = !results.secure_threshold_breached
  const eveActive = params.attack_prob > 0

  return (
    <div className="flex flex-col h-full overflow-y-auto 
                    bg-canvas-bg text-white">
      <div className="max-w-6xl mx-auto w-full px-6 py-6 
                      flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-quantum-blue 
                            uppercase tracking-widest mb-1">
              Experiment Results
            </div>
            <h1 className="text-2xl font-bold font-mono">
              Most Recent Run
            </h1>
            <div className="text-xs text-gray-500 font-mono mt-1">
              {runTimestamp}
            </div>
          </div>
          {/* Security badge */}
          <div className={`px-4 py-2 rounded-lg border font-mono
                          text-sm font-bold
                          ${isSecure
                            ? 'bg-green-950/30 border-green-800/50 text-quantum-green'
                            : 'bg-red-950/30 border-red-800/50 text-quantum-red'
                          }`}>
            {isSecure ? '✓ SECURE' : '⚠ BREACH'}
          </div>
        </div>

        {/* Parameters used */}
        <div className="p-4 bg-panel-bg border border-border-subtle 
                        rounded-lg">
          <div className="text-xs font-mono text-gray-500 
                          uppercase tracking-wider mb-3">
            Parameters Used
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 
                          lg:grid-cols-6 gap-4">
            {[
              { label: 'Photons', value: params.n_bits.toLocaleString() },
              { label: 'Distance', value: `${params.distance_km} km` },
              { label: 'Noise', value: `${(params.noise_level * 100).toFixed(1)}%` },
              { label: 'Eve Attack', value: `${(params.attack_prob * 100).toFixed(0)}%` },
              { label: 'Strategy', value: params.attack_strategy.replace('_', '-') },
              { label: 'Gates', value: `${useSimulationStore.getState().placedGates?.length || 0} placed` },
            ].map(p => (
              <div key={p.label} className="flex flex-col gap-1">
                <div className="text-xs text-gray-600 font-mono 
                                uppercase tracking-wider">
                  {p.label}
                </div>
                <div className="text-sm font-mono text-white">
                  {p.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison table */}
        <div className="flex flex-col gap-3">
          <div className="text-xs font-mono text-gray-500 
                          uppercase tracking-wider">
            Simulated vs Theoretical Comparison
          </div>
          <div className="overflow-auto rounded-lg border 
                          border-border-subtle">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-gray-800 
                               bg-panel-bg">
                  <th className="text-left px-4 py-3 text-gray-500 
                                 text-xs uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="text-left px-4 py-3 text-quantum-blue 
                                 text-xs uppercase tracking-wider">
                    Simulated
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 
                                 text-xs uppercase tracking-wider">
                    Theoretical
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 
                                 text-xs uppercase tracking-wider">
                    Delta
                  </th>
                  <th className="text-left px-4 py-3 text-gray-500 
                                 text-xs uppercase tracking-wider">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.metric}
                      className={`border-b border-gray-900/50
                                 ${i % 2 === 0 
                                   ? 'bg-gray-900/10' 
                                   : 'bg-transparent'}`}>
                    <td className="px-4 py-3 text-gray-300 
                                   font-semibold">
                      {row.metric}
                    </td>
                    <td className="px-4 py-3 text-quantum-blue">
                      {row.simulated}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.theoretical}
                    </td>
                    <td className="px-4 py-3">
                      {row.theoreticalRaw !== undefined && (
                        <DeltaBadge
                          simulated={row.simulatedRaw}
                          theoretical={row.theoreticalRaw}
                          isPercent={row.isPercent}
                          invertGood={row.invertGood}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-gray-600 font-mono">
            ℹ Theoretical values computed from physics model at 
            {params.distance_km}km. Differences normal at low 
            photon counts — use n_bits ≥ 5000 for convergence.
          </div>
        </div>

        {/* Charts side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* QBER chart with simulated dot */}
          <div className="p-4 bg-panel-bg border border-border-subtle 
                          rounded-lg flex flex-col gap-3">
            <div className="text-xs font-mono text-gray-500 
                            uppercase tracking-wider">
              QBER vs Distance
            </div>
            <div className="text-xs text-gray-600 font-mono">
              <span className="text-quantum-blue">━</span> Theoretical curve
              &nbsp;&nbsp;
              <span className="text-quantum-red">●</span> Your result at {params.distance_km}km
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={qberChartData}
                         margin={{ top: 5, right: 15, 
                                   left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" 
                               stroke="#1e1e2e" />
                <XAxis dataKey="distance" stroke="#4b5563"
                       tick={{ fill: '#4b5563', fontSize: 10,
                               fontFamily: 'monospace' }}
                       label={{ value: 'km', 
                                position: 'insideRight',
                                fill: '#4b5563', fontSize: 10 }}
                />
                <YAxis stroke="#4b5563"
                       tick={{ fill: '#4b5563', fontSize: 10,
                               fontFamily: 'monospace' }}
                       tickFormatter={v => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#111',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '11px'
                  }}
                  formatter={(v) => [`${v}%`, 'Theoretical QBER']}
                  labelFormatter={(l) => `${l} km`}
                />
                <ReferenceLine y={11} stroke="#ef4444"
                               strokeDasharray="4 4"
                               label={{ value: '11% threshold',
                                        fill: '#ef4444',
                                        fontSize: 9,
                                        fontFamily: 'monospace' }}
                />
                <Line type="monotone" dataKey="theoretical"
                      stroke="#6366f1" strokeWidth={2}
                      dot={false}
                />
                {/* Simulated result dot */}
                <ReferenceDot
                  x={Math.round(params.distance_km)}
                  y={parseFloat((results.qber * 100).toFixed(2))}
                  r={6}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={2}
                  label={{ 
                    value: `${(results.qber * 100).toFixed(1)}%`,
                    fill: '#ef4444',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    position: 'top'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SKR chart with simulated dot */}
          <div className="p-4 bg-panel-bg border border-border-subtle 
                          rounded-lg flex flex-col gap-3">
            <div className="text-xs font-mono text-gray-500 
                            uppercase tracking-wider">
              SKR vs Distance
            </div>
            <div className="text-xs text-gray-600 font-mono">
              <span className="text-quantum-green">━</span> Theoretical curve
              &nbsp;&nbsp;
              <span className="text-quantum-green">●</span> Your result at {params.distance_km}km
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={skrChartData}
                         margin={{ top: 5, right: 15,
                                   left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3"
                               stroke="#1e1e2e" />
                <XAxis dataKey="distance" stroke="#4b5563"
                       tick={{ fill: '#4b5563', fontSize: 10,
                               fontFamily: 'monospace' }}
                       label={{ value: 'km',
                                position: 'insideRight',
                                fill: '#4b5563', fontSize: 10 }}
                />
                <YAxis stroke="#4b5563"
                       tick={{ fill: '#4b5563', fontSize: 10,
                               fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '11px'
                  }}
                  formatter={(v) => [v.toFixed(4), 'Theoretical SKR']}
                  labelFormatter={(l) => `${l} km`}
                />
                <Line type="monotone" dataKey="theoretical"
                      stroke="#22c55e" strokeWidth={2}
                      dot={false}
                />
                {/* Simulated result dot */}
                <ReferenceDot
                  x={Math.round(params.distance_km)}
                  y={parseFloat(results.skr.toFixed(4))}
                  r={6}
                  fill="#22c55e"
                  stroke="#fff"
                  strokeWidth={2}
                  label={{
                    value: results.skr.toFixed(3),
                    fill: '#22c55e',
                    fontSize: 10,
                    fontFamily: 'monospace',
                    position: 'top'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Security verdict */}
        <div className={`p-5 rounded-lg border
                        ${isSecure
                          ? 'bg-green-950/20 border-green-900/40'
                          : 'bg-red-950/20 border-red-900/40'
                        }`}>
          <div className="text-xs font-mono uppercase 
                          tracking-wider mb-3"
               style={{ color: isSecure ? '#22c55e' : '#ef4444' }}>
            Security Verdict
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-mono font-bold"
                      style={{ 
                        color: isSecure ? '#22c55e' : '#ef4444' 
                      }}>
                  {isSecure ? '✓ SECURE' : '⚠ THRESHOLD BREACHED'}
                </span>
              </div>
              <div className="text-sm text-gray-400 leading-relaxed">
                {isSecure
                  ? `QBER of ${(results.qber * 100).toFixed(2)}% is below the 11% security threshold. The quantum channel is considered secure. Key extraction was successful.`
                  : `QBER of ${(results.qber * 100).toFixed(2)}% exceeds the 11% threshold. Significant eavesdropping detected. Session was aborted — no secure key extracted.`
                }
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm font-mono">
              {[
                { 
                  label: 'Eve Detection', 
                  value: results.qber >= 0.11 
                    ? 'Triggered' : 'Not triggered',
                  ok: results.qber < 0.11
                },
                { 
                  label: 'Eve Active', 
                  value: eveActive 
                    ? `Yes (${(params.attack_prob*100).toFixed(0)}%)` 
                    : 'No',
                  ok: !eveActive
                },
                { 
                  label: 'Key Extraction', 
                  value: isSecure ? 'Successful' : 'Failed',
                  ok: isSecure
                },
                { 
                  label: 'Estimated Key Bits',
                  value: isSecure 
                    ? `~${Math.round(results.sifted_key_length * 0.9)} bits`
                    : '0 bits',
                  ok: isSecure
                },
              ].map(item => (
                <div key={item.label} 
                     className="flex justify-between 
                                border-b border-gray-800/50 py-1">
                  <span className="text-gray-500">{item.label}</span>
                  <span style={{ 
                    color: item.ok ? '#22c55e' : '#ef4444' 
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bit stream detail */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-gray-500 
                            uppercase tracking-wider">
              Bit Stream Detail
              <span className="text-gray-700 ml-2">
                ({filteredBitStream.length} of {results.bit_stream.length} shown)
              </span>
            </div>
            {/* Filters */}
            <div className="flex items-center gap-1">
              {[
                { id: 'all',         label: 'All' },
                { id: 'matched',     label: 'Matched' },
                { id: 'intercepted', label: 'Intercepted' },
                { id: 'lost',        label: 'Lost' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setBitStreamFilter(f.id)}
                  className={`px-2 py-1 text-xs font-mono rounded
                             border transition-colors
                             ${bitStreamFilter === f.id
                               ? 'border-quantum-blue text-quantum-blue bg-indigo-950/30'
                               : 'border-gray-800 text-gray-600 hover:text-gray-400'
                             }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-auto max-h-80 rounded-lg 
                          border border-border-subtle">
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 bg-panel-bg">
                <tr className="border-b border-gray-800">
                  {['#', 'Alice Bit', 'A.Basis', 
                    'B.Basis', 'Bob Bit', 'Match', 
                    'Eve', 'Angle'].map(h => (
                    <th key={h} 
                        className="text-left px-3 py-2 
                                   text-gray-500 uppercase 
                                   tracking-wider text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBitStream.map((photon, i) => (
                  <tr key={i}
                      className={`border-b border-gray-900/30
                        ${photon.intercepted 
                          ? 'bg-red-950/20' : ''}
                        ${!photon.match 
                          ? 'opacity-50' : ''}
                      `}>
                    <td className="px-3 py-1.5 text-gray-600">
                      {photon.index}
                    </td>
                    <td className="px-3 py-1.5 text-gray-300">
                      {photon.alice_bit}
                    </td>
                    <td className="px-3 py-1.5"
                        style={{ 
                          color: photon.alice_basis === '+' 
                            ? '#6366f1' : '#a855f7' 
                        }}>
                      {photon.alice_basis}
                    </td>
                    <td className="px-3 py-1.5"
                        style={{ 
                          color: photon.bob_basis === '+' 
                            ? '#6366f1' : '#a855f7' 
                        }}>
                      {photon.bob_basis}
                    </td>
                    <td className="px-3 py-1.5 text-gray-300">
                      {photon.bob_bit}
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={photon.match 
                        ? 'text-quantum-green' : 'text-gray-600'}>
                        {photon.match ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={photon.intercepted 
                        ? 'text-quantum-red' : 'text-gray-700'}>
                        {photon.intercepted ? '⚡' : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-gray-600">
                      {photon.polarization_angle}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
