import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../store/simulationStore'
import LandingPage from './LandingPage'
import ResultsPage from './ResultsPage'
import GuidePage from './GuidePage'
import UniversalTopBar from '../components/layout/UniversalTopBar'
import SimulatorControls from '../components/layout/SimulatorControls'
import SimulationErrorBanner from '../components/layout/SimulationErrorBanner'
import Sidebar from '../components/layout/Sidebar'
import BottomPanel from '../components/layout/BottomPanel'
import QuantumCanvas from '../components/canvas/QuantumCanvas'
import ConfigPanel from '../components/controls/ConfigPanel'
import ExperimentModal from '../components/experiments/ExperimentModal'
import PhotonInspector from '../components/inspector/PhotonInspector'
import GatePropertiesPanel from '../components/gates/GatePropertiesPanel'

// Views are selected from the store rather than the URL, so the document title
// has to follow `activeView` — it would otherwise stay on index.html's static
// title for the whole session no matter which page is on screen.
const PAGE_TITLES = {
  landing: 'QKDSimFlow — BB84 Quantum Key Distribution Simulator',
  simulator: 'Simulator Bench — QKDSimFlow',
  results: 'Results & Analysis — QKDSimFlow',
  guide: 'Guide — QKDSimFlow',
}

export default function SimulatorPage() {
  const [configCollapsed, setConfigCollapsed] = useState(false)
  const { activeView, inspector, selectedGate } = useSimulationStore()

  useEffect(() => {
    document.title = PAGE_TITLES[activeView] ?? PAGE_TITLES.landing
  }, [activeView])

  // Landing Page
  if (activeView === 'landing') {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden"
           style={{ backgroundColor: 'var(--canvas-bg)' }}>
        <UniversalTopBar />
        <div id="landing-scroll-container" className="flex-1 overflow-y-auto overflow-x-hidden">
          <LandingPage />
        </div>
      </div>
    )
  }

  // Guide Page
  if (activeView === 'guide') {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--canvas-bg)' }}>
        <UniversalTopBar />
        <div className="flex-1 overflow-hidden">
          <GuidePage />
        </div>
        <ExperimentModal />
      </div>
    )
  }

  // Results Page
  if (activeView === 'results') {
    return (
      <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--canvas-bg)' }}>
        <SimulatorControls />
        <SimulationErrorBanner />
        <div className="flex-1 overflow-hidden">
          <ResultsPage />
        </div>
        <ExperimentModal />
      </div>
    )
  }

  // Simulator Page
  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--canvas-bg)' }}>
      <SimulatorControls />
      <SimulationErrorBanner />
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
            {/* Unified Contextual Right Rail */}
            {/* The toggle lives outside the animating panel. The panel needs
                overflow-hidden for its width transition, which clipped the
                toggle's -left-3 offset and left it unclickable in both the
                expanded and collapsed states. */}
            <div className="relative flex flex-shrink-0">
              {/* Collapse toggle tab */}
              <button
                onClick={() => setConfigCollapsed(!configCollapsed)}
                aria-label={configCollapsed ? 'Expand parameters panel' : 'Collapse parameters panel'}
                aria-expanded={!configCollapsed}
                className="absolute -left-3 top-1/2 -translate-y-1/2
                           w-3 h-12 bg-[var(--panel-bg)] border border-[var(--border-color)]
                           rounded-l flex items-center justify-center
                           text-[var(--text-muted)] hover:text-[var(--text-primary)] z-10
                           transition-colors"
                title={configCollapsed ? 'Expand panel' : 'Collapse panel'}
              >
                <span className="text-xs" aria-hidden="true">
                  {configCollapsed ? '‹' : '›'}
                </span>
              </button>
              <motion.div
                animate={{ width: configCollapsed ? 0 : 280 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="border-l overflow-hidden h-full"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--canvas-bg)'
                }}
              >
                <div className="w-[280px] h-full overflow-y-auto p-3">
                  {selectedGate ? (
                    <GatePropertiesPanel />
                  ) : (
                    <ConfigPanel />
                  )}
                </div>
              </motion.div>
            </div>
          </div>
          <BottomPanel />
        </div>
      </div>
      <ExperimentModal />
    </div>
  )
}
