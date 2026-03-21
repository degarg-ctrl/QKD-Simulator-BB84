/**
 * src/components/layout/Sidebar.jsx
 *
 * Left sidebar showing component palette.
 * Displays entity nodes, gates/modules, and infrastructure
 * components. Each item has a hover tooltip explaining its
 * role in BB84. Matches Quirk-E component panel aesthetic.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SIDEBAR_ITEMS = {
  entities: [
    { 
      id: 'alice', 
      symbol: '👩', 
      label: 'Alice',
      color: '#6366f1',
      tooltip: 'Sender. Generates random secret bits, chooses polarization bases, and encodes each bit as a photon quantum state per BB84 rules.'
    },
    { 
      id: 'bob', 
      symbol: '👨', 
      label: 'Bob',
      color: '#22c55e',
      tooltip: 'Receiver. Measures incoming photons in randomly chosen bases. Correct basis = correct bit. Wrong basis = random bit.'
    },
    { 
      id: 'eve', 
      symbol: '🕵', 
      label: 'Eve',
      color: '#ef4444',
      tooltip: 'Eavesdropper. Intercepts photons and re-emits them after measuring. Introduces ~25% QBER when intercepting all photons — detectable by Alice and Bob.'
    },
  ],
  gates: [
    { id: 'hadamard', symbol: 'H', label: 'Hadamard',
      tooltip: 'Transforms |0⟩↔|+⟩ and |1⟩↔|-⟩. Switches between rectilinear and diagonal bases. Used by Alice to encode diagonal basis states.' },
    { id: 'xgate', symbol: 'X', label: 'Bit Flip',
      tooltip: 'Pauli-X gate. Flips |0⟩↔|1⟩. Models bit flip errors introduced by channel noise or Eve\'s basis mismatches.' },
    { id: 'identity', symbol: 'I', label: 'Identity',
      tooltip: 'No operation. Photon passes through unchanged. Used to represent a channel slot with no transformation.' },
    { id: 'zgate', symbol: 'Z', label: 'Phase Flip',
      tooltip: 'Pauli-Z gate. Flips the phase: |+⟩↔|-⟩. Relevant to diagonal basis errors.' },
    { id: 'atten', symbol: '-dB', label: 'Attenuation',
      tooltip: 'Fiber attenuation module. Reduces photon count using Beer-Lambert law: P_survive = 10^(-αd/10). At 50km, ~10% survive.' },
    { id: 'measure', symbol: 'M', label: 'Measure',
      tooltip: 'Quantum measurement. Collapses the photon\'s superposition into a definite bit value. Bob performs this in a randomly chosen basis.' },
    { id: 'reconcile', symbol: 'R', label: 'Reconcile',
      tooltip: 'Basis reconciliation (sifting). Alice and Bob publicly compare bases over classical channel. Mismatched bases are discarded.' },
    { id: 'eta', symbol: 'η', label: 'Efficiency',
      tooltip: 'Detector efficiency η. Probability that an arriving photon is actually detected. Default 85%. Undetected photons are lost.' },
  ],
  infrastructure: [
    { id: 'fiber', symbol: '〰', label: 'Fiber',
      tooltip: 'Quantum fiber optic channel. Carries polarized photons from Alice to Bob. Subject to attenuation, noise, and potential eavesdropping.' },
    { id: 'classical', symbol: '⇌', label: 'Classical',
      tooltip: 'Classical communication channel. Used for basis reconciliation and error estimation. Public — Eve can listen but cannot affect the security.' },
  ]
}

function SidebarItem({ item }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <motion.button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        whileHover={{ scale: 1.05 }}
        className="w-10 h-10 rounded border border-gray-800 
                   bg-gray-900/50 hover:bg-gray-800/50
                   hover:border-gray-600 transition-colors
                   flex items-center justify-center
                   text-xs font-mono text-gray-300
                   cursor-default"
        style={{ 
          borderColor: showTooltip ? item.color + '60' : undefined,
          color: showTooltip ? item.color : undefined
        }}
      >
        {item.symbol}
      </motion.button>
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-12 top-0 w-56 p-3 z-50
                       bg-[#11111a] border border-gray-700 
                       rounded-lg shadow-xl"
          >
            <div className="text-xs font-mono font-semibold mb-1"
                 style={{ color: item.color }}>
              {item.label}
            </div>
            <div className="text-xs text-gray-400 leading-relaxed">
              {item.tooltip}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Sidebar({ className = '' }) {
  const sections = [
    { key: 'entities',       label: 'Entities',          
      items: SIDEBAR_ITEMS.entities },
    { key: 'gates',          label: 'Gates & Modules',   
      items: SIDEBAR_ITEMS.gates },
    { key: 'infrastructure', label: 'Infrastructure',    
      items: SIDEBAR_ITEMS.infrastructure },
  ]

  return (
    <div className={`flex flex-col gap-4 p-3 bg-[#11111a] 
                     border-r border-gray-800 w-20
                     overflow-y-auto flex-shrink-0 ${className}`}>
      {sections.map(section => (
        <div key={section.key} className="flex flex-col gap-2">
          <span className="text-xs font-mono text-gray-600 
                           uppercase tracking-wider px-1
                           leading-tight">
            {section.label}
          </span>
          <div className="flex flex-col gap-1.5 items-center">
            {section.items.map(item => (
              <SidebarItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
