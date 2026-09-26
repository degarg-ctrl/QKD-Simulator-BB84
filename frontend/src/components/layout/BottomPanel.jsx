/**
 * src/components/layout/BottomPanel.jsx
 *
 * Bottom results panel: Performance / Transmission / Bit Stream tabs.
 *
 * Layout contract:
 *   - Simulation canvas remains the PRIMARY workspace — the panel's
 *     expanded height is clamped to [120px, 45%] of the workspace
 *     and defaults to ~26%.
 *   - Collapsed: a single compact summary bar.
 *   - Expanded: draggable resize handle on the top edge; the panel
 *     is bounded within the workspace and resizing does not
 *     interfere with the canvas (the handle is the only drag
 *     surface, pointer-events elsewhere pass through normally).
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import useSimulationStore from '../../store/simulationStore'
import MetricCard from '../metrics/MetricCard'
import QBERChart from '../metrics/QBERChart'
import SKRChart from '../metrics/SKRChart'
import TransmissionPanel from '../results/TransmissionPanel'

const MIN_HEIGHT = 120
const MAX_FRACTION = 0.45

export default function BottomPanel({ className = '' }) {
  const { results, bottomPanelCollapsed,
    toggleBottomPanel, liveArrivals, params } = useSimulationStore()
  const [activeTab, setActiveTab] = useState('metrics')
  const [tabDirection, setTabDirection] = useState(0)
  const [height, setHeight] = useState(270)   // comfortable height for charts + disclaimer
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef(null)
  const resizeStart = useRef(null)

  const tabs = [
    { id: 'metrics', label: 'Performance' },
    { id: 'transmission', label: 'Transmission' },
    { id: 'bitstream', label: 'Bit Stream' },
  ]

  const tabIndices = { metrics: 0, transmission: 1, bitstream: 2 }
  const handleTabChange = (newTabId) => {
    if (newTabId === activeTab) return
    const currentIdx = tabIndices[activeTab] ?? 0
    const nextIdx = tabIndices[newTabId] ?? 0
    setTabDirection(nextIdx > currentIdx ? 1 : -1)
    setActiveTab(newTabId)
  }

  // ── Drag-resize (from the top edge) ─────────────────────────
  const onResizeStart = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStart.current = { y: e.clientY, height }
  }, [height])

  useEffect(() => {
    if (!isResizing) return
    const onMove = (e) => {
      const delta = resizeStart.current.y - e.clientY
      const workspace = panelRef.current?.parentElement?.clientHeight
        ?? window.innerHeight
      const maxH = Math.floor(workspace * MAX_FRACTION)
      setHeight(Math.min(Math.max(resizeStart.current.height + delta,
        MIN_HEIGHT), maxH))
    }
    const onUp = () => setIsResizing(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isResizing])

  // ── Collapsed: compact summary bar ──────────────────────────
  if (bottomPanelCollapsed) {
    return (
      <div
        className="flex items-center justify-between px-4 py-2
                   flex-shrink-0 cursor-pointer transition-colors"
        style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--panel-bg)'
        }}
        onClick={toggleBottomPanel}
      >
        <div className="flex items-center gap-2">
          <ChevronUp size={13} className="text-[var(--text-muted)]" />
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Results
          </span>
          {results && (
            <span className="text-xs font-mono tabular-nums
                             text-[var(--text-subtle)]">
              QBER {results.qber_estimated && results.qber != null
                ? `${(results.qber * 100).toFixed(2)}%`
                : 'n/a'} · SKR {results.skr.toFixed(3)}
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--text-subtle)]">
          Click to expand
        </span>
      </div>
    )
  }

  // ── No results: minimal placeholder ─────────────────────────
  if (!results) return (
    <div
      className="flex items-center justify-between px-4 py-2 flex-shrink-0"
      style={{
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--panel-bg)'
      }}
    >
      <span className="text-xs text-[var(--text-subtle)]">
        Run a simulation to see results
      </span>
      <button onClick={toggleBottomPanel}
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]
                         transition-colors">
        <ChevronDown size={14} />
      </button>
    </div>
  )

  // ── Expanded panel ──────────────────────────────────────────
  return (
    <div
      ref={panelRef}
      className={`flex flex-col flex-shrink-0 ${className}`}
      style={{
        height,
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--panel-bg)',
        userSelect: isResizing ? 'none' : undefined
      }}
    >
      {/* Resize handle — the ONLY drag surface (cursor: ns-resize) */}
      <div
        onMouseDown={onResizeStart}
        className="h-1.5 cursor-ns-resize hover:bg-[#00B8E6]/30
                   transition-colors flex-shrink-0"
        style={isResizing ? { backgroundColor: 'rgba(0,184,230,0.35)' }
          : undefined}
        title="Drag to resize"
      />

      {/* Tab bar */}
      <div
        className="flex items-center px-4 flex-shrink-0 bg-[var(--q-surface-1,var(--panel-bg))]"
        style={{ borderBottom: '1px solid var(--q-border-subtle,var(--border-color))' }}
      >
        <div className="flex items-center gap-1.5 py-1.5 relative">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative px-4 py-1.5 text-sm font-body font-semibold rounded-md transition-colors z-10 ${
                  isActive
                    ? 'text-[var(--q-text-1,#ffffff)]'
                    : 'text-[var(--q-text-3,#8e8e93)] hover:text-[var(--q-text-1,#ffffff)]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomTab"
                    className="absolute inset-0 rounded-md bg-white/10 border border-white/20 shadow-sm -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                {tab.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={toggleBottomPanel}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-body font-medium
                     text-[var(--q-text-3)] hover:text-[var(--q-text-1)] rounded hover:bg-white/5
                     transition-colors"
          title="Collapse panel"
        >
          <span>Collapse</span> <ChevronDown size={14} />
        </button>
      </div>

      {/* Tab content (scrollable) */}
      <div className="flex-1 p-4 overflow-y-auto min-h-0 relative">
        <AnimatePresence mode="wait" custom={tabDirection}>
          <motion.div
            key={activeTab}
            custom={tabDirection}
            variants={{
              enter: (dir) => ({ x: dir * 20, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir) => ({ x: dir * -20, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="h-full"
          >
            {activeTab === 'metrics' && (
              <div className="flex gap-6 min-h-0 items-start h-full">
                <div className="grid grid-cols-2 gap-3 w-80 flex-shrink-0">
                  <MetricCard
                    label="QBER"
                    value={results.qber_estimated && results.qber != null
                      ? (results.qber * 100).toFixed(2) : '—'}
                    unit={results.qber_estimated && results.qber != null ? '%' : ''}
                    status={!results.qber_estimated ? 'inactive'
                      : results.qber >= 0.11 ? 'danger'
                        : results.qber >= 0.07 ? 'warning' : 'normal'}
                    subtitle={!results.qber_estimated
                      ? 'Not estimated (small sample)'
                      : results.secure_threshold_breached
                        ? 'Session aborted' : 'Secure'}
                    gauge={results.qber_estimated && results.qber != null ? {
                      value: results.qber * 100,
                      max: 11,
                      label: 'BB84 Limit: 11%'
                    } : undefined}
                  />
                  <MetricCard
                    label="SKR"
                    value={results.skr.toFixed(3)} unit="bits/bit"
                    status={results.skr === 0 ? 'danger'
                      : results.skr < 0.05 ? 'warning' : 'normal'}
                  />
                  <MetricCard
                    label="Sifted Key"
                    value={results.sifted_key_length.toLocaleString()}
                    unit="bits" status="normal"
                    subtitle={`of ${results.raw_key_length.toLocaleString()} raw`}
                  />
                  <MetricCard
                    label="Efficiency"
                    value={results.efficiency.toFixed(1)} unit="%"
                    status={results.efficiency < 5 ? 'warning' : 'normal'}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0 h-full">
                  <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                    <QBERChart
                      data={results.qber_vs_distance}
                      currentQBER={results.qber}
                      distance={params?.distance_km}
                    />
                    <SKRChart
                      data={results.skr_vs_distance}
                      currentSKR={results.skr}
                      distance={params?.distance_km}
                    />
                  </div>
                  <div className="pt-2 mt-1 flex items-center gap-2 text-xs text-[var(--text-subtle)] border-t border-[var(--border-color)]/30 flex-shrink-0">
                    <span className="text-[var(--text-muted)]">ℹ</span>
                    <span>
                      Graph shows the theoretical model across distances.
                      Simulated value shows your actual run result.
                      Differences are normal at low photon counts — use
                      n_bits ≥ 5000 for convergence.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transmission' && (
              <TransmissionPanel results={results} />
            )}

            {activeTab === 'bitstream' && (() => {
              const isLive = liveArrivals && liveArrivals.length > 0 && liveArrivals.length < (results.bit_stream?.length || 0)
              const displayList = (liveArrivals && liveArrivals.length > 0)
                ? [...liveArrivals].sort((a, b) => a.index - b.index)
                : (results.bit_stream || [])

              return (
                <div className="overflow-auto h-full flex flex-col">
                  <div className="px-2 py-2 flex items-center justify-between text-sm font-body text-[var(--text-primary)] border-b border-[var(--border-color)] flex-shrink-0 bg-[var(--panel-bg)]">
                    <div className="flex items-center gap-2">
                      {isLive ? (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-emerald-400 font-semibold">LIVE STREAM:</span>
                          <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">{displayList.length} / {results.bit_stream?.length} detected photons received</span>
                        </>
                      ) : (
                        <span className="font-semibold text-xs">Total Detected Photons: <span className="font-mono tabular-nums">{displayList.length}</span></span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">Entries appear as photons are received by Bob</span>
                  </div>
                  <div className="overflow-auto flex-1">
                    <table className="w-full text-xs font-mono">
                      <thead className="font-body">
                        <tr className="text-[var(--text-secondary)]
                                       border-b border-[var(--border-color)] text-left sticky top-0 bg-[var(--panel-bg)]">
                          <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[11px]">#</th>
                          <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[11px]">Alice Bit</th>
                          <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[11px]">A. Basis</th>
                          <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[11px]">B. Basis</th>
                          <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[11px]">Bob Bit</th>
                          <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[11px]">Match</th>
                          <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[11px]">Intercepted</th>
                          <th className="py-2.5 pr-4 font-semibold uppercase tracking-wider text-[11px]">Angle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayList.map((photon, i) => (
                          <tr key={`${photon.index}-${i}`}
                            className={`border-b border-[var(--border-color)]
                                ${photon.intercepted ? 'bg-red-950/20' : ''}
                                ${photon.match ? '' : 'opacity-40'}`}>
                            <td className="py-1.5 pr-4 text-[var(--text-muted)]">
                              {photon.index}
                            </td>
                            <td className="py-1 pr-4 text-[var(--text-muted)]">
                              {photon.alice_bit}
                            </td>
                            <td className="py-1 pr-4" style={{
                              color: photon.alice_basis === '+'
                                ? '#00B8E6' : '#c084fc'
                            }}>
                              {photon.alice_basis}
                            </td>
                            <td className="py-1 pr-4" style={{
                              color: photon.bob_basis === '+'
                                ? '#00B8E6' : '#c084fc'
                            }}>
                              {photon.bob_basis}
                            </td>
                            <td className="py-1 pr-4 text-[var(--text-muted)]">
                              {photon.bob_bit}
                            </td>
                            <td className="py-1 pr-4">
                              <span className={photon.match
                                ? 'text-[#22C55E]' : 'text-gray-600'}>
                                {photon.match ? '✓' : '✕'}
                              </span>
                            </td>
                            <td className="py-1 pr-4">
                              <span className={photon.intercepted
                                ? 'text-[#EF4444]' : 'text-gray-600'}>
                                {photon.intercepted ? '⚡' : '—'}
                              </span>
                            </td>
                            <td className="py-1 text-[var(--text-subtle)]">
                              {photon.polarization_angle}°
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
