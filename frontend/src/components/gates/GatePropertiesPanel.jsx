import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'
import { ArrowLeft, Trash2 } from 'lucide-react'

const EXAMPLES = {
  H: { before: '|0⟩', after: '|+⟩', note: 'Equal amplitudes, zero relative phase' },
  X: { before: '|0⟩', after: '|1⟩', note: 'Population swaps between the basis states' },
  Y: { before: '|0⟩', after: 'i|1⟩', note: 'Population swaps and phase advances by π/2' },
  Z: { before: '|+⟩', after: '|−⟩', note: 'Relative phase changes by π' },
  S: { before: '|+⟩', after: '(|0⟩ + i|1⟩)/√2', note: '|1⟩ phase advances by π/2' },
  T: { before: '|+⟩', after: '(|0⟩ + eⁱᵖ⁄⁴|1⟩)/√2', note: '|1⟩ phase advances by π/4' },
}

function Matrix({ values }) {
  return (
    <math display="block" aria-label={`matrix ${values.flat().join(', ')}`}>
      <mrow><mo>[</mo><mtable>
        {values.map((row, rowIndex) => (
          <mtr key={rowIndex}>{row.map((value, colIndex) => <mtd key={colIndex}><mtext>{value}</mtext></mtd>)}</mtr>
        ))}
      </mtable><mo>]</mo></mrow>
    </math>
  )
}

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
    clone: 'Educational no-cloning probe. The modeled reduced state is disturbed because an unknown quantum state cannot be copied perfectly.',
    cnot: 'Controlled-NOT probe model. The signal becomes correlated with a probe; the reduced signal state can lose coherence.',
  }

  const photonEffects = {
    H: 'Switches measurement basis between rectilinear and diagonal',
    X: 'Flips bit value in rectilinear basis (0° ↔ 90°)',
    Y: 'Flips bit value and introduces global π/2 phase shift',
    Z: 'Inverts phase in diagonal basis (45° ↔ 135°)',
    S: 'Rotates diagonal polarization state by 22.5°',
    T: 'Rotates diagonal polarization state by 11.25°',
    clone: 'Shows the documented reduced-state disturbance; it is not represented by a fabricated 2×2 gate matrix',
    cnot: 'Shows the documented signal/probe interaction model and its detectable perturbation',
  }

  return (
    <div
      className={`flex flex-col h-full rounded select-none ${className}`}
      style={{
        backgroundColor: 'var(--q-surface-1, #1a1a1e)',
        border: '1px solid var(--q-border, #34343d)',
      }}
    >
      {/* Panel Navigation Bar */}
      <div
        className="flex items-center justify-between p-3 border-b"
        style={{ borderColor: 'var(--q-border-subtle, #282830)' }}
      >
        <button
          onClick={() => setSelectedGate(null)}
          className="flex items-center gap-1.5 text-xs font-body font-semibold text-[var(--q-text-muted,#94a3b8)] hover:text-[var(--q-text-bright,#f1f5f9)] transition-colors"
          title="Return to simulation parameters"
        >
          <ArrowLeft size={14} />
          <span>Parameters</span>
        </button>
        <span className="text-xs font-body uppercase tracking-wider font-semibold text-[var(--q-text-bright,#f1f5f9)]">
          Gate Inspector
        </span>
      </div>

      {/* Content */}
      {placedGates.length === 0 ? (
        <div className="p-4 flex flex-col items-center justify-center text-center flex-1">
          <p className="text-sm font-body text-[var(--q-text-muted,#94a3b8)]">No gates placed</p>
          <p className="text-xs font-body mt-2 text-[var(--q-text-dim,#64748b)] leading-relaxed">
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
              const example = EXAMPLES[gate.type]
              const isProbe = gate.type === 'clone' || gate.type === 'cnot'

              return (
                <motion.div
                  key={gate.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => setSelectedGate(gate)}
                  className={`p-3 rounded border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--q-accent-cyan,#38bdf8)] bg-[var(--q-surface-2,#222227)]'
                      : 'bg-[var(--q-surface-0,#131317)] border-[var(--q-border-subtle,#282830)] hover:border-[var(--q-border,#34343d)]'
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
                        <div className="font-body text-xs font-semibold text-[var(--text-primary)]">
                          {gate.type === 'clone' ? 'Cloning Probe' : gate.type === 'cnot' ? 'CNOT Tap' : `${gate.type} Gate`}
                        </div>
                        <div className="text-[11px] font-body text-[var(--text-muted)]">
                          Channel · Pos <span className="font-mono tabular-nums">{(gate.position * 100).toFixed(0)}%</span>
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
                    <div className="text-[10px] font-body uppercase tracking-wider text-[var(--text-subtle)] mb-1">
                      Effect on Photons
                    </div>
                    <div className="text-xs font-body p-2 rounded bg-[var(--panel-bg)] border border-[var(--border-color)] text-[var(--q-text-2)] leading-relaxed">
                      {effect}
                    </div>
                  </div>

                  {/* Visual operation sequence */}
                  {example && (
                    <div className="mb-2 rounded border border-[var(--q-border-subtle)] bg-[var(--q-surface-0)] p-2">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
                        <div><div className="foundation-label">Before</div><div className="font-mono text-sm text-[var(--q-accent-quantum)]">{example.before}</div></div>
                        <div className="rounded border border-[var(--q-border)] px-2 py-1 font-mono font-bold text-[var(--q-accent-brand)]">{gate.type}</div>
                        <div><div className="foundation-label">After</div><div className="font-mono text-sm text-[var(--q-accent-diagonal)]">{example.after}</div></div>
                      </div>
                      <div className="mt-2 text-center text-[10px] text-[var(--q-text-dim)]">{example.note}</div>
                    </div>
                  )}

                  {/* Matrix or documented probe model */}
                  <div className="mb-2">
                    <div className="text-[10px] font-body uppercase tracking-wider text-[var(--text-subtle)] mb-1">
                      {isProbe ? 'Probe model' : 'Transformation matrix'}
                    </div>
                    <div className="p-2 rounded font-mono text-xs text-center bg-[var(--panel-bg)] border border-[var(--border-color)] text-[var(--text-primary)]">
                      {isProbe ? (
                        <div className="leading-relaxed text-[var(--q-text-2)]">signal + probe → correlated joint state<br/><span className="text-[10px] text-[var(--q-text-dim)]">Inspect the modeled output statistics; no single-qubit unitary is claimed.</span></div>
                      ) : <Matrix values={matrix} />}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-[11px] font-body text-[var(--text-muted)] leading-relaxed">
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
