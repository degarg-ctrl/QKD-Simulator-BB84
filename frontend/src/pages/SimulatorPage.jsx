import QuantumCanvas from '../components/canvas/QuantumCanvas'
import { useSimulation } from '../hooks/useSimulation'

export default function SimulatorPage() {
  const { runSimulation, isLoading, results } = useSimulation()
  
  return (
    <div className="bg-[#0a0a0f] min-h-screen p-8 flex flex-col gap-6">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">BB84 QKD Simulator</h1>
          
          <div className="flex gap-4 items-center">
            {results && (
              <div className="flex gap-6 mr-4 px-4 py-2 bg-[#1e1e3f]/40 border border-[#1e1e3f] rounded-md">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-mono">QBER</span>
                  <span className={`text-sm font-bold font-mono ${results.qber >= 0.11 ? 'text-red-400' : 'text-green-400'}`}>
                    {(results.qber * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase font-mono">SKR</span>
                  <span className="text-sm font-bold font-mono text-blue-400">
                    {results.skr.toFixed(4)}
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={runSimulation}
              disabled={isLoading}
              className="px-8 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] 
                         active:transform active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white font-bold rounded-md shadow-lg shadow-indigo-500/20
                         text-sm tracking-widest transition-all duration-200"
            >
              {isLoading ? 'RUNNING...' : '▶ START SIMULATION'}
            </button>
          </div>
        </div>

        <QuantumCanvas className="h-[400px]" />
      </div>
    </div>
  )
}
