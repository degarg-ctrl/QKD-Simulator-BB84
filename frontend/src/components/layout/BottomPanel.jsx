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
  const [activeTab, setActiveTab] = useState('performance')

  if (!results) return null

  const tabs = [
    { id: 'performance', label: 'Performance & Security' },
    { id: 'bitstream',   label: 'Bit Stream' },
  ]

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`border-t border-gray-800 bg-[#11111a] 
                  flex-shrink-0 ${className}`}
    >
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-800 px-4">
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
        {activeTab === 'performance' && (
          <div className="flex gap-6">
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
            {/* Charts */}
            <div className="flex-1 grid grid-cols-2 gap-6">
              <QBERChart
                data={results.qber_vs_distance}
                currentQBER={results.qber}
              />
              <SKRChart
                data={results.skr_vs_distance}
                currentSKR={results.skr}
              />
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
