/**
 * SimulatorControls.jsx
 * 
 * Simulator-specific control bar.
 * Contains: Status indicator, View tabs, Run/Reset/Save/Load buttons, Gate controls
 */
import { motion } from 'framer-motion'
import { useSimulation } from '../../hooks/useSimulation'
import { useState } from 'react'
import SaveExperimentModal from '../experiments/SaveExperimentModal'
import LoadExperimentModal from '../experiments/LoadExperimentModal'
import useSimulationStore from '../../store/simulationStore'

export default function SimulatorControls() {
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const { runSimulation, isLoading } = useSimulation()
  const { results, reset, placedGates, clearGates, openInspector, inspector, activeView, setActiveView, animation, togglePause } = useSimulationStore()

  const isBreached = results?.secure_threshold_breached ?? false
  const hasResults = results !== null

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 h-12 flex-shrink-0"
           style={{
             backgroundColor: 'var(--panel-bg)',
             borderBottom: '1px solid var(--border-color)'
           }}>
        
        {/* Left: Status Indicator */}
        <div className="flex items-center gap-2">
          {isLoading && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex items-center gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span className="text-xs font-mono text-yellow-400">SIMULATING</span>
            </motion.div>
          )}
          {!isLoading && hasResults && !isBreached && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs font-mono text-green-500">SECURE</span>
            </div>
          )}
          {!isLoading && hasResults && isBreached && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="flex items-center gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-xs font-mono text-red-500">BREACH DETECTED</span>
            </motion.div>
          )}
          {!isLoading && !hasResults && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)]" />
              <span className="text-xs font-mono text-[var(--text-muted)]">READY</span>
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* View Tabs */}
          <div className="flex items-center gap-1 border border-[var(--border-color)] rounded p-0.5">
            {[
              { id: 'simulator', label: 'SIM' },
              { id: 'results', label: 'RESULTS' },
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  activeView === view.id
                    ? 'bg-quantum-blue text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {/* Reset Button */}
          <button
            onClick={reset}
            disabled={isLoading || !hasResults}
            className="px-3 py-1 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-subtle)] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            RESET
          </button>

          {/* Save Button */}
          <button
            onClick={() => setSaveModalOpen(true)}
            className="px-3 py-1 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-subtle)] rounded transition-colors"
          >
            💾 SAVE
          </button>

          {/* Load Button */}
          <button
            onClick={() => setLoadModalOpen(true)}
            className="px-3 py-1 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--text-subtle)] rounded transition-colors"
          >
            📂 LOAD
          </button>

          {/* Clear Gates Button */}
          {placedGates.length > 0 && (
            <button
              onClick={clearGates}
              className="px-3 py-1 text-xs font-mono border border-[var(--border-color)] rounded text-[var(--text-muted)] hover:text-red-400 hover:border-red-800 transition-colors"
            >
              ✕ GATES ({placedGates.length})
            </button>
          )}

          {/* Inspector Button */}
          {results && results.bit_stream?.length > 0 && (
            <button
              onClick={openInspector}
              className="px-3 py-1 text-xs font-mono border rounded transition-colors"
              style={{
                borderColor: inspector.isOpen ? '#00aacc' : 'var(--border-color)',
                color: inspector.isOpen ? '#00aacc' : 'var(--text-muted)',
                backgroundColor: inspector.isOpen ? '#00aacc15' : 'transparent'
              }}
            >
              🔍 INSPECT
            </button>
          )}

          {/* Pause Button */}
          {results && (
            <button
              onClick={togglePause}
              className="px-3 py-1 text-xs font-mono border rounded transition-colors border-[var(--border-color)] hover:border-[var(--text-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {animation.isPaused ? '▶ RESUME' : '⏸ PAUSE'}
            </button>
          )}

          {/* Run Button */}
          <button
            onClick={runSimulation}
            disabled={isLoading}
            className="px-4 py-1 text-xs font-mono font-semibold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isLoading ? '#555' : '#00c8ff',
              color: '#000',
              border: 'none'
            }}
          >
            {isLoading ? 'RUNNING...' : '▶ RUN'}
          </button>
        </div>
      </div>

      {/* Modals */}
      <SaveExperimentModal isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} />
      <LoadExperimentModal isOpen={loadModalOpen} onClose={() => setLoadModalOpen(false)} />
    </>
  )
}
