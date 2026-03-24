/**
 * src/components/layout/Sidebar.jsx
 *
 * Collapsible left components panel for BB84 QKD Simulator.
 * IBM Quantum Composer inspired — adapted for BB84 protocol.
 *
 * Sections:
 *   GATES       — quantum gates (draggable)
 *   PROBES      — special components (draggable)
 *   EXPERIMENTS — experiment mode selector
 *
 * Panel is collapsible. Collapsed = icons only.
 * Expanded = icons + labels + descriptions.
 */

import { useState } from 'react'
import { TooltipPortal } from '../ui/TooltipPortal'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'

const GATES = [
  {
    id: 'H',
    symbol: 'H',
    label: 'Hadamard',
    color: '#6366f1',
    tooltip: `Hadamard Gate — Creates quantum superposition.
Transforms between rectilinear and diagonal bases:
  |0⟩ → |+⟩  (0° → 45°)
  |1⟩ → |-⟩  (90° → 135°)
  |+⟩ → |0⟩  (45° → 0°)
  |-⟩ → |1⟩  (135° → 90°)
Effect: Switches basis. Applied before Bob measures,
this scrambles basis alignment and raises QBER.`
  },
  {
    id: 'X',
    symbol: 'X',
    label: 'Pauli-X',
    color: '#f59e0b',
    tooltip: `Pauli-X Gate — Quantum bit flip (NOT gate).
Flips the bit value in rectilinear basis:
  |0⟩ → |1⟩  (0° → 90°)
  |1⟩ → |0⟩  (90° → 0°)
  |+⟩ → |+⟩  (invariant)
  |-⟩ → |-⟩  (invariant)
Effect: Flips 0s to 1s and vice versa. Diagonal
basis states are unaffected.`
  },
  {
    id: 'Y',
    symbol: 'Y',
    label: 'Pauli-Y',
    color: '#ec4899',
    tooltip: `Pauli-Y Gate — Bit flip AND phase flip.
Combines Pauli-X and Pauli-Z operations:
  |0⟩ → |1⟩  (0° → 90°)
  |1⟩ → |0⟩  (90° → 0°)
  |+⟩ → |-⟩  (45° → 135°)
  |-⟩ → |+⟩  (135° → 45°)
Effect: Flips both the bit value and the phase.
Affects all four polarization states.`
  },
  {
    id: 'Z',
    symbol: 'Z',
    label: 'Pauli-Z',
    color: '#14b8a6',
    tooltip: `Pauli-Z Gate — Quantum phase flip.
Flips diagonal basis states, leaves rectilinear unchanged:
  |0⟩ → |0⟩  (unchanged)
  |1⟩ → |1⟩  (unchanged, global phase)
  |+⟩ → |-⟩  (45° → 135°)
  |-⟩ → |+⟩  (135° → 45°)
Effect: Swaps |+⟩ and |-⟩. Rectilinear photons
pass through unaffected.`
  },
  {
    id: 'S',
    symbol: 'S',
    label: 'S Gate',
    color: '#8b5cf6',
    tooltip: `S Gate — Phase rotation by π/2 (90°).
Rotates diagonal basis states by 22.5°:
  |0⟩ → |0⟩  (unchanged)
  |1⟩ → |1⟩  (phase only)
  |+⟩ → angle +22.5° (67.5°)
  |-⟩ → angle -22.5° (112.5°)
Effect: Subtle rotation. Finer control than H or Z.
Two S gates equal one Z gate.`
  },
  {
    id: 'T',
    symbol: 'T',
    label: 'T Gate',
    color: '#06b6d4',
    tooltip: `T Gate — Phase rotation by π/4 (45°).
Rotates diagonal basis states by 11.25°:
  |0⟩ → |0⟩  (unchanged)
  |1⟩ → |1⟩  (phase only)
  |+⟩ → angle +11.25° (56.25°)
  |-⟩ → angle -11.25° (123.75°)
Effect: Finest phase rotation available. Used in
quantum error correction circuits. Four T gates
equal one Z gate.`
  },
]

