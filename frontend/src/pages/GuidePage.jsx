/**
 * src/pages/GuidePage.jsx
 *
 * Comprehensive Guide for BB84 QKD Simulator.
 * Features:
 *   - Adjustable/Collapsible Left Sidebar with Table of Contents for quick jumps
 *   - Continuous scrollable single-page layout (no hidden tabs or overlapping top navs)
 *   - Full light/dark mode support using CSS variables
 *   - All solid colors (no gradients)
 *   - Complete content: Theory, BB84 Steps, Security & Math, Gates, PNS Attack, Experiments, Exercises, Glossary
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Layers,
  ShieldCheck,
  Calculator,
  HelpCircle,
  Cpu,
  Crosshair,
  FlaskConical,
  CheckSquare,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import useSimulationStore from '../store/simulationStore'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import GuidedExercises from '../components/guide/GuidedExercises'
import GatesSection from '../components/guide/GatesSection'
import PNSAttackSection from '../components/guide/PNSAttackSection'
import ExperimentsSection from '../components/guide/ExperimentsSection'

// ─── SECTION 1 DATA ──────────────────────────────────────────
const QKD_INTRO = {
  title: "What is Quantum Key Distribution?",
  summary: `Quantum Key Distribution (QKD) is a method of 
  establishing a cryptographic key between two parties using 
  the principles of quantum mechanics. Unlike classical 
  cryptography, its security is guaranteed by physics — 
  not computational hardness.`,

  whyItMatters: `Classical encryption like RSA relies on the 
  mathematical difficulty of factoring large numbers. 
  Quantum computers running Shor's algorithm can break RSA 
  in polynomial time. QKD is immune to this threat because 
  its security comes from quantum mechanics, not mathematics.`,

  keyPrinciple: `Any attempt to measure a quantum state 
  disturbs it. This is the Heisenberg Uncertainty Principle 
  in action. If Eve intercepts a photon and measures it, 
  she irreversibly disturbs the quantum state. Alice and Bob 
  detect this disturbance as an elevated QBER.`
}

// ─── SECTION 2 DATA ──────────────────────────────────────────
const BB84_STEPS = [
  {
    step: 1,
    title: "Alice Generates Random Bits",
    description: `Alice uses a quantum random number generator 
    to create a string of random bits (0s and 1s). These will 
    become the raw material for the secret key.`,
    detail: `In our simulator, Alice generates n_bits random bits 
    using NumPy's random number generator — a classical 
    approximation of a quantum source.`,
    color: '#6366f1',
    symbol: '01'
  },
  {
    step: 2,
    title: "Alice Chooses Random Bases",
    description: `For each bit, Alice randomly selects one of 
    two polarization bases: Rectilinear (+) or Diagonal (×). 
    Each basis is chosen with equal probability.`,
    detail: `Rectilinear (+): 0° and 90° polarization angles.
Diagonal (×): 45° and 135° polarization angles.`,
    color: '#6366f1',
    symbol: '+/×'
  },
  {
    step: 3,
    title: "Alice Encodes and Sends Photons",
    description: `Alice encodes each bit into a photon's 
    polarization state according to her chosen basis. 
    The photons travel through a fiber optic quantum channel 
    toward Bob.`,
    detail: `(+,0)→|0⟩ at 0° | (+,1)→|1⟩ at 90°
(×,0)→|+⟩ at 45° | (×,1)→|-⟩ at 135°`,
    color: '#a855f7',
    symbol: '→'
  },
  {
    step: 4,
    title: "Bob Measures in Random Bases",
    description: `Bob randomly chooses a measurement basis for 
    each incoming photon — independent of Alice's choices. 
    When bases match, Bob gets the correct bit. When they 
    differ, Bob gets a random result.`,
    detail: `Basis match probability: 50%. So roughly half of 
    Bob's measurements will agree with Alice before sifting.`,
    color: '#22c55e',
    symbol: 'DET'
  },
  {
    step: 5,
    title: "Basis Reconciliation (Sifting)",
    description: `Alice and Bob communicate publicly to compare 
    which bases they used. They keep only the bits where their 
    bases matched. This is the sifted key — roughly 50% of 
    the original bits.`,
    detail: `The basis comparison reveals no information about 
    the actual bits — only which positions to keep. 
    Eve listening to this public channel gains nothing useful.`,
    color: '#22c55e',
    symbol: 'SIFT'
  },
  {
    step: 6,
    title: "Error Estimation and Key Extraction",
    description: `Alice and Bob sacrifice a sample of their 
    sifted key to estimate the Quantum Bit Error Rate (QBER). 
    If QBER is below 11%, they proceed to extract a secure key. 
    Above 11% — session aborted, eavesdropper detected.`,
    detail: `The remaining bits after QBER sampling form the 
    raw secure key. Privacy amplification can further compress 
    it to eliminate any partial information Eve may have.`,
    color: '#ef4444',
    symbol: 'KEY'
  }
]

// ─── GLOSSARY DATA ──────────────────────────────────────────
const GLOSSARY = [
  { term: 'BB84', definition: 'The first quantum key distribution protocol, proposed by Charles Bennett and Gilles Brassard in 1984. Uses four polarization states across two bases to establish a secure key.' },
  { term: 'QBER', definition: 'Quantum Bit Error Rate. The fraction of sifted key bits that differ between Alice and Bob. A QBER above 11% indicates eavesdropping or excessive channel noise.' },
  { term: 'SKR', definition: 'Secret Key Rate. The rate at which secure key bits can be generated. Computed as S × (1 - 2H(Q)) where S is the sifted key rate and H(Q) is binary entropy.' },
  { term: 'Sifting', definition: 'The process of discarding bits where Alice and Bob chose different measurement bases. Retains approximately 50% of raw bits.' },
  { term: 'Polarization', definition: 'The orientation of a photon\'s oscillation. BB84 uses four polarization angles (0°, 45°, 90°, 135°) to encode bits across two bases.' },
  { term: 'Intercept-Resend', definition: 'Eve\'s attack strategy. She measures each photon in a random basis and re-emits a new photon. When her basis mismatches Alice\'s, she introduces a 25% error rate.' },
  { term: 'Binary Entropy', definition: 'H(Q) = -Q·log₂(Q) - (1-Q)·log₂(1-Q). Measures uncertainty in a biased coin flip. Used in the SKR formula to quantify information Eve may have gained.' },
  { term: 'Beer-Lambert Law', definition: 'Governs photon loss over fiber distance. Survival probability = 10^(-Î±·d/10) where α = 0.2 dB/km. At 50km only ~10% of photons survive.' },
  { term: 'Dark Count', definition: 'A false detector firing with no real photon. Probability ~10⁻⁵ per slot. Contributes a small baseline QBER even with no Eve and perfect fiber.' },
  { term: 'Detector Efficiency', definition: 'η = probability a real arriving photon is detected. Default 85%. Limits the maximum achievable key rate regardless of distance.' },
]

// ─── TABLE OF CONTENTS DEFINITIONS ──────────────────────────
const TOC_ITEMS = [
  { id: 'intro', label: 'What is QKD', icon: BookOpen },
  { id: 'protocol', label: 'BB84 Protocol', icon: Layers },
  { id: 'security', label: 'Security Analysis', icon: ShieldCheck },
  { id: 'formulas', label: 'Key Formulas & Math', icon: Calculator },
  { id: 'usage', label: 'Using Simulator', icon: HelpCircle },
  { id: 'gates', label: 'Quantum Gates', icon: Cpu },
  { id: 'pns', label: 'PNS Attack', icon: Crosshair },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical },
  { id: 'exercises', label: 'Exercises', icon: CheckSquare },
  { id: 'glossary', label: 'Glossary', icon: FileText },
]

// ─── POLARIZATION DIAGRAM SVG ────────────────────────────────
function PolarizationDiagram() {
  const states = [
    {
      angle: 0, label: '|0⟩', basis: '+', bit: 0,
      color: '#6366f1', x: 80, y: 80
    },
    {
      angle: 90, label: '|1⟩', basis: '+', bit: 1,
      color: '#6366f1', x: 200, y: 80
    },
    {
      angle: 45, label: '|+⟩', basis: '×', bit: 0,
      color: '#a855f7', x: 80, y: 180
    },
    {
      angle: 135, label: '|-⟩', basis: '×', bit: 1,
      color: '#a855f7', x: 200, y: 180
    },
  ]

  return (
    <div className="rounded-lg p-5 inline-block border"
      style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
      <div className="text-xs font-mono mb-4 uppercase tracking-wider font-semibold"
        style={{ color: 'var(--text-muted)' }}>
        BB84 Polarization States
      </div>
      <svg width="280" height="230" className="overflow-visible">
        {/* Column headers */}
        <text x="80" y="20" textAnchor="middle"
          fill="#6366f1" fontSize="12" fontFamily="monospace" fontWeight="bold">
          Bit 0
        </text>
        <text x="200" y="20" textAnchor="middle"
          fill="#6366f1" fontSize="12" fontFamily="monospace" fontWeight="bold">
          Bit 1
        </text>
        {/* Row headers */}
        <text x="10" y="85" fill="#6366f1" fontSize="13"
          fontFamily="monospace" fontWeight="bold">+</text>
        <text x="10" y="185" fill="#a855f7" fontSize="13"
          fontFamily="monospace" fontWeight="bold">×</text>

        {states.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180
          const len = 24
          const dx = Math.cos(rad) * len
          const dy = Math.sin(rad) * len
          return (
            <g key={i}>
              {/* Outer ring */}
              <circle cx={s.x} cy={s.y} r="20"
                fill={s.color} fillOpacity="0.15"
                stroke={s.color} strokeOpacity="0.4"
                strokeWidth="1.5" />
              {/* Photon body */}
              <circle cx={s.x} cy={s.y} r="8"
                fill={s.color} fillOpacity="0.9" />
              {/* Polarization line */}
              <line x1={s.x - dx / 2} y1={s.y - dy / 2}
                x2={s.x + dx / 2} y2={s.y + dy / 2}
                stroke="white" strokeWidth="2" />
              {/* Label */}
              <text x={s.x} y={s.y + 36} textAnchor="middle"
                fill={s.color} fontSize="12"
                fontFamily="monospace" fontWeight="bold">
                {s.label}
              </text>
              <text x={s.x} y={s.y + 48} textAnchor="middle"
                fill="var(--text-subtle)" fontSize="10"
                fontFamily="monospace">
                {s.angle}°
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── BB84 STEP CARD ───────────────────────────────────────────
function StepCard({ stepData, isActive, onClick }) {
  return (
    <motion.div
      layout
      onClick={onClick}
      className="border rounded-lg cursor-pointer transition-colors"
      style={{
        backgroundColor: isActive ? 'var(--card-bg)' : 'var(--panel-bg)',
        borderColor: isActive ? stepData.color : 'var(--border-color)'
      }}
    >
      <div className="flex items-center gap-4 p-4">
        <div className="w-8 h-8 rounded flex items-center 
                        justify-center text-xs font-mono font-bold
                        flex-shrink-0 text-white"
          style={{
            backgroundColor: stepData.color,
          }}>
          {stepData.step}
        </div>
        <div className="flex-1">
          <div className="text-sm font-mono font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            {stepData.title}
          </div>
          <div className="text-xs mt-0.5 line-clamp-1"
            style={{ color: 'var(--text-muted)' }}>
            {stepData.description}
          </div>
        </div>
        <div className="font-mono text-xs px-2 py-1 rounded border"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-subtle)' }}>
          {stepData.symbol}
        </div>
      </div>
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--text-secondary)' }}>
                {stepData.description}
              </p>
              <div className="mt-3 p-3 rounded border"
                style={{ backgroundColor: 'var(--code-bg)', borderColor: 'var(--card-border)' }}>
                <p className="text-xs font-mono whitespace-pre-line leading-relaxed"
                  style={{ color: 'var(--text-primary)' }}>
                  {stepData.detail}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── GLOSSARY ITEM ────────────────────────────────────────────
function GlossaryItem({ term, definition }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border rounded-lg overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
      >
        <span className="text-sm font-mono text-cyan-400 font-semibold">
          {term}
        </span>
        <span className="font-mono text-xs" style={{ color: 'var(--text-subtle)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm leading-relaxed border-t"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
              <p className="pt-3">{definition}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── MAIN GUIDE PAGE ──────────────────────────────────────────
export default function GuidePage() {
  const [activeStep, setActiveStep] = useState(0)
  const [activeSection, setActiveSection] = useState('intro')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { setActiveView } = useSimulationStore()
  const scrollContainerRef = useRef(null)

  // Scrollspy to highlight active section in sidebar
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollPos = container.scrollTop + 140
      for (let i = TOC_ITEMS.length - 1; i >= 0; i--) {
        const el = document.getElementById(TOC_ITEMS[i].id)
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(TOC_ITEMS[i].id)
          break
        }
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(id)
    }
  }

  return (
    <div className="flex h-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* ─── ADJUSTABLE LEFT SIDEBAR ─── */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 56 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col border-r flex-shrink-0 select-none z-20"
        style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
      >
        {/* Sidebar Header / Toggle */}
        <div className="flex items-center justify-between px-3 py-3 border-b"
          style={{ borderColor: 'var(--border-color)' }}>
          {!sidebarCollapsed && (
            <span className="text-xs font-mono uppercase tracking-widest font-semibold"
              style={{ color: 'var(--text-subtle)' }}>
              Guide Index
            </span>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded hover:bg-white/5 transition-colors ml-auto"
            style={{ color: 'var(--text-muted)' }}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* TOC Nav Items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {TOC_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded text-xs font-mono transition-colors text-left ${isActive
                    ? 'bg-cyan-500/20 text-cyan-400 font-semibold'
                    : 'hover:bg-white/5'
                  }`}
                style={{
                  color: isActive ? undefined : 'var(--text-muted)'
                }}
                title={item.label}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>
      </motion.aside>

      {/* ─── MAIN SCROLLABLE CONTENT ─── */}
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-10 lg:px-12 scroll-smooth"
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-16 pb-24">

          {/* ── SECTION 1: What is QKD ── */}
          <section id="intro" className="flex flex-col gap-6 scroll-mt-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest mb-2 font-semibold"
                style={{ color: '#6366f1' }}>
                Introduction
              </div>
              <h1 className="text-3xl font-bold font-mono mb-3"
                style={{ color: 'var(--text-primary)' }}>
                {QKD_INTRO.title}
              </h1>
              <p className="leading-relaxed text-base max-w-3xl"
                style={{ color: 'var(--text-secondary)' }}>
                {QKD_INTRO.summary}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-lg border"
                style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
                <div className="text-xs font-mono text-yellow-400 uppercase tracking-wider mb-2 font-semibold">
                  ⚠ The Quantum Threat
                </div>
                <p className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}>
                  {QKD_INTRO.whyItMatters}
                </p>
              </div>
              <div className="p-5 rounded-lg border"
                style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
                <div className="text-xs font-mono text-[#22c55e] uppercase tracking-wider mb-2 font-semibold">
                  ✓ The Quantum Solution
                </div>
                <p className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}>
                  {QKD_INTRO.keyPrinciple}
                </p>
              </div>
            </div>

            <div className="flex justify-center my-2">
              <PolarizationDiagram />
            </div>
          </section>

          {/* ── SECTION 2: BB84 Protocol ── */}
          <section id="protocol" className="flex flex-col gap-5 scroll-mt-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest mb-2 font-semibold"
                style={{ color: '#6366f1' }}>
                Protocol
              </div>
              <h2 className="text-2xl font-bold font-mono mb-1"
                style={{ color: 'var(--text-primary)' }}>
                The BB84 Protocol — Step by Step
              </h2>
              <p className="text-xs font-mono"
                style={{ color: 'var(--text-muted)' }}>
                Click any step to expand details.
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              {BB84_STEPS.map((step, i) => (
                <StepCard
                  key={step.step}
                  stepData={step}
                  isActive={activeStep === i}
                  onClick={() => setActiveStep(activeStep === i ? -1 : i)}
                />
              ))}
            </div>
          </section>

          {/* ── SECTION 3: Security Analysis ── */}
          <section id="security" className="flex flex-col gap-5 scroll-mt-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest mb-2 font-semibold"
                style={{ color: '#6366f1' }}>
                Security
              </div>
              <h2 className="text-2xl font-bold font-mono mb-2"
                style={{ color: 'var(--text-primary)' }}>
                Security Analysis
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                <div className="text-xs font-mono text-[#22c55e] mb-1 uppercase tracking-wider font-semibold">
                  QBER &lt; 7%
                </div>
                <div className="text-2xl font-mono font-bold text-[#22c55e] mb-2">
                  Secure
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Channel noise is within acceptable limits. Key extraction proceeds normally.
                </p>
              </div>
              <div className="p-4 rounded-lg border"
                style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)', borderColor: 'rgba(234, 179, 8, 0.3)' }}>
                <div className="text-xs font-mono text-yellow-400 mb-1 uppercase tracking-wider font-semibold">
                  7% ≤ QBER &lt; 11%
                </div>
                <div className="text-2xl font-mono font-bold text-yellow-400 mb-2">
                  Warning
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Elevated error rate. Possible partial eavesdropping. Key rate degraded.
                </p>
              </div>
              <div className="p-4 rounded-lg border"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                <div className="text-xs font-mono text-[#ef4444] mb-1 uppercase tracking-wider font-semibold">
                  QBER ≥ 11%
                </div>
                <div className="text-2xl font-mono font-bold text-[#ef4444] mb-2">
                  Abort
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Security threshold breached. Session aborted. SKR = 0.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-lg border"
              style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
              <div className="text-xs font-mono uppercase tracking-wider mb-2 font-semibold"
                style={{ color: 'var(--text-muted)' }}>
                Secret Key Rate Formula
              </div>
              <div className="font-mono text-center text-lg py-3 font-bold"
                style={{ color: '#6366f1' }}>
                R = S × (1 - 2H(Q))
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="text-center">
                  <div className="font-mono text-[#6366f1] text-sm font-bold">R</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Secret Key Rate</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-[#22c55e] text-sm font-bold">S</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sifted Key Rate</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-yellow-400 text-sm font-bold">H(Q)</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Binary Entropy</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 4: Formulas & Math ── */}
          <section id="formulas" className="flex flex-col gap-6 scroll-mt-6">
            <div>
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2 font-semibold">
                Mathematics
              </div>
              <h2 className="text-2xl font-bold font-mono mb-1"
                style={{ color: 'var(--text-primary)' }}>
                Key Formulas
              </h2>
              <p className="text-xs font-mono"
                style={{ color: 'var(--text-muted)' }}>
                The physics and information theory behind BB84.
              </p>
            </div>

            {/* Formula 1: QBER */}
            <div className="p-6 border rounded-lg flex flex-col gap-4"
              style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-cyan-600 flex items-center justify-center font-mono font-bold text-white">
                  Q
                </div>
                <h3 className="text-base font-mono font-bold"
                  style={{ color: 'var(--text-primary)' }}>
                  Quantum Bit Error Rate (QBER)
                </h3>
              </div>

              <div className="p-4 rounded-lg border text-center"
                style={{ backgroundColor: 'var(--code-bg)', borderColor: 'var(--card-border)' }}>
                <div className="text-xl font-mono text-cyan-400 font-bold">
                  QBER = E / N
                </div>
                <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                  E = erroneous bits in sample | N = total sampled bits
                </div>
              </div>

              <div className="space-y-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <p>
                  After sifting, Alice and Bob sacrifice a sample of their matching bits for error checking.
                  Without Eve: errors come only from dark counts and noise (0-3%). With full intercept-resend Eve, errors hit 25%.
                </p>
              </div>

              {/* Chart */}
              <div className="rounded-lg p-3 border"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart
                    data={Array.from({ length: 11 }, (_, i) => ({
                      eve: i * 10,
                      qber: parseFloat((i * 0.1 * 0.25 * 100).toFixed(2))
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="eve" stroke="var(--text-subtle)" tick={{ fill: 'var(--text-subtle)', fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis stroke="var(--text-subtle)" tick={{ fill: 'var(--text-subtle)', fontSize: 10, fontFamily: 'monospace' }} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '11px' }}
                      formatter={(v) => [`${v}%`, 'QBER']}
                      labelFormatter={(l) => `Eve: ${l}%`}
                    />
                    <ReferenceLine y={11} stroke="#ef4444" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="qber" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Formula 2: Binary Entropy */}
            <div className="p-6 border rounded-lg flex flex-col gap-4"
              style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-yellow-600 flex items-center justify-center font-mono font-bold text-white">
                  H
                </div>
                <h3 className="text-base font-mono font-bold"
                  style={{ color: 'var(--text-primary)' }}>
                  Binary Entropy H(Q)
                </h3>
              </div>

              <div className="p-4 rounded-lg border text-center"
                style={{ backgroundColor: 'var(--code-bg)', borderColor: 'var(--card-border)' }}>
                <div className="text-lg font-mono text-yellow-400 font-bold">
                  H(Q) = -Q·log₂(Q) - (1-Q)·log₂(1-Q)
                </div>
                <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                  Q = QBER | H(0) = 0 | H(0.5) = 1 | H(0.11) ≈ 0.5
                </div>
              </div>
            </div>

            {/* Formula 3: Fiber Attenuation */}
            <div className="p-6 border rounded-lg flex flex-col gap-4"
              style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center font-mono font-bold text-white">
                  P
                </div>
                <h3 className="text-base font-mono font-bold"
                  style={{ color: 'var(--text-primary)' }}>
                  Fiber Attenuation (Beer-Lambert Law)
                </h3>
              </div>

              <div className="p-4 rounded-lg border text-center"
                style={{ backgroundColor: 'var(--code-bg)', borderColor: 'var(--card-border)' }}>
                <div className="text-lg font-mono text-purple-400 font-bold">
                  P_survive = 10^(-Î±·d / 10)
                </div>
                <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>
                  α = 0.2 dB/km (1550nm telecom fiber) | d = distance in km
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 5: Using Simulator ── */}
          <section id="usage" className="flex flex-col gap-5 scroll-mt-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest mb-2 font-semibold"
                style={{ color: '#6366f1' }}>
                Tutorial
              </div>
              <h2 className="text-2xl font-bold font-mono mb-2"
                style={{ color: 'var(--text-primary)' }}>
                Using the Simulator
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { step: '01', title: 'Set Parameters', desc: 'Configure photon count, distance, noise, and Eve interception in the right sidebar.' },
                { step: '02', title: 'Click RUN', desc: 'Execute the BB84 pipeline — results and animations update in real time.' },
                { step: '03', title: 'Watch Photons', desc: 'Observe photon transmission across the quantum channel with accurate polarization.' },
                { step: '04', title: 'Inspect Bit Stream', desc: 'Open the Inspector tab to step through each individual photon state and measurement.' }
              ].map(item => (
                <div key={item.step} className="flex gap-4 p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
                  <div className="text-xl font-mono font-bold flex-shrink-0 w-8" style={{ color: '#00aacc' }}>
                    {item.step}
                  </div>
                  <div>
                    <div className="font-mono text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── SECTION 6: Quantum Gates ── */}
          <section id="gates" className="scroll-mt-6">
            <GatesSection />
          </section>

          {/* ── SECTION 7: PNS Attack ── */}
          <section id="pns" className="scroll-mt-6">
            <PNSAttackSection />
          </section>

          {/* ── SECTION 8: Guided Experiments ── */}
          <section id="experiments" className="scroll-mt-6">
            <ExperimentsSection />
          </section>

          {/* ── SECTION 9: Interactive Exercises ── */}
          <section id="exercises" className="scroll-mt-6">
            <GuidedExercises />
          </section>

          {/* ── SECTION 10: Glossary ── */}
          <section id="glossary" className="flex flex-col gap-5 scroll-mt-6">
            <div>
              <div className="text-xs font-mono uppercase tracking-widest mb-2 font-semibold"
                style={{ color: '#6366f1' }}>
                Reference
              </div>
              <h2 className="text-2xl font-bold font-mono mb-2"
                style={{ color: 'var(--text-primary)' }}>
                Glossary
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {GLOSSARY.map(item => (
                <GlossaryItem key={item.term} term={item.term} definition={item.definition} />
              ))}
            </div>
          </section>

          {/* ── FOOTER CTA ── */}
          <div className="border-t pt-8 text-center" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setActiveView('simulator')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-mono text-sm transition-colors"
            >
              ▶ Open Simulator
            </button>
            <p className="text-xs font-mono mt-3" style={{ color: 'var(--text-subtle)' }}>
              BB84 QKD Simulator — Interactive Research & Teaching Tool
            </p>
          </div>

        </div>
      </main>

    </div>
  )
}

