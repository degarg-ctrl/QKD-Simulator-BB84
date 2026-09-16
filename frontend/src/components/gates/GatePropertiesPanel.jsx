import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'
import { ArrowLeft, Trash2 } from 'lucide-react'

export default function GatePropertiesPanel({ className = '' }) {
  const placedGates = useSimulationStore((state) => state.placedGates)
  const selectedGate = useSimulationStore((state) => state.selectedGate)
  const setSelectedGate = useSimulationStore((state) => state.setSelectedGate)
  const deleteGate = useSimulationStore((state) => state.deleteGate)

  // Sort gates by position (Alice to Bob)
  const sortedGates = [...placedGates].sort((a, b) => a.position - b.position)

  const gateMatrices = {
    H: [['1/√2', '1/√2'], ['1/√2', '-1/√2']],
    X: [['0', '1'], ['1', '0']],
    Y: [['0', '-i'], ['i', '0']],
    Z: [['1', '0'], ['0', '-1']],
    S: [['1', '0'], ['0', 'i']],
    T: [['1', '0'], ['0', 'e^(iπ/4)']],
    clone: [['|ψ⟩|0⟩', '→'], ['|ψ⟩|0⟩', 'entangled']],
    cnot: [['CNOT', 'tap'], ['control', 'target']],
  }

  const descriptions = {
    H: 'Creates superposition. Maps |0⟩ → (|0⟩+|1⟩)/√2 and |1⟩ → (|0⟩-|1⟩)/√2.',
    X: 'Quantum NOT gate. Flips |0⟩ ↔ |1⟩.',
    Y: 'Pauli-Y gate. Flips bit and phase: |0⟩ → i|1⟩, |1⟩ → -i|0⟩.',
    Z: 'Phase flip. Maps |1⟩ → -|1⟩; rectilinear states invariant.',
    S: 'Phase gate. Adds π/2 (90°) phase rotation to |1⟩.',
    T: 'π/8 gate. Adds π/4 (45°) phase rotation to |1⟩.',
    clone: 'Attempts cloning via entanglement. Provably collapses quantum state.',
    cnot: 'Controlled-NOT probe. Intercepts partial state while creating detectable noise.',
  }

  const photonEffects = {
    H: 'Switches measurement basis between rectilinear and diagonal',
    X: 'Flips bit value in rectilinear basis (0° ↔ 90°)',
    Y: 'Flips bit value and introduces global π/2 phase shift',
    Z: 'Inverts phase in diagonal basis (45° ↔ 135°)',
    S: 'Rotates diagonal polarization state by 22.5°',
    T: 'Rotates diagonal polarization state by 11.25°',
    clone: 'Destroys coherent quantum state — raises QBER immediately',
    cnot: 'Entangles photon with probe — causes detectable perturbation',
  }

  return (
    <div
      className={`flex flex-col h-full rounded-lg select-none ${className}`}
      style={{
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
      }}
    >
      {/* Panel Navigation Bar */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)]">
        <button
          onClick={() => setSelectedGate(null)}
          className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
          title="Return to simulation parameters"
        >
          <ArrowLeft size={14} />
          <span>Parameters</span>
        </button>
        <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[var(--q-text-2)]">
          Gate Inspector
        </span>
      </div>

      {/* Content */}
      {placedGates.length === 0 ? (
        <div className="p-4 flex flex-col items-center justify-center text-center flex-1">
          <p className="text-sm font-mono text-[var(--text-muted)]">No gates placed</p>
          <p className="text-xs font-mono mt-2 text-[var(--text-subtle)] leading-relaxed">
            Drag gates from the left toolbox onto the quantum channel to inspect their transformation matrices and photon effects.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <AnimatePresence>
            {sortedGates.map((gate, index) => {
              const isSelected = selectedGate?.id === gate.id
              const matrix = gateMatrices[gate.type] || [['1', '0'], ['0', '1']]
              const effect = photonEffects[gate.type] || 'Applies state transformation'
              const desc = descriptions[gate.type] || 'Single-qubit quantum gate'

              return (
                <motion.div
                  key={gate.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => setSelectedGate(gate)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/10 border-white/30 shadow-md'
                      : 'bg-[var(--q-surface-0)] border-[var(--border-color)] hover:border-white/20'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-white text-xs"
                        style={{ backgroundColor: gate.color || '#6366f1' }}
                      >
                        {gate.type === 'clone' ? '⊗' : gate.type === 'cnot' ? '⊕' : gate.type}
                      </div>
                      <div>
                        <div className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                          {gate.type === 'clone' ? 'Cloning Probe' : gate.type === 'cnot' ? 'CNOT Tap' : `${gate.type} Gate`}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--text-muted)]">
                          Channel · Pos {(gate.position * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteGate(gate.id)
                        if (isSelected) setSelectedGate(null)
                      }}
                      className="p-1 rounded text-[var(--text-subtle)] hover:text-red-400 hover:bg-white/5 transition-colors"
                      title="Remove gate"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Transformation Effect */}
                  <div className="mb-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-subtle)] mb-1">
                      Effect on Photons
                    </div>
                    <div className="text-xs font-mono p-2 rounded bg-[var(--panel-bg)] border border-[var(--border-color)] text-[var(--q-text-2)] leading-relaxed">
                      {effect}
                    </div>
                  </div>

                  {/* Matrix */}
                  <div className="mb-2">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-subtle)] mb-1">
                      Transformation Matrix
                    </div>
                    <div className="p-2 rounded font-mono text-xs text-center bg-[var(--panel-bg)] border border-[var(--border-color)]">
                      <div className="flex justify-center gap-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[var(--text-primary)]">{matrix[0][0]}</span>
                          <span className="text-[var(--text-primary)]">{matrix[1][0]}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[var(--text-primary)]">{matrix[0][1]}</span>
                          <span className="text-[var(--text-primary)]">{matrix[1][1]}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-[11px] font-mono text-[var(--text-muted)] leading-relaxed">
                    {desc}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
