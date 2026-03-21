import TopBar from '../components/layout/TopBar'
import Sidebar from '../components/layout/Sidebar'
import BottomPanel from '../components/layout/BottomPanel'
import QuantumCanvas from '../components/canvas/QuantumCanvas'
import ConfigPanel from '../components/controls/ConfigPanel'

export default function SimulatorPage() {
  return (
    <div className="bg-[#0a0a0f] h-screen flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 p-3 overflow-hidden">
              <QuantumCanvas className="h-full" />
            </div>
            <div className="w-64 p-3 border-l border-gray-800 
                            overflow-y-auto flex-shrink-0 bg-[#0a0a0f]">
              <ConfigPanel />
            </div>
          </div>
          <BottomPanel />
        </div>
      </div>
    </div>
  )
}
