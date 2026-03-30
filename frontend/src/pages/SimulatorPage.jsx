import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../store/simulationStore'
import LandingPage from './LandingPage'
import ResultsPage from './ResultsPage'
import GuidePage from './GuidePage'
import UniversalTopBar from '../components/layout/UniversalTopBar'
import SimulatorControls from '../components/layout/SimulatorControls'
import Sidebar from '../components/layout/Sidebar'
import BottomPanel from '../components/layout/BottomPanel'
import QuantumCanvas from '../components/canvas/QuantumCanvas'
import ConfigPanel from '../components/controls/ConfigPanel'
import ExperimentModal from '../components/experiments/ExperimentModal'
import PhotonInspector from '../components/inspector/PhotonInspector'
import GatePropertiesPanel from '../components/gates/GatePropertiesPanel'

export default function SimulatorPage() {
  const [configCollapsed, setConfigCollapsed] = useState(false)
  const { activeView, inspector } = useSimulationStore()

  // Landing Page
  if (activeView === 'landing') {
    return (
      <div className="h-screen flex flex-col overflow-hidden"
           style={{ backgroundColor: 'var(--canvas-bg)' }}>
        <UniversalTopBar />
        <div className="flex-1 overflow-y-auto">
          <LandingPage />
        </div>
      </div>
    )
  }

  // Guide Page (About)
  if (activeView === 'guide') {
    return (
      <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--canvas-bg)' }}>
        <UniversalTopBar />
        <div className="flex-1 overflow-y-auto">
          <GuidePage />
        </div>
        <ExperimentModal />
      </div>
    )
  }

  // Results Page
  if (activeView === 'results') {
    return (
      <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--canvas-bg)' }}>
        <UniversalTopBar />
        <SimulatorControls />
        <div className="flex-1 overflow-hidden">
          <ResultsPage />
        </div>
        <ExperimentModal />
      </div>
    )
  }

  // Simulator Page
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--canvas-bg)' }}>
      <UniversalTopBar />
      <SimulatorControls />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-3 overflow-hidden relative">
              <QuantumCanvas className="h-full" />
              <AnimatePresence>
                {inspector.isOpen && <PhotonInspector />}
              </AnimatePresence>
            </div>
            <GatePropertiesPanel />            
            <motion.div
              animate={{ width: configCollapsed ? 0 : 256 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="border-l overflow-hidden 
                         flex-shrink-0 relative"
              style={{ 
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--canvas-bg)'
              }}
            >
              {/* Collapse toggle tab */}
              <button
                onClick={() => setConfigCollapsed(!configCollapsed)}
                className="absolute -left-3 top-1/2 -translate-y-1/2
                           w-3 h-12 bg-[var(--panel-bg)] border border-[var(--border-color)]
                           rounded-l flex items-center justify-center
                           text-[var(--text-muted)] hover:text-[var(--text-primary)] z-10
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