const PROBES = [
  {
    id: 'clone',
    symbol: '⊗',
    label: 'Cloning Probe',
    color: '#ef4444',
    tooltip: `Cloning Probe — Demonstrates No-Cloning Theorem.
Attempts to copy photon states via CNOT entanglement:
  Input:  |ψ⟩|0⟩ — original + blank probe qubit
  Output: entangled state — neither copy equals |ψ⟩
Effect: Original photon state collapses. Bob receives
a damaged version. QBER spikes immediately — proving
quantum states cannot be perfectly cloned.
Use in: Experiment 6`
  },
  {
    id: 'cnot',
    symbol: '⊕',
    label: 'CNOT Tap',
    color: '#f97316',
    tooltip: `CNOT Tap — Controlled-NOT entanglement probe.
Entangles the photon with a probe qubit:
  Control: original photon state
  Target:  probe qubit (starts as |0⟩)
Effect: Creates quantum entanglement between photon
and probe. The act of measurement disturbs both.
Eve gains partial information but introduces
detectable errors in the process.
Use in: Experiment 6`
  },
]

const EXPERIMENTS = [
  {
    id: 'exp1',
    label: 'Exp 1',
    description: 'Random bits, no Eve',
    color: '#22c55e',
    tooltip: 'Alice generates random bits. No eavesdropping. Clean sifted key produced.'
  },
  {
    id: 'exp2',
    label: 'Exp 2',
    description: 'User input, no Eve',
    color: '#6366f1',
    tooltip: 'User selects photon count and polarization states manually. No Eve.'
  },
  {
    id: 'exp3',
    label: 'Exp 3',
    description: 'Random bits + Eve',
    color: '#f59e0b',
    tooltip: 'Random bits with Eve interception. Demonstrates QBER spike and detection.'
  },
  {
    id: 'exp4',
    label: 'Exp 4',
    description: 'User input + Eve',
    color: '#f59e0b',
    tooltip: 'User-defined bits with Eve active. Full manual control.'
  },
  {
    id: 'exp5',
    label: 'Exp 5',
    description: 'Quantum gates',
    color: '#a855f7',
    tooltip: 'Photon transmission with quantum gates placed on lanes. Observe state transformations.'
  },
  {
    id: 'exp6',
    label: 'Exp 6',
    description: 'No-Cloning Theorem',
    color: '#ef4444',
    tooltip: 'Demonstrates the quantum no-cloning theorem using Cloning Probe component.'
  },
  {
    id: 'exp7',
    label: 'Exp 7',
    description: 'PNS Attack · Realistic only',
    color: '#ccaa00',
    tooltip: 'Demonstrates the Photon Number Splitting attack.'
  },
  {
    id: 'exp8',
    label: 'Exp 8',
    description: 'Decoy States · Realistic only',
    color: '#00aacc',
    tooltip: 'Demonstrates the Decoy State protocol.'
  },
]

// Single item component with tooltip
function SidebarItem({ item, collapsed, draggable = false }) {
  return (
    <TooltipPortal 
      content={item.tooltip} 
      width={224}
      color={item.color}
    >
      <motion.div
        draggable={draggable}
        onDragStart={draggable ? (e) => {
          e.dataTransfer.setData('gateType', item.id)
        } : undefined}
        whileHover={{ scale: 1.03 }}
        className={`flex items-center rounded border
                   transition-colors select-none
                   ${draggable
                     ? 'cursor-grab active:cursor-grabbing'
                     : 'cursor-default'}
                   ${collapsed
                     ? 'w-8 h-8 justify-center mx-auto'
                     : 'gap-2 px-2 py-1.5 w-full'
                   }
                   bg-transparent
                   hover:bg-white/5`}
        style={{
          borderColor: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.15)'
        }}
      >
        <div
          className={`rounded flex items-center justify-center
                     font-mono font-bold flex-shrink-0
                     ${collapsed
                       ? 'w-6 h-6 text-xs'
                       : 'w-7 h-7 text-xs'}`}
          style={{
            backgroundColor: item.color + '40',
            color: '#ffffff',
            border: `1px solid rgba(255,255,255,0.4)`,
            fontWeight: 'bold'
          }}
        >
          {item.symbol}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs font-mono text-gray-300
                         whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipPortal>
  )
}

