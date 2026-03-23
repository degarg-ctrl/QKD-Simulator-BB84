import { useState } from 'react'
import { motion } from 'framer-motion'
import useSimulationStore from '../store/simulationStore'
import ResultsPage from './ResultsPage'
import GuidePage from './GuidePage'
import TopBar from '../components/layout/TopBar'
import Sidebar from '../components/layout/Sidebar'
import BottomPanel from '../components/layout/BottomPanel'
import QuantumCanvas from '../components/canvas/QuantumCanvas'
import ConfigPanel from '../components/controls/ConfigPanel'
import ExperimentModal from '../components/experiments/ExperimentModal'

export default function SimulatorPage() {
  const [configCollapsed, setConfigCollapsed] = useState(false)
  const { activeView } = useSimulationStore()

  if (activeView === 'guide') {
    return (
      <div className="bg-[#2a2a2a] h-screen flex flex-col">
        <TopBar />
        <div className="flex-1 overflow-y-auto">
          <GuidePage />
        </div>
        <ExperimentModal />
      </div>
    )
  }

  if (activeView === 'results') {
    return (
      <div className="bg-[#2a2a2a] h-screen flex flex-col">
        <TopBar />
        <div className="flex-1 overflow-hidden">
          <ResultsPage />
        </div>
        <ExperimentModal />
      </div>
    )
  }

  return (
    <div className="bg-[#2a2a2a] h-screen flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-3 overflow-hidden">
              <QuantumCanvas className="h-full" />
            </div>
            
            <motion.div
              animate={{ width: configCollapsed ? 0 : 256 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="border-l overflow-hidden 
                         flex-shrink-0 relative"
              style={{ 
                borderColor: 'rgba(255,255,255,0.2)',
                backgroundColor: '#2a2a2a'
              }}
            >
              {/* Collapse toggle tab */}
              <button
                onClick={() => setConfigCollapsed(!configCollapsed)}
                className="absolute -left-3 top-1/2 -translate-y-1/2
                           w-3 h-12 bg-[#242424] border border-gray-600
                           rounded-l flex items-center justify-center
                           text-gray-500 hover:text-white z-10
                           transition-colors"
              >
                <span className="text-xs">
                  {configCollapsed ? '‹' : '›'}
                </span>
              </button>
              <div className="w-64 h-full overflow-y-auto p-3">
                <ConfigPanel />
              </div>
            </motion.div>
          </div>
          <BottomPanel />
        </div>
      </div>
      <ExperimentModal />
    </div>
  )
}
