/**
 * src/components/layout/Sidebar.jsx
 *
 * Collapsible left components panel for BB84 QKD Simulator.
 * IBM Quantum Composer inspired — adapted for BB84 protocol.
 *
 * Sections:
 *   ENTITIES    — protocol participants (informational)
 *   GATES       — quantum gates (draggable in Sprint 6)
 *   PROBES      — special components (draggable in Sprint 6)
 *   EXPERIMENTS — experiment mode selector
 *
 * Panel is collapsible. Collapsed = icons only.
 * Expanded = icons + labels + descriptions.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'

const ENTITIES = [
  {
    id: 'alice',
    symbol: '👩',
    label: 'Alice',
    color: '#6366f1',
    tooltip: 'Sender. Generates random bits, chooses polarization bases, encodes photons per BB84 rules.'
  },
  {
    id: 'bob',
    symbol: '👨',
    label: 'Bob',
    color: '#22c55e',
    tooltip: 'Receiver. Measures photons in randomly chosen bases. Correct basis = correct bit.'
  },
  {
    id: 'eve',
    symbol: '🕵',
    label: 'Eve',
    color: '#ef4444',
    tooltip: 'Eavesdropper. Intercept-resend attack introduces ~25% QBER — detectable by Alice and Bob.'
  },
]

const GATES = [
  {
    id: 'H',
    symbol: 'H',
    label: 'Hadamard',
    color: '#6366f1',
    tooltip: 'H gate: |0>→|+>, |1>→|->, |+>→|0>, |->→|1>. Switches between rectilinear and diagonal bases. Angle: 0°↔45°, 90°↔135°'
  },
  {
    id: 'X',
    symbol: 'X',
    label: 'Pauli-X',
    color: '#f59e0b',
    tooltip: 'Bit-flip gate: |0>→|1>, |1>→|0>. Flips the bit value. |+> and |-> are invariant. Angle: 0°↔90°'
  },
  {
    id: 'Y',
    symbol: 'Y',
    label: 'Pauli-Y',
    color: '#ec4899',
    tooltip: 'Bit+Phase flip: |0>→|1>, |1>→|0>, |+>→|->, |->→|+>. Combines X and Z operations.'
  },
  {
    id: 'Z',
    symbol: 'Z',
    label: 'Pauli-Z',
    color: '#14b8a6',
    tooltip: 'Phase-flip gate: |+>→|->, |->→|+>. Rectilinear states unchanged. Angle: 45°↔135°'
  },
  {
    id: 'S',
    symbol: 'S',
    label: 'S Gate',
    color: '#8b5cf6',
    tooltip: 'Phase gate π/2: Rotates diagonal states by 22.5°. Rectilinear states unchanged in bit value.'
  },
  {
    id: 'T',
    symbol: 'T',
    label: 'T Gate',
    color: '#06b6d4',
    tooltip: 'Phase gate π/4: Rotates diagonal states by 11.25°. Finer phase rotation than S gate.'
  },
]

const PROBES = [
  {
    id: 'clone',
    symbol: '⊗',
    label: 'Cloning Probe',
    color: '#ef4444',
    tooltip: 'No-Cloning Theorem probe. Attempts to copy photon state via CNOT entanglement. Collapses original — QBER spikes. Neither copy is perfect.'
  },
  {
    id: 'cnot',
    symbol: '⊕',
    label: 'CNOT Tap',
    color: '#f97316',
    tooltip: 'Controlled-NOT tap. Entangles photon with probe qubit. Used in Exp 6 to demonstrate quantum no-cloning theorem.'
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
]

// Single item component with tooltip
function SidebarItem({ item, collapsed, draggable = false }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <motion.div
        draggable={draggable}
        onDragStart={draggable ? (e) => {
          e.dataTransfer.setData('gateType', item.id)
        } : undefined}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        whileHover={{ scale: 1.03 }}
        className={`flex items-center gap-2 px-2 py-1.5 rounded
                   border transition-colors select-none
                   ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
                   border-gray-800 bg-gray-900/40 
                   hover:bg-gray-800/60 hover:border-gray-600`}
        style={{
          borderColor: showTooltip ? item.color + '50' : undefined
        }}
      >
        {/* Icon */}
        <div
          className="w-7 h-7 rounded flex items-center justify-center
                     text-xs font-mono font-bold flex-shrink-0"
          style={{
            backgroundColor: item.color + '20',
            color: item.color,
            border: `1px solid ${item.color}30`
          }}
        >
          {item.symbol}
        </div>
        {/* Label — only in expanded mode */}
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

      {/* Tooltip — always shows on hover, positioned to the RIGHT */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-0 ml-3 w-60 p-3
                       bg-gray-950 border rounded-lg shadow-2xl
                       z-[9999] pointer-events-none"
            style={{ borderColor: item.color + '40' }}
          >
            <div className="text-xs font-mono font-bold mb-1"
                 style={{ color: item.color }}>
              {item.label}
            </div>
            <div className="text-xs text-gray-400 leading-relaxed">
              {item.tooltip}
            </div>
            {item.description && (
              <div className="text-xs text-gray-600 mt-1 font-mono">
                {item.description}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Experiment button
function ExperimentButton({ exp, collapsed, isActive, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <motion.button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        whileHover={{ scale: 1.02 }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 
                   rounded border transition-colors text-left
                   ${isActive
                     ? 'border-opacity-60 bg-opacity-20'
                     : 'border-gray-800 bg-gray-900/20 hover:border-gray-700'
                   }`}
        style={{
          borderColor: isActive ? exp.color + '60' : undefined,
          backgroundColor: isActive ? exp.color + '15' : undefined
        }}
      >
        <div
          className="w-7 h-7 rounded flex items-center justify-center
                     text-xs font-mono font-bold flex-shrink-0"
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
              <div className="text-xs text-gray-600 whitespace-nowrap">
                {exp.description}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-full top-0 ml-3 w-60 p-3
                       bg-gray-950 border rounded-lg shadow-2xl
                       z-[9999] pointer-events-none"
            style={{ borderColor: exp.color + '40' }}
          >
            <div className="text-xs font-mono font-bold mb-1"
                 style={{ color: exp.color }}>
              {exp.label} — {exp.description}
            </div>
            <div className="text-xs text-gray-400 leading-relaxed">
              {exp.tooltip}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const [collapsed, setCollapsed] = useState(false)
  const [activeExp, setActiveExp] = useState(null)
  const { setParams } = useSimulationStore()

  const handleExpSelect = (expId) => {
    setActiveExp(expId === activeExp ? null : expId)
    // Experiment preset params will be wired in Sprint 8
    // For now just track selection
  }

  return (
    <motion.div
      animate={{ width: collapsed ? 48 : 200 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col bg-panel-bg border-r 
                 border-border-subtle flex-shrink-0 
                 overflow-hidden relative"
      style={{ minHeight: 0 }}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-between 
                      px-2 py-2 border-b border-border-subtle
                      flex-shrink-0">
        {!collapsed && (
          <span className="text-xs font-mono text-gray-600 
                           uppercase tracking-widest">
            Components
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5
                      flex flex-col gap-0.5">

        {/* ENTITIES */}
        <SectionHeader label="Entities" collapsed={collapsed} />
        {ENTITIES.map(item => (
          <SidebarItem 
            key={item.id} 
            item={item} 
            collapsed={collapsed}
            draggable={false}
          />
        ))}

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
        {EXPERIMENTS.map(exp => (
          <ExperimentButton
            key={exp.id}
            exp={exp}
            collapsed={collapsed}
            isActive={activeExp === exp.id}
            onClick={() => handleExpSelect(exp.id)}
          />
        ))}
      </div>
    </motion.div>
  )
}
