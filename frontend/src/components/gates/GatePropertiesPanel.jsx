import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSimulationStore from '../../store/simulationStore';

export default function GatePropertiesPanel() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const placedGates = useSimulationStore((state) => state.placedGates);
  const selectedGate = useSimulationStore((state) => state.selectedGate);
  const setSelectedGate = useSimulationStore((state) => state.setSelectedGate);
  const deleteGate = useSimulationStore((state) => state.deleteGate);

  // Auto-open only the first time gates are placed
  useEffect(() => {
    if (placedGates.length > 0 && isCollapsed && !hasAutoOpened) {
      setIsCollapsed(false);
      setHasAutoOpened(true);
    }
  }, [placedGates.length, isCollapsed, hasAutoOpened]);

  // Sort gates by position (Alice to Bob)
  const sortedGates = [...placedGates].sort((a, b) => a.position - b.position);

  const gateMatrices = {
    H: [['1/√2', '1/√2'], ['1/√2', '-1/√2']],
    X: [['0', '1'], ['1', '0']],
    Y: [['0', '-i'], ['i', '0']],
    Z: [['1', '0'], ['0', '-1']],
    S: [['1', '0'], ['0', 'i']],
    T: [['1', '0'], ['0', 'e^(iπ/4)']],
  };

  const descriptions = {
    H: 'Creates superposition. Maps |0⟩ → (|0⟩+|1⟩)/√2',
    X: 'NOT gate. Flips |0⟩ ↔ |1⟩',
    Y: 'Flips with phase: |0⟩ → i|1⟩, |1⟩ → -i|0⟩',
    Z: 'Phase flip: |1⟩ → -|1⟩',
    S: 'Phase gate. Adds π/2 phase to |1⟩',
    T: 'π/8 gate. Adds π/4 phase to |1⟩',
  };

  const photonEffects = {
    H: 'Photon enters superposition state',
    X: 'Photon polarization flipped',
    Y: 'Photon polarization flipped with phase',
    Z: 'Photon phase shifted',
    S: 'Photon phase shifted by π/2',
    T: 'Photon phase shifted by π/4',
  };

  if (isCollapsed) {
    return (
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: 'auto' }}
        className="bg-gray-900 border-l border-gray-800 flex items-start p-2"
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="text-gray-500 hover:text-cyan-400 transition-colors"
          title="Expand panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ width: 0 }}
      animate={{ width: 320 }}
      className="bg-gray-900 border-l border-gray-800 overflow-y-auto flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
        <h3 className="text-cyan-400 font-semibold">Gate Properties</h3>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-gray-500 hover:text-cyan-400 transition-colors"
          title="Collapse panel"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {placedGates.length === 0 ? (
        <div className="p-4">
          <p className="text-gray-500 text-sm">No gates placed</p>
          <p className="text-gray-600 text-xs mt-2">
            Drag gates from the sidebar onto the quantum channel
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {sortedGates.map((gate, index) => (
              <motion.div
                key={gate.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedGate(gate)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  deleteGate(gate.id);
                }}
                className={`p-4 border-b border-gray-800 cursor-pointer transition-colors ${
                  selectedGate?.id === gate.id ? 'bg-cyan-900/20 border-l-4 border-l-cyan-500' : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center font-mono font-bold text-white">
                      {gate.type}
                    </div>
                    <div>
                      <div className="text-white font-mono text-sm">{gate.type} Gate</div>
                      <div className="text-gray-500 text-xs">Lane {gate.lane + 1} • Pos {(gate.position * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-gray-400 text-xs mb-1">Effect on Photons:</div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-cyan-300 text-xs bg-gray-800/50 p-2 rounded"
                  >
                    {photonEffects[gate.type]}
                  </motion.div>
                </div>

                <div className="mb-3">
                  <div className="text-gray-400 text-xs mb-1">Matrix:</div>
                  <div className="bg-gray-800 p-2 rounded font-mono text-xs text-center">
                    <div className="flex justify-center gap-3">
                      <div>
                        <div className="text-cyan-300">{gateMatrices[gate.type][0][0]}</div>
                        <div className="text-cyan-300 mt-1">{gateMatrices[gate.type][1][0]}</div>
                      </div>
                      <div>
                        <div className="text-cyan-300">{gateMatrices[gate.type][0][1]}</div>
                        <div className="text-cyan-300 mt-1">{gateMatrices[gate.type][1][1]}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-gray-400 text-xs">
                  {descriptions[gate.type]}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
