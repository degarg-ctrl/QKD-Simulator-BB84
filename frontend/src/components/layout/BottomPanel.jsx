/**
 * src/components/layout/BottomPanel.jsx
 *
 * Bottom panel containing metrics, charts, and bit stream table.
 * Has two tabs: "Performance" (metrics + charts) and "Bit Stream" 
 * (per-photon data table).
 * Only visible after simulation has run.
 * Supports collapse/expand toggle.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'
import MetricCard from '../metrics/MetricCard'
import QBERChart from '../metrics/QBERChart'
import SKRChart from '../metrics/SKRChart'

export default function BottomPanel({ className = '' }) {
  const { results, bottomPanelCollapsed, 
          toggleBottomPanel } = useSimulationStore()
  const [activeTab, setActiveTab] = useState('metrics')

  const tabs = [
    { id: 'metrics', label: 'Performance & Security' },
    { id: 'bitstream',   label: 'Bit Stream' },
  ]

  // Collapsed state — thin bar with toggle
  if (bottomPanelCollapsed) {
    return (
      <div
        className="flex items-center justify-between 
                   px-4 py-2 flex-shrink-0 cursor-pointer
                   hover:bg-white/5 transition-colors"
        style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--panel-bg)'
        }}
        onClick={toggleBottomPanel}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[var(--text-muted)]">
            ▲ Performance & Security
          </span>
          {results && (
            <span className="text-xs font-mono text-[var(--text-subtle)]">
              QBER: {(results.qber * 100).toFixed(2)}% 
              · SKR: {results.skr.toFixed(3)}
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-[var(--text-subtle)]">
          Click to expand
        </span>
      </div>
    )
  }

  // Normal expanded state — no results yet
  if (!results) return (
    <div
      className="flex items-center justify-between 
                 px-4 py-2 flex-shrink-0"
      style={{
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--panel-bg)'
      }}
    >
      <span className="text-xs font-mono text-[var(--text-subtle)]">
        Run a simulation to see results
      </span>
      <span className="text-xs font-mono text-[var(--text-subtle)] 
                       cursor-pointer hover:text-[var(--text-primary)]"
            onClick={toggleBottomPanel}>
        ▼
      </span>
    </div>
  )

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex-shrink-0 overflow-hidden ${className}`}
      style={{ 
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--panel-bg)'
      }}
    >
      {/* Tab bar with collapse toggle */}
      <div className="flex items-center px-4"
           style={{ borderBottom: '1px solid var(--border-color)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-mono tracking-wider
                       border-b-2 transition-colors
                       ${activeTab === tab.id
                         ? 'border-indigo-500 text-[var(--text-primary)]'
                         : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-subtle)]'
                       }`}
          >
            {tab.label}
          </button>
        ))}
        {/* Collapse button on right */}
        <button
          onClick={toggleBottomPanel}
          className="ml-auto text-xs font-mono text-[var(--text-muted)]
                     hover:text-[var(--text-primary)] transition-colors 
                     px-2 py-2"
          title="Collapse panel"
        >
          ▼ collapse
        </button>
      </div>

      {/* Tab content */}
      <div className="p-4 overflow-hidden">
        {activeTab === 'metrics' && (
          <div className="flex gap-6 min-h-0 items-start">
            {/* Metric cards */}
            <div className="grid grid-cols-2 gap-3 w-72 flex-shrink-0">
              <MetricCard
                label="QBER"
                value={(results.qber * 100).toFixed(2)}
                unit="%"
                status={
                  results.qber >= 0.11 ? 'danger' :
                  results.qber >= 0.07 ? 'warning' : 'normal'
                }
                subtitle={results.secure_threshold_breached
                  ? 'Session aborted' : 'Secure'}
              />
              <MetricCard
                label="SKR"
                value={results.skr.toFixed(3)}
                unit="bits/bit"
                status={results.skr === 0 ? 'danger' :
                        results.skr < 0.05 ? 'warning' : 'normal'}
              />
              <MetricCard
                label="Sifted Key"
                value={results.sifted_key_length.toLocaleString()}
                unit="bits"
                status="normal"
                subtitle={`of ${results.raw_key_length.toLocaleString()} raw`}
              />
              <MetricCard
                label="Efficiency"
                value={results.efficiency.toFixed(1)}
                unit="%"
                status={results.efficiency < 5 ? 'warning' : 'normal'}
              />
            </div>
            {/* Charts and Note Container */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Charts */}
            <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
              <QBERChart
                data={results.qber_vs_distance}
                currentQBER={results.qber}
              />
              <SKRChart
                data={results.skr_vs_distance}
                currentSKR={results.skr}
              />
            </div>
            {/* Theoretical vs Simulated explanation */}
            <div className="mt-2 flex items-start gap-2 
                            text-xs font-mono text-[var(--text-subtle)]
                            overflow-hidden">
              <span className="text-[var(--text-muted)]">ℹ</span>
              <span>
                Graph shows theoretical model across distances. 
                Simulated value shows your actual run result. 
                Differences are normal at low photon counts — 
                use n_bits ≥ 5000 for convergence.
              </span>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'bitstream' && (
          <div className="overflow-auto max-h-48">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[var(--text-muted)] border-b border-[var(--border-color)] text-left">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Alice Bit</th>
                  <th className="py-2 pr-4">A. Basis</th>
                  <th className="py-2 pr-4">B. Basis</th>
                  <th className="py-2 pr-4">Bob Bit</th>
                  <th className="py-2 pr-4">Match</th>
                  <th className="py-2 pr-4">Intercepted</th>
                  <th className="py-2">Angle</th>
                </tr>
              </thead>
              <tbody>
                {results.bit_stream.map((photon, i) => (
                  <tr key={i}
                      className={`border-b border-[var(--border-color)]
                        ${photon.intercepted ? 'bg-red-950/20' : ''}
                        ${photon.match ? '' : 'opacity-40'}
                      `}>
                    <td className="py-1 pr-4 text-[var(--text-muted)]">
                      {photon.index}
                    </td>
                    <td className="py-1 pr-4 text-[var(--text-muted)]">
                      {photon.alice_bit}
                    </td>
                    <td className="py-1 pr-4" style={{
                      color: photon.alice_basis === '+' 
                        ? '#6366f1' : '#a855f7'
                    }}>
                      {photon.alice_basis}
                    </td>
                    <td className="py-1 pr-4" style={{
                      color: photon.bob_basis === '+' 
                        ? '#6366f1' : '#a855f7'
                    }}>
                      {photon.bob_basis}
                    </td>
                    <td className="py-1 pr-4 text-[var(--text-muted)]">
                      {photon.bob_bit}
                    </td>
                    <td className="py-1 pr-4">
                      <span className={photon.match 
                        ? 'text-green-400' : 'text-gray-600'}>
                        {photon.match ? '✓' : '✗'}
                      </span>
                    </td>
                    <td className="py-1 pr-4">
                      <span className={photon.intercepted 
                        ? 'text-red-400' : 'text-gray-600'}>
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
        )}
      </div>
    </motion.div>
  )
}
