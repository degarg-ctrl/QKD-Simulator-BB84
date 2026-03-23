/**
 * src/components/layout/BottomPanel.jsx
 *
 * Bottom panel containing metrics, charts, and bit stream table.
 * Has two tabs: "Performance" (metrics + charts) and "Bit Stream" 
 * (per-photon data table).
 * Only visible after simulation has run.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'
import MetricCard from '../metrics/MetricCard'
import QBERChart from '../metrics/QBERChart'
import SKRChart from '../metrics/SKRChart'

export default function BottomPanel({ className = '' }) {
  const { results } = useSimulationStore()
  const [activeTab, setActiveTab] = useState('metrics')

  if (!results) return null

  const tabs = [
    { id: 'metrics', label: 'Performance & Security' },
    { id: 'bitstream',   label: 'Bit Stream' },
  ]

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex-shrink-0 overflow-hidden ${className}`}
      style={{ 
        borderTop: '1px solid rgba(255,255,255,0.2)',
        backgroundColor: '#242424'
      }}
    >
      {/* Tab bar */}
      <div className="flex items-center px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-mono tracking-wider
                       border-b-2 transition-colors
                       ${activeTab === tab.id
                         ? 'border-indigo-500 text-white'
                         : 'border-transparent text-gray-500 hover:text-gray-300'
                       }`}
          >
            {tab.label}
          </button>
        ))}
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
                            text-xs font-mono text-gray-600
                            overflow-hidden">
              <span className="text-gray-700">ℹ</span>
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
                <tr className="text-gray-500 border-b border-gray-800 text-left">
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
                      className={`border-b border-gray-900/50
                        ${photon.intercepted ? 'bg-red-950/20' : ''}
                        ${photon.match ? '' : 'opacity-40'}
                      `}>
                    <td className="py-1 pr-4 text-gray-600">
                      {photon.index}
                    </td>
                    <td className="py-1 pr-4 text-gray-300">
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
                    <td className="py-1 pr-4 text-gray-300">
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
                    <td className="py-1 text-gray-400">
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