// Experiment button
function ExperimentButton({ exp, collapsed, isActive, onClick, disabled = false }) {
  return (
    <TooltipPortal
      content={exp.tooltip}
      width={224}
      color={exp.color}
    >
      <motion.button
        onClick={disabled ? undefined : onClick}
        whileHover={{ scale: 1.02 }}
        className={`w-full flex items-center gap-2 px-2 py-1.5
                   rounded border transition-colors text-left
                   ${disabled
                     ? 'opacity-30 cursor-not-allowed'
                     : 'cursor-pointer'
                   }
                   ${isActive && !disabled
                     ? 'border-opacity-60 bg-opacity-20'
                     : 'border-gray-800 bg-gray-900/20 hover:border-gray-700'
                   }`}
        style={{
          borderColor: isActive && !disabled ? exp.color + '60' : undefined,
          backgroundColor: isActive && !disabled ? exp.color + '15' : undefined
        }}
      >
        <div
          className="w-7 h-7 rounded flex items-center 
                     justify-center text-xs font-mono 
                     font-bold flex-shrink-0"
          style={{
            backgroundColor: exp.color + '20',
            color: exp.color,
            border: `1px solid ${exp.color}30`
          }}
        >
          {exp.id.replace('exp', '')}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="text-xs font-mono text-gray-300
                              whitespace-nowrap">
                {exp.label}
              </div>
              <div className="text-xs text-gray-600 
                              whitespace-nowrap">
                {exp.description}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </TooltipPortal>
  )
}

// Section header
function SectionHeader({ label, collapsed }) {
  if (collapsed) return (
    <div className="w-full h-px bg-gray-800 my-1" />
  )
  return (
    <div className="px-1 pt-3 pb-1">
      <span className="text-xs font-mono text-gray-600 
                       uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true)
  const [activeExp, setActiveExp] = useState(null)
  const { setParams, openExperimentModal, sourceModel } = useSimulationStore()

  const handleExpSelect = (expId) => {
    setActiveExp(expId === activeExp ? null : expId)
    openExperimentModal(expId)
  }

  return (
    <motion.div
      animate={{ width: collapsed ? 48 : 200 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col border-r 
                 flex-shrink-0 overflow-hidden relative"
      style={{ 
        backgroundColor: '#242424',
        borderColor: 'rgba(255,255,255,0.2)',
        minHeight: 0
      }}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-between 
                      px-2 py-2 border-b border-border-subtle
                      flex-shrink-0">
        {!collapsed && (
          <span className="text-xs font-mono text-gray-600 
                           uppercase tracking-widest">
            Toolbox
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded flex items-center justify-center
                     text-gray-500 hover:text-white hover:bg-gray-800
                     transition-colors ml-auto flex-shrink-0"
        >
          <span className="text-xs font-mono">
            {collapsed ? '›' : '‹'}
          </span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden
                       flex flex-col gap-0.5
                       ${collapsed ? 'p-1 items-center' : 'p-1.5'}`}>

        {/* GATES */}
        <SectionHeader label="Gates" collapsed={collapsed} />
        {GATES.map(item => (
          <SidebarItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            draggable={true}
          />
        ))}

        {/* PROBES */}
        <SectionHeader label="Probes" collapsed={collapsed} />
        {PROBES.map(item => (
          <SidebarItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            draggable={true}
          />
        ))}

        {/* EXPERIMENTS */}
        <SectionHeader label="Experiments" collapsed={collapsed} />
        {EXPERIMENTS.map(exp => {
          const requiresRealistic = 
            exp.id === 'exp7' || exp.id === 'exp8'
          const isDisabled = requiresRealistic && 
            sourceModel === 'ideal'
          return (
            <ExperimentButton
              key={exp.id}
              exp={exp}
              collapsed={collapsed}
              isActive={activeExp === exp.id}
              onClick={() => handleExpSelect(exp.id)}
              disabled={isDisabled}
            />
          )
        })}
      </div>
    </motion.div>
  )
}
