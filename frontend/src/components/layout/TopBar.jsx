/**
 * src/components/layout/TopBar.jsx
 *
 * Top navigation bar for QKD Simulator.
 * Contains: logo, protocol badge, status indicator,
 * navigation link to Guide, Reset and Run buttons.
 */
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSimulation } from '../../hooks/useSimulation'
import useSimulationStore from '../../store/simulationStore'

export default function TopBar() {
  const { runSimulation, isLoading } = useSimulation()
  const { results, reset, params, animation, 
          togglePause } = useSimulationStore()

  const isBreached = results?.secure_threshold_breached ?? false
  const hasResults = results !== null

  return (
    <div className="flex items-center justify-between px-4 py-2
                    bg-[#11111a] border-b border-gray-800
                    flex-shrink-0 h-12">
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
        <span className="font-mono text-sm text-white tracking-wider
                         font-semibold">
          QKD Simulator
        </span>
        <span className="px-1.5 py-0.5 bg-indigo-900/40 
                         border border-indigo-700/40 rounded 
                         text-xs text-indigo-400 font-mono">
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
            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
            <span className="text-xs font-mono text-gray-500">
              READY
            </span>
          </div>
        )}
      </div>

      {/* Right: Nav + controls */}
      <div className="flex items-center gap-2">
        <Link
          to="/guide"
          className="px-3 py-1 text-xs font-mono text-gray-400 
                     hover:text-white transition-colors
                     border border-transparent hover:border-gray-700 
                     rounded"
        >
          GUIDE
        </Link>
        <button
          onClick={reset}
          disabled={isLoading || !hasResults}
          className="px-3 py-1 text-xs font-mono text-gray-400
                     hover:text-white border border-gray-800 
                     hover:border-gray-600 rounded transition-colors
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          RESET
        </button>
        {results && (
          <button
            onClick={togglePause}
            className="px-3 py-1 text-xs font-mono
                       border rounded transition-colors
                       border-gray-700 hover:border-gray-500
                       text-gray-300 hover:text-white"
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
  )
}
