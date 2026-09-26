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
import { KeyRound } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
  ReferenceDot
} from 'recharts'
import useSimulationStore from '../store/simulationStore'
import OneTimePad from '../components/results/OneTimePad'

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
// detectorEfficiency: 1.0 for ideal mode, 0.85 for realistic mode
function theoreticalSurvival(distanceKm, detectorEfficiency = 0.85) {
  const lossdB = 0.2 * distanceKm
  return Math.pow(10, -lossdB / 10) * detectorEfficiency
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
    <span
      className="font-mono text-xs px-2 py-0.5 rounded border"
      style={{
        backgroundColor: Math.abs(delta) < 0.001
          ? 'var(--q-surface-2, #222227)'
          : isGood
          ? 'rgba(16, 185, 129, 0.12)'
          : 'rgba(245, 158, 11, 0.12)',
        borderColor: Math.abs(delta) < 0.001
          ? 'var(--q-border-subtle, #282830)'
          : isGood
          ? 'rgba(16, 185, 129, 0.35)'
          : 'rgba(245, 158, 11, 0.35)',
        color: Math.abs(delta) < 0.001
          ? 'var(--q-text-muted, #94a3b8)'
          : isGood
          ? 'var(--q-accent-emerald, #10b981)'
          : 'var(--q-accent-amber, #f59e0b)'
      }}
    >
      {Math.abs(delta) < 0.0001 ? '≈ 0' : formatted}
    </span>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────
function EmptyResults() {
  const { setActiveView } = useSimulationStore()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-20 select-none">
      <div
        className="w-12 h-12 rounded border flex items-center justify-center text-xl"
        style={{
          backgroundColor: 'var(--q-surface-1, #1a1a1e)',
          borderColor: 'var(--q-border, #34343d)',
          color: 'var(--q-text-muted, #94a3b8)'
        }}
      >
        📊
      </div>
      <div>
        <div className="text-lg font-serif font-semibold text-[var(--q-text-bright,#f1f5f9)] mb-1.5">
          No Simulation Data Available
        </div>
        <div className="text-sm font-body text-[var(--q-text-dim,#64748b)] max-w-sm leading-relaxed">
          Run an experiment from the Simulator console to populate theoretical vs simulated QKD analytics.
        </div>
      </div>
      <button
        onClick={() => setActiveView('simulator')}
        className="px-5 py-2 rounded font-body text-xs font-semibold tracking-wider uppercase transition-colors"
        style={{
          backgroundColor: 'var(--q-accent-cyan, #38bdf8)',
          color: '#000000'
        }}
      >
        ▶ Launch Simulator Console
      </button>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────
export default function ResultsPage() {
  const { results, params, sourceModel } = useSimulationStore()
  const [bitStreamFilter, setBitStreamFilter] = useState('all')
  const [inspectedPhoton, setInspectedPhoton] = useState(null)
  const [runTimestamp] = useState(() => new Date().toLocaleString())

  if (!results) return <EmptyResults />

  const theoretical = getTheoreticalAtDistance(
    results, params.distance_km
  )
  const detectorEta = sourceModel === 'ideal' ? 1.0 : 0.85
  const theoreticalSurvivalRate = theoreticalSurvival(
    params.distance_km, detectorEta
  )
  const qberEstimated = results.qber_estimated === true &&
    results.qber != null
  const isBreached = results.secure_threshold_breached === true
  const isSecure = qberEstimated && !isBreached
  const isUndetermined = !qberEstimated

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
      simulated: qberEstimated
        ? `${(results.qber * 100).toFixed(2)}%`
        : 'Not estimated',
      theoretical: theoretical
        ? `${(theoretical.qber * 100).toFixed(2)}%`
        : 'N/A',
      simulatedRaw: qberEstimated ? results.qber : undefined,
      theoreticalRaw: theoretical?.qber || 0,
      isPercent: true,
      invertGood: true,
      note: !qberEstimated
        ? 'Sifted sample too small to estimate'
        : results.qber >= 0.11
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

  const eveActive = params.attack_prob > 0

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-[var(--canvas-bg,#131317)] text-[var(--q-text-bright,#f1f5f9)] select-none">
      <div className="max-w-6xl mx-auto w-full px-6 py-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-body text-[var(--q-accent-cyan,#38bdf8)] uppercase tracking-wider font-semibold mb-1">
              BENCH TELEMETRY & RUN ANALYSIS
            </div>
            <h1 className="text-2xl font-serif font-semibold text-[var(--q-text-bright,#f1f5f9)]">
              Simulation Results & Verification
            </h1>
            <div className="text-xs text-[var(--q-text-dim,#64748b)] font-body mt-1">
              Timestamp: <span className="font-mono tabular-nums">{runTimestamp}</span>
            </div>
          </div>
          {/* Security badge */}
          <div
            className="px-3.5 py-1.5 rounded border font-body text-xs font-semibold tracking-wider flex items-center gap-2"
            style={{
              backgroundColor: 'var(--q-surface-1, #1a1a1e)',
              borderColor: isUndetermined
                ? 'var(--q-accent-amber, #f59e0b)'
                : isSecure
                ? 'var(--q-accent-emerald, #10b981)'
                : 'var(--q-accent-crimson, #e05252)',
              color: isUndetermined
                ? 'var(--q-accent-amber, #f59e0b)'
                : isSecure
                ? 'var(--q-accent-emerald, #10b981)'
                : 'var(--q-accent-crimson, #e05252)'
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: isUndetermined
                  ? 'var(--q-accent-amber, #f59e0b)'
                  : isSecure
                  ? 'var(--q-accent-emerald, #10b981)'
                  : 'var(--q-accent-crimson, #e05252)'
              }}
            />
            <span>
              {isUndetermined ? 'UNDETERMINED' : isSecure ? 'SECURE CHANNEL' : 'SECURITY BREACH'}
            </span>
          </div>
        </div>

        {/* Parameters used */}
        <div
          className="p-4 rounded border"
          style={{
            backgroundColor: 'var(--q-surface-1, #1a1a1e)',
            borderColor: 'var(--q-border, #34343d)'
          }}
        >
          <div className="text-[11px] font-body text-[var(--q-text-dim,#64748b)] uppercase tracking-wider mb-3 font-semibold">
            BENCH CONFIGURATION & EXPERIMENT INPUTS
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Photons', value: params.n_bits.toLocaleString() },
              { label: 'Distance', value: `${params.distance_km} km` },
              { label: 'Noise (edet)', value: `${(params.noise_level * 100).toFixed(1)}%` },
              { label: 'Eve Attack', value: `${(params.attack_prob * 100).toFixed(0)}%` },
              { label: 'Strategy', value: params.attack_strategy.replace('_', '-') },
              { label: 'Gates', value: `${useSimulationStore.getState().placedGates?.length || 0} placed` },
              {
                label: 'Source Model',
                value: sourceModel === 'ideal' ? 'Ideal SPS' : 'WCP Laser'
              },
            ].map(p => (
              <div
                key={p.label}
                className="p-2 rounded flex flex-col gap-1"
                style={{
                  backgroundColor: 'var(--q-surface-0, #131317)',
                  border: '1px solid var(--q-border-subtle, #282830)'
                }}
              >
                <div className="text-[10px] text-[var(--q-text-dim,#64748b)] font-body font-medium uppercase tracking-wider">
                  {p.label}
                </div>
                <div className="text-xs font-mono font-bold tabular-nums text-[var(--q-text-bright,#f1f5f9)] truncate">
                  {p.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison table */}
        <div className="flex flex-col gap-2.5">
          <div className="text-[11px] font-body text-[var(--q-text-dim,#64748b)] uppercase tracking-wider font-semibold">
            SIMULATED EXPERIMENT VS THEORETICAL MODEL
          </div>
          <div
            className="overflow-auto rounded border"
            style={{
              backgroundColor: 'var(--q-surface-1, #1a1a1e)',
              borderColor: 'var(--q-border, #34343d)'
            }}
          >
            <table className="w-full text-xs font-body">
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--q-surface-2, #222227)',
                    borderBottom: '1px solid var(--q-border-subtle, #282830)'
                  }}
                >
                  <th className="text-left px-4 py-2.5 text-[var(--q-text-dim,#64748b)] text-[11px] uppercase tracking-wider font-semibold">
                    METRIC
                  </th>
                  <th className="text-left px-4 py-2.5 text-[var(--q-accent-cyan,#38bdf8)] text-[11px] uppercase tracking-wider font-semibold">
                    SIMULATED
                  </th>
                  <th className="text-left px-4 py-2.5 text-[var(--q-text-dim,#64748b)] text-[11px] uppercase tracking-wider font-semibold">
                    THEORETICAL
                  </th>
                  <th className="text-left px-4 py-2.5 text-[var(--q-text-dim,#64748b)] text-[11px] uppercase tracking-wider font-semibold">
                    DELTA (Δ)
                  </th>
                  <th className="text-left px-4 py-2.5 text-[var(--q-text-dim,#64748b)] text-[11px] uppercase tracking-wider font-semibold">
                    STATUS / NOTES
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.metric}
                    style={{
                      borderBottom: '1px solid var(--q-border-subtle, #282830)',
                      backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                    }}
                  >
                    <td className="px-4 py-2.5 text-[var(--q-text-bright,#f1f5f9)] font-medium">
                      {row.metric}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--q-accent-cyan,#38bdf8)] font-mono font-semibold tabular-nums">
                      {row.simulated}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--q-text-muted,#94a3b8)] font-mono tabular-nums">
                      {row.theoretical}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.simulatedRaw !== undefined &&
                        row.theoreticalRaw !== undefined && (
                          <DeltaBadge
                            simulated={row.simulatedRaw}
                            theoretical={row.theoreticalRaw}
                            isPercent={row.isPercent}
                            invertGood={row.invertGood}
                          />
                        )}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--q-text-dim,#64748b)] text-[11px] font-body">
                      {row.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-[var(--q-text-dim,#64748b)] font-body leading-relaxed">
            ℹ Theoretical baseline computed via analytical Beer-Lambert attenuation at <span className="font-mono tabular-nums">{params.distance_km} km</span>. Variances are expected at low photon samples (statistical convergence achieved at <span className="font-mono tabular-nums">N ≥ 5,000</span>).
          </div>
        </div>

        {/* Charts side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* QBER chart with simulated dot */}
          <div
            className="p-4 rounded border flex flex-col gap-3 select-none"
            style={{
              backgroundColor: 'var(--q-surface-1, #1a1a1e)',
              borderColor: 'var(--q-border, #34343d)'
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-body text-[var(--q-text-dim,#64748b)] uppercase tracking-wider font-semibold">
                QUANTUM BIT ERROR RATE (QBER) VS DISTANCE
              </span>
              <span className="text-[10px] font-body text-[var(--q-accent-crimson,#e05252)] font-semibold uppercase tracking-wider">
                THRESHOLD: <span className="font-mono tabular-nums">11.0%</span>
              </span>
            </div>
            <div className="text-xs text-[var(--q-text-dim,#64748b)] font-body flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[var(--q-accent-cyan,#38bdf8)] inline-block" />
                Theoretical curve
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--q-accent-crimson,#e05252)] inline-block" />
                Measured at <span className="font-mono tabular-nums">{params.distance_km} km</span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart
                data={qberChartData}
                margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--q-border-subtle, #282830)" />
                <XAxis
                  dataKey="distance"
                  stroke="var(--q-text-dim, #64748b)"
                  tick={{ fill: 'var(--q-text-dim, #64748b)', fontSize: 10, fontFamily: 'monospace' }}
                  label={{ value: 'km', position: 'insideRight', fill: 'var(--q-text-dim, #64748b)', fontSize: 10 }}
                />
                <YAxis
                  stroke="var(--q-text-dim, #64748b)"
                  tick={{ fill: 'var(--q-text-dim, #64748b)', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--q-surface-2, #222227)',
                    border: '1px solid var(--q-border, #34343d)',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'var(--q-text-bright, #f1f5f9)'
                  }}
                  formatter={(v) => [`${v}%`, 'Theoretical QBER']}
                  labelFormatter={(l) => `${l} km`}
                />
                <ReferenceLine
                  y={11}
                  stroke="var(--q-accent-crimson, #e05252)"
                  strokeDasharray="4 4"
                  label={{
                    value: '11% threshold',
                    fill: 'var(--q-accent-crimson, #e05252)',
                    fontSize: 9,
                    fontFamily: 'monospace'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="theoretical"
                  stroke="var(--q-accent-cyan, #38bdf8)"
                  strokeWidth={2}
                  dot={false}
                />
                {qberEstimated && (
                  <ReferenceDot
                    x={Math.round(params.distance_km)}
                    y={parseFloat((results.qber * 100).toFixed(2))}
                    r={5}
                    fill="var(--q-accent-crimson, #e05252)"
                    stroke="var(--q-surface-0, #131317)"
                    strokeWidth={1.5}
                    label={{
                      value: `${(results.qber * 100).toFixed(1)}%`,
                      fill: 'var(--q-accent-crimson, #e05252)',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      position: 'top'
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SKR chart with simulated dot */}
          <div
            className="p-4 rounded border flex flex-col gap-3 select-none"
            style={{
              backgroundColor: 'var(--q-surface-1, #1a1a1e)',
              borderColor: 'var(--q-border, #34343d)'
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-body text-[var(--q-text-dim,#64748b)] uppercase tracking-wider font-semibold">
                SECRET KEY RATE (SKR) VS DISTANCE
              </span>
              <span className="text-[10px] font-body text-[var(--q-accent-emerald,#10b981)] font-semibold uppercase tracking-wider">
                ASYMPTOTIC SECURITY
              </span>
            </div>
            <div className="text-xs text-[var(--q-text-dim,#64748b)] font-body flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[var(--q-accent-emerald,#10b981)] inline-block" />
                Theoretical curve
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--q-accent-emerald,#10b981)] inline-block" />
                Measured at <span className="font-mono tabular-nums">{params.distance_km} km</span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart
                data={skrChartData}
                margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--q-border-subtle, #282830)" />
                <XAxis
                  dataKey="distance"
                  stroke="var(--q-text-dim, #64748b)"
                  tick={{ fill: 'var(--q-text-dim, #64748b)', fontSize: 10, fontFamily: 'monospace' }}
                  label={{ value: 'km', position: 'insideRight', fill: 'var(--q-text-dim, #64748b)', fontSize: 10 }}
                />
                <YAxis
                  stroke="var(--q-text-dim, #64748b)"
                  tick={{ fill: 'var(--q-text-dim, #64748b)', fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--q-surface-2, #222227)',
                    border: '1px solid var(--q-border, #34343d)',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'var(--q-text-bright, #f1f5f9)'
                  }}
                  formatter={(v) => [v.toFixed(4), 'Theoretical SKR']}
                  labelFormatter={(l) => `${l} km`}
                />
                <Line
                  type="monotone"
                  dataKey="theoretical"
                  stroke="var(--q-accent-emerald, #10b981)"
                  strokeWidth={2}
                  dot={false}
                />
                <ReferenceDot
                  x={Math.round(params.distance_km)}
                  y={parseFloat(results.skr.toFixed(4))}
                  r={5}
                  fill="var(--q-accent-emerald, #10b981)"
                  stroke="var(--q-surface-0, #131317)"
                  strokeWidth={1.5}
                  label={{
                    value: results.skr.toFixed(3),
                    fill: 'var(--q-accent-emerald, #10b981)',
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
        <div
          className="p-5 rounded border select-none"
          style={{
            backgroundColor: 'var(--q-surface-1, #1a1a1e)',
            borderColor: isUndetermined
              ? 'var(--q-accent-amber, #f59e0b)'
              : isSecure
              ? 'var(--q-accent-emerald, #10b981)'
              : 'var(--q-accent-crimson, #e05252)'
          }}
        >
          <div
            className="text-[11px] font-body uppercase tracking-wider mb-3 font-semibold"
            style={{
              color: isUndetermined
                ? 'var(--q-accent-amber, #f59e0b)'
                : isSecure
                ? 'var(--q-accent-emerald, #10b981)'
                : 'var(--q-accent-crimson, #e05252)'
            }}
          >
            PROTOCOL SECURITY CERTIFICATION
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-xl font-serif font-semibold"
                  style={{
                    color: isUndetermined
                      ? 'var(--q-accent-amber, #f59e0b)'
                      : isSecure
                      ? 'var(--q-accent-emerald, #10b981)'
                      : 'var(--q-accent-crimson, #e05252)'
                  }}
                >
                  {isUndetermined ? 'ⓘ QBER NOT ESTIMATED'
                    : isSecure ? '✓ QUANTUM SECURE VERIFIED' : '⚠ SECURITY THRESHOLD BREACHED'}
                </span>
              </div>
              <div className="text-sm font-body text-[var(--q-text-muted,#94a3b8)] leading-relaxed">
                {isUndetermined
                  ? `Insufficient sifted pulses to estimate QBER statistically (sifted key = ${results.sifted_key_length}). QBER is classified as undetermined rather than 0.0%, and key certification is suspended.`
                  : isSecure
                    ? `Observed QBER of ${(results.qber * 100).toFixed(2)}% is safely below the 11.0% Shor-Preskill security limit. Channel disturbance from eavesdropping is within acceptable bounds; privacy amplification can distill a secret key.`
                    : `Observed QBER of ${(results.qber * 100).toFixed(2)}% exceeds the 11.0% limit. Eavesdropping or channel disturbance is too high to guarantee secrecy. Transmission session aborted.`
                }
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-xs font-body">
              {[
                {
                  label: 'Eve Detection Alarm',
                  value: !qberEstimated ? 'Undetermined' : results.qber >= 0.11 ? 'Triggered (Breach)' : 'Silent (Safe)',
                  ok: qberEstimated && results.qber < 0.11
                },
                {
                  label: 'Adversary Tap Status',
                  value: eveActive ? `Active (${(params.attack_prob * 100).toFixed(0)}% attack)` : 'Inactive (0%)',
                  ok: !eveActive
                },
                {
                  label: 'Key Extraction Outcome',
                  value: isSecure ? 'Distillation Successful' : 'Session Aborted',
                  ok: isSecure
                },
                {
                  label: 'Distillable Key Length',
                  value: isSecure ? `~${Math.round(results.sifted_key_length * 0.9)} bits` : '0 bits',
                  ok: isSecure
                },
              ].map(item => (
                <div
                  key={item.label}
                  className="flex justify-between py-1.5 border-b"
                  style={{ borderColor: 'var(--q-border-subtle, #282830)' }}
                >
                  <span className="text-[var(--q-text-dim,#64748b)] font-medium">{item.label}</span>
                  <span
                    className="font-semibold"
                    style={{
                      color: item.ok
                        ? 'var(--q-accent-emerald, #10b981)'
                        : 'var(--q-accent-crimson, #e05252)'
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WCP Statistics — Realistic mode only */}
        {sourceModel === 'realistic' &&
          results.wcp_enabled &&
          results.wcp_stats &&
          Object.keys(results.wcp_stats).length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-body text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                Weak Coherent Pulse Statistics
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Vacuum Pulses',
                    value: `${((results.wcp_stats.vacuum_fraction || 0) * 100).toFixed(1)}%`,
                    color: '#6b7280',
                    note: 'No photon sent'
                  },
                  {
                    label: 'Single Photon',
                    value: `${((results.wcp_stats.single_fraction || 0) * 100).toFixed(1)}%`,
                    color: '#00aacc',
                    note: 'Secure'
                  },
                  {
                    label: 'Multi-Photon',
                    value: `${((results.wcp_stats.multi_fraction || 0) * 100).toFixed(1)}%`,
                    color: '#ccaa00',
                    note: 'PNS vulnerable'
                  },
                  {
                    label: 'Mean Photon μ',
                    value: params.mean_photon_number?.toFixed(2) || '0.20',
                    color: '#a855f7',
                    note: 'Per pulse'
                  },
                ].map(stat => (
                  <div key={stat.label}
                    className="p-3 rounded-lg flex flex-col gap-1"
                    style={{
                      backgroundColor: stat.color + '15',
                      border: `1px solid ${stat.color}30`
                    }}>
                    <div className="text-xs font-body font-medium text-gray-400 uppercase tracking-wider">
                      {stat.label}
                    </div>
                    <div className="text-lg font-mono font-bold tabular-nums"
                      style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-500 font-body">
                      {stat.note}
                    </div>
                  </div>
                ))}
              </div>

              {/* PNS warning if pns_stats present */}
              {results.pns_stats &&
                results.pns_stats.split_multi > 0 && (
                  <div className="p-3 rounded-lg"
                    style={{
                      backgroundColor: '#ccaa0015',
                      border: '1px solid #ccaa0040'
                    }}>
                    <div className="text-xs font-body text-yellow-400 font-semibold uppercase tracking-wider mb-2">
                      ⚠ PNS Attack Active
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs font-body">
                      <div>
                        <div className="text-gray-400 font-medium">Split photons</div>
                        <div className="text-yellow-400 font-mono font-bold tabular-nums">
                          {results.pns_stats.split_multi || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-medium">
                          Leaked fraction
                        </div>
                        <div className="text-yellow-400 font-mono font-bold tabular-nums">
                          {((results.pns_stats.leak_fraction || 0)
                            * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-medium">QBER shows</div>
                        <div className="text-green-400 font-mono font-bold tabular-nums">
                          {qberEstimated
                            ? `${(results.qber * 100).toFixed(2)}%`
                            : 'Not estimated'}
                          {qberEstimated && (
                            <span className="text-red-400 ml-1 font-body">
                              (misleading!)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 font-body leading-relaxed">
                      ℹ QBER appears secure but Eve has stolen key
                      information. Enable Decoy States to detect.
                    </div>
                  </div>
                )}

              {/* Decoy results if present */}
              {results.decoy_results &&
                Object.keys(results.decoy_results).length > 0 && (
                  <div className="p-3 rounded-lg"
                    style={{
                      backgroundColor: results.decoy_results.pns_detected
                        ? '#ff444415' : '#00ff8815',
                      border: `1px solid ${results.decoy_results.pns_detected
                        ? '#ff444440' : '#00ff8840'
                        }`
                    }}>
                    <div className="text-xs font-body font-semibold uppercase tracking-wider mb-2"
                      style={{
                        color: results.decoy_results.pns_detected
                          ? '#ff4444' : '#00ff88'
                      }}>
                      {results.decoy_results.pns_detected
                        ? '🚨 Decoy Protocol: PNS Attack Detected'
                        : '✓ Decoy Protocol: No PNS Attack'}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs font-body">
                      <div>
                        <div className="text-[var(--text-muted)] font-medium">Signal gain</div>
                        <div className="text-[var(--text-primary)] font-mono font-bold tabular-nums">
                          {((results.decoy_results.signal_gain || 0)
                            * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)] font-medium">Decoy gain</div>
                        <div className="text-[var(--text-primary)] font-mono font-bold tabular-nums">
                          {((results.decoy_results.decoy_gain || 0)
                            * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[var(--text-muted)] font-medium">Confidence</div>
                        <div className="font-mono font-bold tabular-nums"
                          style={{
                            color: results.decoy_results.pns_detected
                              ? '#ff4444' : '#00ff88'
                          }}>
                          {((results.decoy_results.confidence || 0)
                            * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}

        {/* One-Time Pad encryption demo */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{
                backgroundColor: 'var(--q-surface-2, #222227)',
                border: '1px solid var(--q-border, #34343d)',
                color: 'var(--q-accent-cyan, #38bdf8)'
              }}
            >
              <KeyRound size={15} />
            </div>
            <div>
              <div className="text-xs font-body font-medium uppercase tracking-wider text-[var(--q-text-dim,#64748b)] mb-0.5">
                Cryptographic Application
              </div>
              <div className="text-base font-serif font-semibold text-[var(--q-text-bright,#f1f5f9)]">
                One-Time Pad Encryption
              </div>
            </div>
          </div>
          <OneTimePad />
        </div>

        {/* Bit stream detail */}
        <div className="flex flex-col gap-3 select-none">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-body text-[var(--q-text-dim,#64748b)] uppercase tracking-wider font-semibold">
              QUANTUM BIT STREAM INSPECTION
              <span className="text-[var(--q-text-dim,#64748b)] ml-2 font-normal">
                (<span className="font-mono tabular-nums">{filteredBitStream.length}</span> of <span className="font-mono tabular-nums">{results.bit_stream.length}</span> pulses displayed)
              </span>
            </div>
            {/* Filters */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All Pulses' },
                { id: 'matched', label: 'Sifted Key' },
                { id: 'mismatch', label: 'Basis Mismatch' },
                { id: 'intercepted', label: 'Eve Intercepted' },
                { id: 'lost', label: 'Lost' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setBitStreamFilter(f.id)}
                  className={`px-2.5 py-1 text-[11px] font-body font-medium rounded border transition-colors ${
                    bitStreamFilter === f.id
                      ? 'border-[var(--q-accent-cyan,#38bdf8)] text-[var(--q-accent-cyan,#38bdf8)] bg-[var(--q-surface-2,#222227)] font-semibold'
                      : 'border-[var(--q-border-subtle,#282830)] text-[var(--q-text-muted,#94a3b8)] hover:text-[var(--q-text-bright,#f1f5f9)] hover:bg-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Inspection Card */}
          {inspectedPhoton && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded border flex flex-col gap-3 font-body"
              style={{
                backgroundColor: 'var(--q-surface-1, #1a1a1e)',
                borderColor: 'var(--q-border, #34343d)'
              }}
            >
              <div
                className="flex items-center justify-between pb-2 border-b"
                style={{ borderColor: 'var(--q-border-subtle, #282830)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-[var(--q-text-bright,#f1f5f9)]">
                    PULSE INSPECTION — PHOTON <span className="font-mono tabular-nums">#{inspectedPhoton.index}</span>
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-body font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: inspectedPhoton.match
                        ? 'rgba(16, 185, 129, 0.15)'
                        : inspectedPhoton.intercepted
                        ? 'rgba(224, 82, 82, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                      color: inspectedPhoton.match
                        ? 'var(--q-accent-emerald, #10b981)'
                        : inspectedPhoton.intercepted
                        ? 'var(--q-accent-crimson, #e05252)'
                        : 'var(--q-accent-amber, #f59e0b)',
                      border: `1px solid ${
                        inspectedPhoton.match
                          ? 'rgba(16, 185, 129, 0.4)'
                          : inspectedPhoton.intercepted
                          ? 'rgba(224, 82, 82, 0.4)'
                          : 'rgba(245, 158, 11, 0.4)'
                      }`
                    }}
                  >
                    {inspectedPhoton.match
                      ? 'SIFTED KEY BIT'
                      : inspectedPhoton.intercepted
                      ? 'EVE INTERCEPTED'
                      : inspectedPhoton.lost
                      ? 'PHOTON LOST'
                      : 'DISCARDED (MISMATCH)'}
                  </span>
                </div>
                <button
                  onClick={() => setInspectedPhoton(null)}
                  className="text-xs font-body font-medium text-[var(--q-text-dim,#64748b)] hover:text-[var(--q-text-bright,#f1f5f9)] transition-colors px-2 py-1 rounded hover:bg-white/5"
                >
                  ✕ Close Inspector
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Alice Source Stage */}
                <div
                  className="p-3 rounded flex flex-col gap-1.5"
                  style={{
                    backgroundColor: 'var(--q-surface-0, #131317)',
                    border: '1px solid var(--q-border-subtle, #282830)'
                  }}
                >
                  <span className="text-[10px] uppercase tracking-wider text-[var(--q-accent-cyan,#38bdf8)] font-semibold">
                    1. Alice State Preparation
                  </span>
                  <div className="flex justify-between font-body">
                    <span className="text-[var(--q-text-dim,#64748b)]">Raw Bit:</span>
                    <span className="text-[var(--q-text-bright,#f1f5f9)] font-mono font-bold tabular-nums">{inspectedPhoton.alice_bit}</span>
                  </div>
                  <div className="flex justify-between font-body">
                    <span className="text-[var(--q-text-dim,#64748b)]">Encoding Basis:</span>
                    <span
                      style={{
                        color: inspectedPhoton.alice_basis === '+'
                          ? 'var(--q-accent-cyan, #38bdf8)'
                          : 'var(--q-accent-violet, #c084fc)'
                      }}
                    >
                      <span className="font-mono font-bold">[{inspectedPhoton.alice_basis}]</span> {inspectedPhoton.alice_basis === '+' ? 'Rectilinear (0°/90°)' : 'Diagonal (45°/135°)'}
                    </span>
                  </div>
                  <div className="flex justify-between font-body">
                    <span className="text-[var(--q-text-dim,#64748b)]">State Vector:</span>
                    <span className="text-[var(--q-text-bright,#f1f5f9)] font-mono font-bold">
                      {inspectedPhoton.alice_basis === '+'
                        ? (inspectedPhoton.alice_bit === 0 ? '|0⟩' : '|1⟩')
                        : (inspectedPhoton.alice_bit === 0 ? '|+⟩' : '|−⟩')} ({inspectedPhoton.polarization_angle ?? (inspectedPhoton.alice_basis === '+' ? (inspectedPhoton.alice_bit === 0 ? 0 : 90) : (inspectedPhoton.alice_bit === 0 ? 45 : 135))}°)
                    </span>
                  </div>
                </div>

                {/* Optical Channel / Eve Stage */}
                <div
                  className="p-3 rounded flex flex-col gap-1.5"
                  style={{
                    backgroundColor: 'var(--q-surface-0, #131317)',
                    border: '1px solid var(--q-border-subtle, #282830)'
                  }}
                >
                  <span className="text-[10px] uppercase tracking-wider text-[var(--q-text-bright,#f1f5f9)] font-semibold">
                    2. Channel Transit & Eavesdropping
                  </span>
                  <div className="flex justify-between font-body">
                    <span className="text-[var(--q-text-dim,#64748b)]">Fiber Attenuation:</span>
                    <span className="text-[var(--q-text-bright,#f1f5f9)]">
                      {inspectedPhoton.lost ? 'Absorbed in glass' : 'Survived (T > 0)'}
                    </span>
                  </div>
                  <div className="flex justify-between font-body">
                    <span className="text-[var(--q-text-dim,#64748b)]">Eve Intercepted:</span>
                    <span
                      className="font-semibold"
                      style={{
                        color: inspectedPhoton.intercepted
                          ? 'var(--q-accent-crimson, #e05252)'
                          : 'var(--q-accent-emerald, #10b981)'
                      }}
                    >
                      {inspectedPhoton.intercepted ? 'YES (⚡ State Perturbed)' : 'NO'}
                    </span>
                  </div>
                  {inspectedPhoton.intercepted && (
                    <div className="flex justify-between font-body">
                      <span className="text-[var(--q-text-dim,#64748b)]">Eve Resend Angle:</span>
                      <span className="text-[var(--q-accent-crimson,#e05252)] font-mono tabular-nums">
                        {inspectedPhoton.eve_resend_angle ?? 'Measured'}°
                      </span>
                    </div>
                  )}
                </div>

                {/* Bob Receiver Stage */}
                <div
                  className="p-3 rounded flex flex-col gap-1.5"
                  style={{
                    backgroundColor: 'var(--q-surface-0, #131317)',
                    border: '1px solid var(--q-border-subtle, #282830)'
                  }}
                >
                  <span className="text-[10px] uppercase tracking-wider text-[var(--q-accent-emerald,#10b981)] font-semibold">
                    3. Bob SPAD Detection
                  </span>
                  <div className="flex justify-between font-body">
                    <span className="text-[var(--q-text-dim,#64748b)]">Measurement Basis:</span>
                    <span
                      className="font-mono font-bold"
                      style={{
                        color: inspectedPhoton.bob_basis === '+'
                          ? 'var(--q-accent-cyan, #38bdf8)'
                          : 'var(--q-accent-violet, #c084fc)'
                      }}
                    >
                      [{inspectedPhoton.bob_basis}]
                    </span>
                  </div>
                  <div className="flex justify-between font-body">
                    <span className="text-[var(--q-text-dim,#64748b)]">Registered Bit:</span>
                    <span className="text-[var(--q-text-bright,#f1f5f9)] font-mono font-bold tabular-nums">
                      {inspectedPhoton.bob_bit !== undefined ? inspectedPhoton.bob_bit : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between font-body">
                    <span className="text-[var(--q-text-dim,#64748b)]">Basis Sifting:</span>
                    <span
                      className="font-semibold"
                      style={{
                        color: inspectedPhoton.match
                          ? 'var(--q-accent-emerald, #10b981)'
                          : 'var(--q-accent-amber, #f59e0b)'
                      }}
                    >
                      {inspectedPhoton.match ? '✓ Kept in Secret Key' : '✕ Discarded (Mismatched)'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div
            className="overflow-auto max-h-96 rounded border"
            style={{
              backgroundColor: 'var(--q-surface-1, #1a1a1e)',
              borderColor: 'var(--q-border, #34343d)'
            }}
          >
            <table className="w-full text-xs font-body">
              <thead className="sticky top-0" style={{ backgroundColor: 'var(--q-surface-2, #222227)' }}>
                <tr style={{ borderBottom: '1px solid var(--q-border-subtle, #282830)' }}>
                  {['#', 'Alice Bit', 'A. Basis', 'B. Basis', 'Bob Bit', 'Match', 'Eve', 'Angle', 'Action'].map(h => (
                    <th
                      key={h}
                      className="text-left px-3.5 py-2.5 text-[var(--q-text-dim,#64748b)] uppercase tracking-wider text-[11px] font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBitStream.map((photon) => {
                  const isInspected = inspectedPhoton?.index === photon.index
                  return (
                    <tr
                      key={photon.index}
                      onClick={() => setInspectedPhoton(photon)}
                      className={`cursor-pointer transition-colors hover:bg-white/5 ${
                        isInspected ? 'bg-white/5' : ''
                      }`}
                      style={{
                        borderBottom: '1px solid var(--q-border-subtle, #282830)',
                        borderLeft: isInspected ? '2px solid var(--q-accent-cyan, #38bdf8)' : '2px solid transparent'
                      }}
                    >
                      <td className="px-3.5 py-2 text-[var(--q-text-dim,#64748b)] font-mono tabular-nums">
                        {photon.index}
                      </td>
                      <td className="px-3.5 py-2 text-[var(--q-text-bright,#f1f5f9)] font-mono font-semibold tabular-nums">
                        {photon.alice_bit}
                      </td>
                      <td
                        className="px-3.5 py-2 font-mono font-bold"
                        style={{
                          color: photon.alice_basis === '+'
                            ? 'var(--q-accent-cyan, #38bdf8)'
                            : 'var(--q-accent-violet, #c084fc)'
                        }}
                      >
                        [{photon.alice_basis}]
                      </td>
                      <td
                        className="px-3.5 py-2 font-mono font-bold"
                        style={{
                          color: photon.bob_basis === '+'
                            ? 'var(--q-accent-cyan, #38bdf8)'
                            : 'var(--q-accent-violet, #c084fc)'
                        }}
                      >
                        [{photon.bob_basis}]
                      </td>
                      <td className="px-3.5 py-2 text-[var(--q-text-bright,#f1f5f9)] font-mono tabular-nums">
                        {photon.bob_bit ?? '—'}
                      </td>
                      <td className="px-3.5 py-2 font-body">
                        <span
                          className="font-semibold text-[11px]"
                          style={{
                            color: photon.match
                              ? 'var(--q-accent-emerald, #10b981)'
                              : 'var(--q-text-dim, #64748b)'
                          }}
                        >
                          {photon.match ? '✓ MATCH' : '✕'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 font-body">
                        <span
                          className="font-semibold text-[11px]"
                          style={{
                            color: photon.intercepted
                              ? 'var(--q-accent-crimson, #e05252)'
                              : 'var(--q-text-dim, #64748b)'
                          }}
                        >
                          {photon.intercepted ? '⚡ TAP' : '—'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-[var(--q-text-dim,#64748b)] font-mono tabular-nums">
                        {photon.polarization_angle ?? '0'}°
                      </td>
                      <td className="px-3.5 py-2 font-body">
                        <button
                          type="button"
                          className="text-[10px] font-body font-medium px-2 py-0.5 rounded border transition-colors hover:text-white"
                          style={{
                            borderColor: 'var(--q-border-subtle, #282830)',
                            color: 'var(--q-text-muted, #94a3b8)',
                            backgroundColor: 'var(--q-surface-2, #222227)'
                          }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
