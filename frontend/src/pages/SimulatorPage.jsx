import QuantumCanvas from '../components/canvas/QuantumCanvas'
import ConfigPanel from '../components/controls/ConfigPanel'
import { useSimulation } from '../hooks/useSimulation'

export default function SimulatorPage() {
  const { runSimulation, isLoading, results } = useSimulation()
  
  return (
    <div className="bg-[#0a0a0f] min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 
                      border-b border-gray-800 bg-[#11111a]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-mono text-sm text-white tracking-wider">
            QKD SIMULATOR
          </span>
          <span className="px-2 py-0.5 bg-indigo-900/40 border 
                           border-indigo-700/40 rounded text-xs 
                           text-indigo-400 font-mono">
            BB84
          </span>
        </div>
        <div className="flex items-center gap-3">
          {results && (
            <span className={`text-xs font-mono ${
              results.secure_threshold_breached 
                ? 'text-red-400' : 'text-green-400'
            }`}>
              QBER: {(results.qber * 100).toFixed(2)}% | 
              SKR: {results.skr.toFixed(4)}
            </span>
          )}
          <button
            onClick={runSimulation}
            disabled={isLoading}
            id="run-simulation-btn"
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500
                       disabled:opacity-40 text-white rounded font-mono
                       text-xs tracking-wider transition-colors"
          >
            {isLoading ? '● RUNNING' : '▶ RUN'}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <QuantumCanvas className="flex-1" />
        </div>
        {/* Config panel */}
        <div className="w-64 p-4 border-l border-gray-800 overflow-y-auto bg-[#0a0a0f]">
          <ConfigPanel />
        </div>
      </div>
    </div>
  )
}
