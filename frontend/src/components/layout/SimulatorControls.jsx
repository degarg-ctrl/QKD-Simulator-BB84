/**
 * SimulatorControls.jsx
 *
 * Simulator-specific control bar: status, view tabs, run/reset,
 * save/load, gate controls. Lucide icons, solid semantic colors.
 */
import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  Save, FolderOpen, Play, Pause, RotateCcw, Search, X,
} from 'lucide-react'
import { useSimulation } from '../../hooks/useSimulation'
import SaveExperimentModal from '../experiments/SaveExperimentModal'
import LoadExperimentModal from '../experiments/LoadExperimentModal'
import useSimulationStore from '../../store/simulationStore'

const BTN = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs ' +
  'font-medium border transition-colors disabled:opacity-40 ' +
  'disabled:cursor-not-allowed'

export default function SimulatorControls() {
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const { runSimulation, isLoading } = useSimulation()
  const {
    results, reset, placedGates, clearGates,
    openInspector, inspector, activeView, setActiveView,
    animation, togglePause,
  } = useSimulationStore()

  const isBreached = results?.secure_threshold_breached ?? false
  const hasResults = results !== null

  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 h-12
                      flex-shrink-0"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderBottom: '1px solid var(--border-color)'
        }}>

        {/* Left: status */}
        <div className="flex items-center gap-2">
          {isLoading && (
            <motion.div
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              <span className="text-xs font-medium text-[#F59E0B]">
                SIMULATING
              </span>
            </motion.div>
          )}
          {!isLoading && hasResults && !isBreached && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span className="text-xs font-medium text-[#22C55E]">
                SECURE
              </span>
            </div>
          )}
          {!isLoading && hasResults && isBreached && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              <span className="text-xs font-medium text-[#EF4444]">
                BREACH DETECTED
              </span>
            </div>
          )}
          {!isLoading && !hasResults && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--text-subtle)' }} />
              <span className="text-xs font-medium text-[var(--text-muted)]">
                READY
              </span>
            </div>
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded p-0.5"
            style={{ border: '1px solid var(--border-color)' }}>
            {[
              { id: 'simulator', label: 'SIM' },
              { id: 'results', label: 'RESULTS' },
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded
                            transition-colors
                            ${activeView === view.id
                    ? 'text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                style={activeView === view.id
                  ? { backgroundColor: '#00B8E6' } : undefined}
              >
                {view.label}
              </button>
            ))}
          </div>

          <button
            onClick={reset}
            disabled={isLoading || !hasResults}
            className={`${BTN} text-[var(--text-muted)]
                        hover:text-[var(--text-primary)]`}
            style={{ borderColor: 'var(--border-color)' }}>
            <RotateCcw size={13} /> RESET
          </button>

          <button
            onClick={() => setSaveModalOpen(true)}
            className={`${BTN} text-[var(--text-muted)]
                        hover:text-[var(--text-primary)]`}
            style={{ borderColor: 'var(--border-color)' }}>
            <Save size={13} /> SAVE
          </button>

          <button
            onClick={() => setLoadModalOpen(true)}
            className={`${BTN} text-[var(--text-muted)]
                        hover:text-[var(--text-primary)]`}
            style={{ borderColor: 'var(--border-color)' }}>
            <FolderOpen size={13} /> LOAD
          </button>

          {placedGates.length > 0 && (
            <button
              onClick={clearGates}
              className={`${BTN} text-[var(--text-muted)]
                          hover:text-[#EF4444]`}
              style={{ borderColor: 'var(--border-color)' }}>
              <X size={13} /> GATES ({placedGates.length})
            </button>
          )}

          {results && (results.event_stream?.length > 0 ||
            results.bit_stream?.length > 0) && (
              <button
                onClick={openInspector}
                className={`${BTN}`}
                style={{
                  borderColor: inspector.isOpen
                    ? '#00B8E6' : 'var(--border-color)',
                  color: inspector.isOpen
                    ? '#00B8E6' : 'var(--text-muted)',
                  backgroundColor: inspector.isOpen
                    ? 'rgba(0,184,230,0.08)' : 'transparent'
                }}>
                <Search size={13} /> INSPECT
              </button>
            )}

          {results && (
            <button
              onClick={togglePause}
              className={`${BTN} text-[var(--text-muted)]
                          hover:text-[var(--text-primary)]`}
              style={{ borderColor: 'var(--border-color)' }}>
              {animation.isPaused
                ? <><Play size={13} /> RESUME</>
                : <><Pause size={13} /> PAUSE</>}
            </button>
          )}

          <button
            onClick={runSimulation}
            disabled={isLoading}
            className="px-4 py-1.5 text-xs font-semibold rounded
                       text-white transition-colors disabled:opacity-40
                       disabled:cursor-not-allowed"
            style={{ backgroundColor: isLoading ? '#64748B' : '#00B8E6' }}>
            {isLoading ? 'RUNNING…' : 'RUN'}
          </button>
        </div>
      </div>

      <SaveExperimentModal isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)} />
      <LoadExperimentModal isOpen={loadModalOpen}
        onClose={() => setLoadModalOpen(false)} />
    </>
  )
}
