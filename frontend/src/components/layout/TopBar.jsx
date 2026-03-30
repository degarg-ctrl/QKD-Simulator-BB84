/**
 * src/components/layout/TopBar.jsx
 *
 * Top navigation bar for QKD Simulator.
 * Contains: logo, protocol badge, status indicator,
 * navigation link to Guide, Reset and Run buttons.
 */
import { motion } from 'framer-motion'
import { useSimulation } from '../../hooks/useSimulation'
import { useState } from 'react'
import SaveExperimentModal from '../experiments/SaveExperimentModal'
import LoadExperimentModal from '../experiments/LoadExperimentModal'
import useSimulationStore from '../../store/simulationStore'

export default function TopBar() {
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const { runSimulation, isLoading } = useSimulation()
  const { results, reset, params, animation, 
          togglePause, placedGates, clearGates,
          openInspector, inspector,
          activeView, setActiveView,
          theme, setTheme } = useSimulationStore()

  const isBreached = results?.secure_threshold_breached ?? false
  const hasResults = results !== null

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2
                      flex-shrink-0 h-12"
           style={{
             backgroundColor: 'var(--panel-bg)',
             borderBottom: '1px solid var(--border-color)'
           }}>
        {/* Left: Logo and badge */}
        <div className="flex items-center gap-3">
          {/* Quantum icon — simple SVG atom */}
          <svg width="20" height="20" viewBox="0 0 24 24" 
               fill="none" stroke="#6366f1" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3"/>
            <ellipse cx="12" cy="12" rx="10" ry="4"/>
            <ellipse cx="12" cy="12" rx="10" ry="4" 
                     transform="rotate(60 12 12)"/>
            <ellipse cx="12" cy="12" rx="10" ry="4" 
                     transform="rotate(120 12 12)"/>
          </svg>
          <span className="font-mono text-sm text-[var(--text-primary)] tracking-wider
                           font-semibold">
            QKD Simulator
          </span>
          <span className="px-1.5 py-0.5 rounded 
                           text-xs font-mono"
                style={{
                  backgroundColor: 'rgba(0, 204, 255, 0.15)',
                  border: '1px solid rgba(0, 204, 255, 0.5)',
                  color: '#00c8ff'
                }}>
            BB84
          </span>
        </div>

        {/* Center: Status indicator */}
        <div className="flex items-center gap-2">
          {isLoading && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex items-center gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span className="text-xs font-mono text-yellow-400">
                SIMULATING
              </span>
            </motion.div>
          )}
          {!isLoading && hasResults && !isBreached && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs font-mono text-green-500">
                SECURE
              </span>
            </div>
          )}
          {!isLoading && hasResults && isBreached && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="flex items-center gap-1.5"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-xs font-mono text-red-500">
                BREACH DETECTED
              </span>
            </motion.div>
          )}
          {!isLoading && !hasResults && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)]" />
              <span className="text-xs font-mono text-[var(--text-muted)]">
                READY
              </span>
            </div>
          )}
        </div>

        {/* Right: Nav + controls */}
        <div className="flex items-center gap-2">
          {/* View navigation */}
          <div className="flex items-center gap-1 
                          border border-[var(--border-color)] rounded p-0.5">
            {[
              { id: 'landing',    label: 'HOME' },
              { id: 'simulator',  label: 'SIM' },
              { id: 'results',    label: 'RESULTS' },
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`px-3 py-1 text-xs font-mono rounded
                           transition-colors
                           ${activeView === view.id
                             ? 'bg-quantum-blue text-white'
                             : 'text-gray-500 hover:text-gray-300'
                           }`}
              >
                {view.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-2 py-1 rounded text-xs font-mono
                 border transition-colors flex items-center justify-center
                 w-7 h-7"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-muted)',
              backgroundColor: 'transparent'
            }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
          <button
            onClick={() => setActiveView('guide')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${activeView === 'guide' ? 'bg-quantum-blue text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            style={activeView === 'guide' ? {} : { border: '1px solid var(--border-color)', backgroundColor: 'transparent' }}
          >
            GUIDE
          </button>
          <button
            onClick={reset}
            disabled={isLoading || !hasResults}
            className="px-3 py-1 text-xs font-mono text-[var(--text-muted)]
                       hover:text-[var(--text-primary)] border border-[var(--border-color)] 
                       hover:border-[var(--text-subtle)] rounded transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            RESET
          </button>
          <button
            onClick={() => setSaveModalOpen(true)}
            className="px-3 py-1 text-xs font-mono text-[var(--text-muted)]
                       hover:text-[var(--text-primary)] border border-[var(--border-color)] 
                       hover:border-[var(--text-subtle)] rounded transition-colors"
          >
            💾 SAVE
          </button>
          <button
            onClick={() => setLoadModalOpen(true)}
            className="px-3 py-1 text-xs font-mono text-[var(--text-muted)]
                       hover:text-[var(--text-primary)] border border-[var(--border-color)] 
                       hover:border-[var(--text-subtle)] rounded transition-colors"
          >
            📂 LOAD
          </button>
          {placedGates.length > 0 && (
            <button
              onClick={clearGates}
              className="px-3 py-1 text-xs font-mono
                         border border-[var(--border-color)] rounded
                         text-[var(--text-muted)] hover:text-red-400
                         hover:border-red-800 transition-colors"
            >
              ✕ GATES ({placedGates.length})
            </button>
          )}
          {results && results.bit_stream?.length > 0 && (
            <button
              onClick={openInspector}
              className="px-3 py-1 text-xs font-mono
                         border rounded transition-colors"
              style={{
                borderColor: inspector.isOpen
                  ? '#00aacc' : 'var(--border-color)',
                color: inspector.isOpen ? '#00aacc' : 'var(--text-muted)',
                backgroundColor: inspector.isOpen
                  ? '#00aacc15' : 'transparent'
              }}
            >
              🔍 INSPECT
            </button>
          )}
          {results && (
            <button
              onClick={togglePause}
              className="px-3 py-1 text-xs font-mono
                         border rounded transition-colors
                         border-[var(--border-color)] hover:border-[var(--text-subtle)]
                         text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {animation.isPaused ? '▶ RESUME' : '⏸ PAUSE'}
            </button>
          )}
          <button
            onClick={runSimulation}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 
                       bg-indigo-600 hover:bg-indigo-500
                       disabled:opacity-40 text-white rounded 
                       font-mono text-xs tracking-wider 
                       transition-colors"
          >
            <span>{isLoading ? '●' : '▶'}</span>
            <span>{isLoading ? 'RUNNING' : 'RUN'}</span>
          </button>
        </div>
      </div>
      <SaveExperimentModal isOpen={saveModalOpen} onClose={() => setSaveModalOpen(false)} />
      <LoadExperimentModal isOpen={loadModalOpen} onClose={() => setLoadModalOpen(false)} />
    </>
  )
}
