/**
 * src/pages/GuidePage.jsx
 *
 * Complete beginner guide for BB84 QKD Simulator.
 * Five sections:
 *   1. What is QKD
 *   2. BB84 Protocol — step by step
 *   3. Security Analysis — QBER and thresholds
 *   4. Using the Simulator
 *   5. Glossary
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
    icon: '⚛',
    visual: 'bits'
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
    icon: '⊕',
    visual: 'bases'
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
    icon: '→',
    visual: 'photons'
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
    icon: '📡',
    visual: 'measure'
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
    icon: '⇌',
    visual: 'sift'
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
    icon: '🔑',
    visual: 'key'
  }
]

// ─── SECTION 5 DATA ──────────────────────────────────────────
const GLOSSARY = [
  { term: 'BB84', definition: 'The first quantum key distribution protocol, proposed by Charles Bennett and Gilles Brassard in 1984. Uses four polarization states across two bases to establish a secure key.' },
  { term: 'QBER', definition: 'Quantum Bit Error Rate. The fraction of sifted key bits that differ between Alice and Bob. A QBER above 11% indicates eavesdropping or excessive channel noise.' },
  { term: 'SKR', definition: 'Secret Key Rate. The rate at which secure key bits can be generated. Computed as S × (1 - 2H(Q)) where S is the sifted key rate and H(Q) is binary entropy.' },
  { term: 'Sifting', definition: 'The process of discarding bits where Alice and Bob chose different measurement bases. Retains approximately 50% of raw bits.' },
  { term: 'Polarization', definition: 'The orientation of a photon\'s oscillation. BB84 uses four polarization angles (0°, 45°, 90°, 135°) to encode bits across two bases.' },
  { term: 'Intercept-Resend', definition: 'Eve\'s attack strategy. She measures each photon in a random basis and re-emits a new photon. When her basis mismatches Alice\'s, she introduces a 25% error rate.' },
  { term: 'Binary Entropy', definition: 'H(Q) = -Q·log₂(Q) - (1-Q)·log₂(1-Q). Measures uncertainty in a biased coin flip. Used in the SKR formula to quantify information Eve may have gained.' },
  { term: 'Beer-Lambert Law', definition: 'Governs photon loss over fiber distance. Survival probability = 10^(-α·d/10) where α = 0.2 dB/km. At 50km only ~10% of photons survive.' },
  { term: 'Dark Count', definition: 'A false detector firing with no real photon. Probability ~10⁻⁵ per slot. Contributes a small baseline QBER even with no Eve and perfect fiber.' },
  { term: 'Detector Efficiency', definition: 'η = probability a real arriving photon is detected. Default 85%. Limits the maximum achievable key rate regardless of distance.' },
]

// ─── POLARIZATION DIAGRAM SVG ────────────────────────────────
function PolarizationDiagram() {
  const states = [
    { angle: 0,   label: '|0⟩', basis: '+', bit: 0, 
      color: '#6366f1', x: 80,  y: 80  },
    { angle: 90,  label: '|1⟩', basis: '+', bit: 1, 
      color: '#6366f1', x: 200, y: 80  },
    { angle: 45,  label: '|+⟩', basis: '×', bit: 0, 
      color: '#a855f7', x: 80,  y: 180 },
    { angle: 135, label: '|-⟩', basis: '×', bit: 1, 
      color: '#a855f7', x: 200, y: 180 },
  ]

  return (
    <div className="bg-gray-900/50 border border-gray-800 
                    rounded-lg p-4 inline-block">
      <div className="text-xs font-mono text-gray-500 mb-3 
                      uppercase tracking-wider">
        BB84 Polarization States
      </div>
      <svg width="280" height="240" className="overflow-visible">
        {/* Column headers */}
        <text x="80" y="20" textAnchor="middle" 
              fill="#6366f1" fontSize="11" fontFamily="monospace">
          Bit 0
        </text>
        <text x="200" y="20" textAnchor="middle" 
              fill="#6366f1" fontSize="11" fontFamily="monospace">
          Bit 1
        </text>
        {/* Row headers */}
        <text x="10" y="85" fill="#6366f1" fontSize="11" 
              fontFamily="monospace">+</text>
        <text x="10" y="185" fill="#a855f7" fontSize="11" 
              fontFamily="monospace">×</text>

        {states.map((s, i) => {
          const rad = (s.angle * Math.PI) / 180
          const len = 24
          const dx = Math.cos(rad) * len
          const dy = Math.sin(rad) * len
          return (
            <g key={i}>
              {/* Glow circle */}
              <circle cx={s.x} cy={s.y} r="20" 
                      fill={s.color} fillOpacity="0.1"
                      stroke={s.color} strokeOpacity="0.3" 
                      strokeWidth="1"/>
              {/* Photon body */}
              <circle cx={s.x} cy={s.y} r="8" 
                      fill={s.color} fillOpacity="0.8"/>
              {/* Polarization line */}
              <line x1={s.x - dx/2} y1={s.y - dy/2}
                    x2={s.x + dx/2} y2={s.y + dy/2}
                    stroke="white" strokeWidth="2" 
                    strokeOpacity="0.9"/>
              {/* Label */}
              <text x={s.x} y={s.y + 36} textAnchor="middle"
                    fill={s.color} fontSize="12" 
                    fontFamily="monospace">
                {s.label}
              </text>
              <text x={s.x} y={s.y + 48} textAnchor="middle"
                    fill="#6b7280" fontSize="10" 
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
        backgroundColor: isActive ? 'var(--card-bg)' : 'transparent',
        borderColor: isActive ? stepData.color + '60' : 'var(--card-border)' 
      }}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="w-8 h-8 rounded-full flex items-center 
                        justify-center text-sm font-mono font-bold
                        flex-shrink-0"
             style={{ 
               backgroundColor: stepData.color + '20',
               color: stepData.color,
               border: `1px solid ${stepData.color}40`
             }}>
          {stepData.step}
        </div>
        <div className="flex-1">
          <div className="text-sm font-mono"
               style={{ color: 'var(--text-primary)' }}>
            {stepData.title}
          </div>
          <div className="text-xs mt-0.5 line-clamp-1"
               style={{ color: 'var(--text-muted)' }}>
            {stepData.description.slice(0, 80)}...
          </div>
        </div>
        <div className="text-lg">{stepData.icon}</div>
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
            <div className="px-4 pb-4 border-t border-gray-800/50">
              <p className="text-sm text-gray-300 leading-relaxed mt-3">
                {stepData.description}
              </p>
              <div className="mt-3 p-3 bg-gray-950/50 rounded 
                              border border-gray-800/50">
                <p className="text-xs font-mono text-gray-400 
                               whitespace-pre-line leading-relaxed">
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
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between 
                   px-4 py-3 text-left hover:bg-gray-900/50 
                   transition-colors"
      >
        <span className="text-sm font-mono text-quantum-blue">
          {term}
        </span>
        <span className="text-gray-500 font-mono text-xs">
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

// ─── MAIN PAGE ────────────────────────────────────────────────
const SECTIONS = [
  { id: 'intro',     label: 'What is QKD' },
  { id: 'protocol',  label: 'BB84 Protocol' },
  { id: 'security',  label: 'Security' },
  { id: 'usage',     label: 'Using the Simulator' },
  { id: 'glossary',  label: 'Glossary' },
]

export default function GuidePage() {
  const [activeStep, setActiveStep] = useState(0)
  const [activeSection, setActiveSection] = useState('intro')
  const [activeTab, setActiveTab] = useState('theory')
  const { setActiveView, theme } = useSimulationStore()

  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const sections = SECTIONS.map(s => 
        document.getElementById(s.id)
      )
      const scrollY = window.scrollY + 100
      for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i] && sections[i].offsetTop <= scrollY) {
          setActiveSection(SECTIONS[i].id)
          break
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen"
         style={{ background: 'var(--bg-primary)',
                  color: 'var(--text-primary)' }}>
      
      {/* Top nav */}
      <div className="sticky top-0 z-40 backdrop-blur border-b"
           style={{ background: 'var(--panel-bg)',
                    borderColor: 'var(--border-color)' }}>
        <div className="max-w-5xl mx-auto px-6 py-3 
                        flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-white 
                                     font-mono text-xs transition-colors">
              ← Simulator
            </Link>
            <span className="text-gray-700">|</span>
            <span className="font-mono text-sm"
                  style={{ color: 'var(--text-primary)' }}>
              BB84 Guide
            </span>
          </div>
          {/* Section nav */}
          <div className="hidden md:flex items-center gap-1">
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`px-3 py-1 text-xs font-mono rounded
                           transition-colors
                           ${activeSection === s.id
                             ? 'bg-gray-800/20' 
                             : 'hover:text-gray-300'
                           }`}
                style={{
                  color: activeSection === s.id 
                    ? 'var(--text-primary)' 
                    : 'var(--text-muted)'
                }}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}

      {/* Tab Navigation */}
      <div className="sticky top-16 z-30 backdrop-blur border-b"
           style={{ background: 'var(--panel-bg)',
                    borderColor: 'var(--border-color)' }}>
        <div className="max-w-5xl mx-auto px-6 flex gap-4">
          <button
            onClick={() => setActiveTab('theory')}
            className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
              activeTab === 'theory'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Theory
          </button>
          <button
            onClick={() => setActiveTab('gates')}
            className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
              activeTab === 'gates'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Gates
          </button>
          <button
            onClick={() => setActiveTab('pns')}
            className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
              activeTab === 'pns'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            PNS Attack
          </button>
          <button
            onClick={() => setActiveTab('experiments')}
            className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
              activeTab === 'experiments'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Experiments
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`px-4 py-3 text-sm font-mono border-b-2 transition-colors ${
              activeTab === 'exercises'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Exercises
          </button>
        </div>
      </div>

      {activeTab === 'gates' && (
        <div className="max-w-5xl mx-auto px-6 py-12">
          <GatesSection />
        </div>
      )}

      {activeTab === 'pns' && (
        <div className="max-w-5xl mx-auto px-6 py-12">
          <PNSAttackSection />
        </div>
      )}

      {activeTab === 'experiments' && (
        <div className="max-w-5xl mx-auto px-6 py-12">
          <ExperimentsSection />
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="max-w-5xl mx-auto px-6 py-12">
          <GuidedExercises />
        </div>
      )}

      {activeTab === 'theory' && (
      <div className="max-w-5xl mx-auto px-6 py-12
                      flex flex-col gap-20">

        {/* ── SECTION 1: What is QKD ── */}
        <section id="intro" className="flex flex-col gap-8">
          <div>
            <div className="text-xs font-mono text-[#6366f1] 
                            uppercase tracking-widest mb-2">
              Introduction
            </div>
            <h1 className="text-3xl font-bold mb-4"
                style={{ color: 'var(--text-primary)' }}>
              {QKD_INTRO.title}
            </h1>
            <p className="leading-relaxed text-lg max-w-3xl"
               style={{ color: 'var(--text-secondary)' }}>
              {QKD_INTRO.summary}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-lg border"
                 style={{ background: 'var(--card-bg)', 
                          borderColor: 'var(--card-border)' }}>
              <div className="text-xs font-mono text-yellow-400 
                              uppercase tracking-wider mb-3">
                ⚠ The Quantum Threat
              </div>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                {QKD_INTRO.whyItMatters}
              </p>
            </div>
            <div className="p-5 rounded-lg border"
                 style={{ background: 'var(--card-bg)', 
                          borderColor: 'var(--card-border)' }}>
              <div className="text-xs font-mono text-[#22c55e] 
                              uppercase tracking-wider mb-3">
                ✓ The Quantum Solution
              </div>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                {QKD_INTRO.keyPrinciple}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <PolarizationDiagram />
          </div>
        </section>

        {/* ── SECTION 2: BB84 Protocol ── */}
        <section id="protocol" className="flex flex-col gap-6">
          <div>
            <div className="text-xs font-mono text-[#6366f1] 
                            uppercase tracking-widest mb-2">
              Protocol
            </div>
            <h2 className="text-2xl font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}>
              The BB84 Protocol — Step by Step
            </h2>
            <p className="text-sm"
               style={{ color: 'var(--text-muted)' }}>
              Click each step to expand the full explanation.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {BB84_STEPS.map((step, i) => (
              <StepCard
                key={step.step}
                stepData={step}
                isActive={activeStep === i}
                onClick={() => setActiveStep(
                  activeStep === i ? -1 : i
                )}
              />
            ))}
          </div>
        </section>

        {/* ── SECTION 3: Security Analysis ── */}
        <section id="security" className="flex flex-col gap-6">
          <div>
            <div className="text-xs font-mono text-[#6366f1] 
                            uppercase tracking-widest mb-2">
              Security
            </div>
            <h2 className="text-2xl font-bold mb-4"
                style={{ color: 'var(--text-primary)' }}>
              Security Analysis
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border"
                 style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          borderColor: 'rgba(34, 197, 94, 0.3)' }}>
              <div className="text-xs font-mono text-[#22c55e] 
                              mb-2 uppercase tracking-wider">
                QBER &lt; 7%
              </div>
              <div className="text-2xl font-mono font-bold 
                              text-[#22c55e] mb-2">
                Secure
              </div>
              <p className="text-xs"
                 style={{ color: 'var(--text-muted)' }}>
                Channel noise is within acceptable limits. 
                No significant eavesdropping detected. 
                Key extraction proceeds normally.
              </p>
            </div>
            <div className="p-4 rounded-lg border"
                 style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)',
                          borderColor: 'rgba(234, 179, 8, 0.3)' }}>
              <div className="text-xs font-mono text-yellow-400 
                              mb-2 uppercase tracking-wider">
                7% ≤ QBER &lt; 11%
              </div>
              <div className="text-2xl font-mono font-bold 
                              text-yellow-400 mb-2">
                Warning
              </div>
              <p className="text-xs"
                 style={{ color: 'var(--text-muted)' }}>
                Elevated error rate. Possible partial 
                eavesdropping or high channel noise. 
                Key rate significantly degraded.
              </p>
            </div>
            <div className="p-4 rounded-lg border"
                 style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="text-xs font-mono text-[#ef4444] 
                              mb-2 uppercase tracking-wider">
                QBER ≥ 11%
              </div>
              <div className="text-2xl font-mono font-bold 
                              text-[#ef4444] mb-2">
                Abort
              </div>
              <p className="text-xs"
                 style={{ color: 'var(--text-muted)' }}>
                Security threshold breached. Session aborted. 
                Eve likely intercepting significant fraction 
                of photons. SKR = 0.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-lg border"
               style={{ background: 'var(--card-bg)', 
                        borderColor: 'var(--card-border)' }}>
            <div className="text-xs font-mono uppercase tracking-wider mb-3"
                 style={{ color: 'var(--text-muted)' }}>
              Secret Key Rate Formula
            </div>
            <div className="font-mono text-center text-lg py-4"
                 style={{ color: '#6366f1' }}>
              R = S × (1 - 2H(Q))
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="text-center">
                <div className="font-mono text-[#6366f1] text-sm">
                  R
                </div>
                <div className="text-xs mt-1"
                     style={{ color: 'var(--text-muted)' }}>
                  Secret Key Rate
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-[#22c55e] text-sm">
                  S
                </div>
                <div className="text-xs mt-1"
                     style={{ color: 'var(--text-muted)' }}>
                  Sifted Key Rate
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-yellow-400 text-sm">
                  H(Q)
                </div>
                <div className="text-xs mt-1"
                     style={{ color: 'var(--text-muted)' }}>
                  Binary Entropy of QBER
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ── SECTION 3.5: Formulas and Mathematics ── */}
        <section id="formulas" className="flex flex-col gap-8">
          <div>
            <div className="text-xs font-mono text-quantum-blue 
                            uppercase tracking-widest mb-2">
              Mathematics
            </div>
            <h2 className="text-2xl font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}>
              Key Formulas
            </h2>
            <p className="text-sm"
               style={{ color: 'var(--text-muted)' }}>
              The physics and information theory behind BB84.
            </p>
          </div>

          {/* Formula 1: QBER */}
          <div className="p-6 bg-panel-bg border border-border-subtle 
                          rounded-lg flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-quantum-blue/20 
                              border border-quantum-blue/30
                              flex items-center justify-center
                              font-mono font-bold text-quantum-blue">
                Q
              </div>
              <h3 className="text-lg font-mono font-bold"
                  style={{ color: 'var(--text-primary)' }}>
                Quantum Bit Error Rate (QBER)
              </h3>
            </div>

            {/* Formula display */}
            <div className="p-4 rounded-lg border text-center"
                 style={{ background: '#1a1a2e', 
                          borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-2xl font-mono text-quantum-blue">
                QBER = E / N
              </div>
              <div className="text-sm mt-2 font-mono"
                   style={{ color: '#94a3b8' }}>
                E = erroneous bits in sample | N = total sampled bits
              </div>
            </div>

            {/* Derivation */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono text-gray-500 
                              uppercase tracking-wider">
                Derivation Context
              </div>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                After sifting, Alice and Bob sacrifice a random 
                sample (default 10%) of their matching bits for 
                error checking. They publicly compare these bits — 
                any discrepancy reveals either channel noise or 
                eavesdropping. The QBER is the fraction of 
                discrepant bits in this sample.
              </p>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                Without Eve: errors come only from thermal noise 
                and dark counts — typically 0-3%. With Eve's 
                intercept-resend attack: Eve randomly guesses 
                Alice's basis 50% of the time. Wrong guesses 
                produce random bits, introducing errors in 25% 
                of all intercepted photons.
              </p>
            </div>

            {/* Worked example */}
            <div className="p-4 rounded-lg border"
                 style={{ background: '#1a1a2e', 
                          borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-xs font-mono text-quantum-green 
                              uppercase tracking-wider mb-3">
                Worked Example
              </div>
              <div className="font-mono text-sm text-gray-300 
                              leading-relaxed">
                <div>Alice sends 1000 photons at 50km.</div>
                <div className="mt-1">After channel loss (~10% survival): 
                  <span className="text-quantum-blue ml-1">
                    ~100 photons detected
                  </span>
                </div>
                <div className="mt-1">After sifting (~50% match): 
                  <span className="text-quantum-blue ml-1">
                    ~50 sifted bits
                  </span>
                </div>
                <div className="mt-1">QBER sample (10%): 
                  <span className="text-quantum-blue ml-1">
                    5 bits checked
                  </span>
                </div>
                <div className="mt-1">With no Eve, 0 errors found:</div>
                <div className="mt-2 text-quantum-green font-bold">
                  QBER = 0 / 5 = 0.00%
                </div>
                <div className="mt-2">With full Eve, ~25% errors:</div>
                <div className="mt-1 text-quantum-red font-bold">
                  QBER = 1.25 / 5 ≈ 25.00%
                </div>
              </div>
            </div>

            {/* QBER vs Eve attack graph */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono text-gray-500 
                              uppercase tracking-wider">
                QBER vs Eve Interception Rate
              </div>
              <div style={{ background: 'var(--card-bg)', 
                            borderRadius: '8px', padding: '16px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={Array.from({length: 11}, (_, i) => ({
                      eve: i * 10,
                      qber: parseFloat((i * 0.1 * 0.25 * 100).toFixed(2))
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" 
                                   stroke="var(--panel-border)" />
                    <XAxis dataKey="eve" stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10,
                              fontFamily: 'monospace' }}
                      label={{ value: 'Interception %',
                               position: 'insideBottom',
                               offset: -2,
                               fill: 'var(--text-secondary)', fontSize: 10 }}
                    />
                    <YAxis stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10,
                              fontFamily: 'monospace' }}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--panel-bg)',
                        border: '1px solid var(--border-color)', borderRadius: '6px',
                        fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)' }}
                      formatter={(v) => [`${v}%`, 'QBER']}
                      labelFormatter={(l) => `Eve: ${l}%`}
                    />
                    <ReferenceLine y={11} stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: '11% threshold',
                               fill: '#ef4444', fontSize: 9,
                               fontFamily: 'monospace' }}
                    />
                    <Line type="monotone" dataKey="qber"
                      stroke="#6366f1" strokeWidth={2} dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Formula 2: Binary Entropy */}
          <div className="p-6 bg-panel-bg border border-border-subtle 
                          rounded-lg flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-yellow-500/20 
                              border border-yellow-500/30
                              flex items-center justify-center
                              font-mono font-bold text-yellow-400">
                H
              </div>
              <h3 className="text-lg font-mono font-bold"
                  style={{ color: 'var(--text-primary)' }}>
                Binary Entropy H(Q)
              </h3>
            </div>

            <div className="p-4 rounded-lg border text-center"
                 style={{ background: '#1a1a2e', 
                          borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-xl font-mono text-yellow-400">
                H(Q) = -Q·log₂(Q) - (1-Q)·log₂(1-Q)
              </div>
              <div className="text-sm mt-2 font-mono"
                   style={{ color: '#94a3b8' }}>
                Q = QBER | H(0) = 0 | H(0.5) = 1 | H(0.11) ≈ 0.5
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono text-gray-500 
                              uppercase tracking-wider">
                Derivation Context
              </div>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                Binary entropy measures the uncertainty in a 
                biased coin flip. When Q=0, there are no errors — 
                complete certainty, H=0. When Q=0.5, every bit is 
                random — maximum uncertainty, H=1. The function 
                is symmetric around Q=0.5 and reaches its maximum 
                there.
              </p>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                In BB84, H(Q) quantifies how much information Eve 
                might have gained about the key. Higher QBER means 
                Eve likely intercepted more photons, gaining more 
                information — H(Q) captures this uncertainty.
              </p>
            </div>

            <div className="p-4 rounded-lg border"
                 style={{ background: '#1a1a2e', 
                          borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-xs font-mono text-quantum-green 
                              uppercase tracking-wider mb-3">
                Worked Example
              </div>
              <div className="font-mono text-sm text-gray-300 
                              leading-relaxed">
                <div>At QBER = 0.05 (5% error rate):</div>
                <div className="mt-1 text-gray-400">
                  H(0.05) = -(0.05)·log₂(0.05) 
                           - (0.95)·log₂(0.95)
                </div>
                <div className="mt-1 text-gray-400">
                  H(0.05) = -(0.05)·(-4.32) - (0.95)·(-0.074)
                </div>
                <div className="mt-2 text-quantum-green font-bold">
                  H(0.05) ≈ 0.286 bits
                </div>
                <div className="mt-2">At QBER = 0.11 (threshold):</div>
                <div className="mt-1 text-quantum-red font-bold">
                  H(0.11) ≈ 0.500 bits — SKR hits zero here
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono text-gray-500 
                              uppercase tracking-wider">
                Binary Entropy Curve
              </div>
              <div style={{ background: 'var(--card-bg)', 
                            borderRadius: '8px', padding: '16px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={Array.from({length: 51}, (_, i) => {
                      const q = i * 0.01
                      const h = q === 0 || q === 1 ? 0
                        : -(q * Math.log2(q)) 
                          - ((1-q) * Math.log2(1-q))
                      return { 
                        q: parseFloat((q * 100).toFixed(0)),
                        h: parseFloat(h.toFixed(3))
                      }
                    })}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3"
                                   stroke="var(--panel-border)" />
                    <XAxis dataKey="q" stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10,
                              fontFamily: 'monospace' }}
                      label={{ value: 'QBER %',
                               position: 'insideBottom',
                               offset: -2,
                               fill: 'var(--text-secondary)', fontSize: 10 }}
                    />
                    <YAxis stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10,
                              fontFamily: 'monospace' }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--panel-bg)',
                        border: '1px solid var(--border-color)', borderRadius: '6px',
                        fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)' }}
                      formatter={(v) => [v, 'H(Q)']}
                      labelFormatter={(l) => `QBER: ${l}%`}
                    />
                    <ReferenceLine x={11} stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: 'Q=11%',
                               fill: '#ef4444', fontSize: 9,
                               fontFamily: 'monospace' }}
                    />
                    <Line type="monotone" dataKey="h"
                      stroke="#f59e0b" strokeWidth={2} dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Formula 3: SKR */}
          <div className="p-6 bg-panel-bg border border-border-subtle 
                          rounded-lg flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-quantum-green/20 
                              border border-quantum-green/30
                              flex items-center justify-center
                              font-mono font-bold text-quantum-green">
                R
              </div>
              <h3 className="text-lg font-mono font-bold"
                  style={{ color: 'var(--text-primary)' }}>
                Secret Key Rate (SKR)
              </h3>
            </div>

            <div className="p-4 rounded-lg border text-center"
                 style={{ background: '#1a1a2e', 
                          borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-2xl font-mono text-quantum-green">
                R = S · (1 - 2·H(Q))
              </div>
              <div className="text-sm mt-2 font-mono"
                   style={{ color: '#94a3b8' }}>
                S = sifted key rate | H(Q) = binary entropy of QBER
              </div>
              <div className="text-xs mt-1 font-mono"
                   style={{ color: '#64748b' }}>
                R = 0 when Q ≥ 0.11
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono text-gray-500 
                              uppercase tracking-wider">
                Derivation Context
              </div>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                The SKR formula comes from information theory. 
                The term (1 - 2H(Q)) represents the fraction of 
                sifted bits that can be made secure after accounting 
                for Eve's potential knowledge. The factor of 2 
                appears because both error correction (revealing 
                H(Q) bits of information) and privacy amplification 
                (removing H(Q) bits of potential Eve knowledge) 
                must be applied.
              </p>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                When QBER reaches 11%, H(0.11) ≈ 0.5, making 
                1 - 2×0.5 = 0. No secure bits can be extracted. 
                Above 11%, the term goes negative — the channel 
                is too noisy or too compromised to be useful.
              </p>
            </div>

            <div className="p-4 rounded-lg border"
                 style={{ background: '#1a1a2e', 
                          borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-xs font-mono text-quantum-green 
                              uppercase tracking-wider mb-3">
                Worked Example
              </div>
              <div className="font-mono text-sm text-gray-300 
                              leading-relaxed">
                <div>1000 raw bits, 50km distance, 0% Eve:</div>
                <div className="mt-1 text-gray-400">
                  Detected: ~85 photons (85% efficiency × 10% survival)
                </div>
                <div className="mt-1 text-gray-400">
                  Sifted: ~42 bits (50% basis match)
                </div>
                <div className="mt-1 text-gray-400">
                  S = 42 / 1000 = 0.042
                </div>
                <div className="mt-1 text-gray-400">
                  QBER ≈ 0% → H(0) = 0
                </div>
                <div className="mt-2 text-quantum-green font-bold">
                  R = 0.042 × (1 - 2×0) = 0.042 bits/bit
                </div>
                <div className="mt-2">Same run with 25% QBER (full Eve):</div>
                <div className="mt-1 text-gray-400">
                  H(0.25) ≈ 0.811
                </div>
                <div className="mt-1 text-gray-400">
                  R = 0.042 × (1 - 2×0.811) = 0.042 × (-0.622)
                </div>
                <div className="mt-1 text-quantum-red font-bold">
                  R = 0 (clamped — negative SKR means abort)
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono text-gray-500 
                              uppercase tracking-wider">
                SKR vs QBER Curve
              </div>
              <div style={{ background: 'var(--card-bg)', 
                            borderRadius: '8px', padding: '16px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={Array.from({length: 16}, (_, i) => {
                      const q = i * 0.01
                      const h = q === 0 ? 0
                        : -(q * Math.log2(q))
                          - ((1-q) * Math.log2(1-q))
                      const s = 0.042
                      const r = Math.max(0, s * (1 - 2 * h))
                      return {
                        qber: parseFloat((q * 100).toFixed(0)),
                        skr: parseFloat(r.toFixed(4))
                      }
                    })}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3"
                                   stroke="var(--panel-border)" />
                    <XAxis dataKey="qber" stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10,
                              fontFamily: 'monospace' }}
                      label={{ value: 'QBER %',
                               position: 'insideBottom',
                               offset: -2,
                               fill: 'var(--text-secondary)', fontSize: 10 }}
                    />
                    <YAxis stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10,
                              fontFamily: 'monospace' }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--panel-bg)',
                        border: '1px solid var(--border-color)', borderRadius: '6px',
                        fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)' }}
                      formatter={(v) => [v, 'SKR']}
                      labelFormatter={(l) => `QBER: ${l}%`}
                    />
                    <ReferenceLine x={11} stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{ value: 'threshold',
                               fill: '#ef4444', fontSize: 9,
                               fontFamily: 'monospace' }}
                    />
                    <Line type="monotone" dataKey="skr"
                      stroke="#22c55e" strokeWidth={2} dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Formula 4: Beer-Lambert */}
          <div className="p-6 bg-panel-bg border border-border-subtle 
                          rounded-lg flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-purple-500/20 
                              border border-purple-500/30
                              flex items-center justify-center
                              font-mono font-bold text-purple-400">
                P
              </div>
              <h3 className="text-lg font-mono font-bold"
                  style={{ color: 'var(--text-primary)' }}>
                Fiber Attenuation (Beer-Lambert Law)
              </h3>
            </div>

            <div className="p-4 rounded-lg border text-center"
                 style={{ background: '#1a1a2e', 
                          borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-xl font-mono text-purple-400">
                P_survive = 10^(-α·d / 10)
              </div>
              <div className="text-sm mt-2 font-mono"
                   style={{ color: '#94a3b8' }}>
                α = 0.2 dB/km | d = distance in km
              </div>
              <div className="text-xs mt-1 font-mono"
                   style={{ color: '#64748b' }}>
                P_detect = P_survive · η + P_dark · (1 - P_survive · η)
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono text-gray-500 
                              uppercase tracking-wider">
                Derivation Context
              </div>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                Photons in fiber optic cables are absorbed and 
                scattered by the glass medium. The Beer-Lambert 
                law describes this exponential decay. Modern 
                telecom fiber has an attenuation coefficient of 
                ~0.2 dB/km at 1550nm wavelength — the standard 
                for quantum communication.
              </p>
              <p className="text-sm leading-relaxed"
                 style={{ color: 'var(--text-secondary)' }}>
                The detection probability adds detector efficiency 
                η (probability a surviving photon is actually 
                detected) and dark counts P_dark (false detections 
                from thermal noise even with no photon present).
              </p>
            </div>

            <div className="p-4 rounded-lg border"
                 style={{ background: '#1a1a2e', 
                          borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="text-xs font-mono text-quantum-green 
                              uppercase tracking-wider mb-3">
                Worked Example
              </div>
              <div className="font-mono text-sm text-gray-300 
                              leading-relaxed">
                {[
                  { d: 0,   p: 100,  det: 85   },
                  { d: 10,  p: 63.1, det: 53.6 },
                  { d: 25,  p: 31.6, det: 26.9 },
                  { d: 50,  p: 10.0, det: 8.5  },
                  { d: 75,  p: 3.16, det: 2.69 },
                  { d: 100, p: 1.0,  det: 0.85 },
                ].map(row => (
                  <div key={row.d} className="flex gap-4 mt-1">
                    <span className="text-gray-500 w-16">
                      d={row.d}km
                    </span>
                    <span className="text-purple-400 w-24">
                      P={row.p}%
                    </span>
                    <span className="text-quantum-blue">
                      detected≈{row.det}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-xs font-mono text-gray-500 
                              uppercase tracking-wider">
                Photon Survival vs Distance
              </div>
              <div style={{ background: 'var(--card-bg)', 
                            borderRadius: '8px', padding: '16px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart
                    data={Array.from({length: 21}, (_, i) => {
                      const d = i * 5
                      const p = Math.pow(10, -0.2 * d / 10) * 100
                      const det = p * 0.85 / 100
                      return {
                        distance: d,
                        survival: parseFloat(p.toFixed(2)),
                        detected: parseFloat((det * 100).toFixed(2))
                      }
                    })}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3"
                                   stroke="var(--panel-border)" />
                    <XAxis dataKey="distance" stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10,
                              fontFamily: 'monospace' }}
                      label={{ value: 'km',
                               position: 'insideRight',
                               fill: 'var(--text-secondary)', fontSize: 10 }}
                    />
                    <YAxis stroke="var(--text-secondary)"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10,
                              fontFamily: 'monospace' }}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--panel-bg)',
                        border: '1px solid var(--border-color)', borderRadius: '6px',
                        fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)' }}
                      labelFormatter={(l) => `${l} km`}
                    />
                    <Line type="monotone" dataKey="survival"
                      stroke="#a855f7" strokeWidth={2}
                      dot={false} name="Survival %"
                    />
                    <Line type="monotone" dataKey="detected"
                      stroke="#6366f1" strokeWidth={2}
                      dot={false} name="Detected %"
                      strokeDasharray="4 4"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs font-mono"
                   style={{ color: 'var(--text-muted)' }}>
                <span className="text-purple-400">━</span> Photon survival (fiber only)
                &nbsp;&nbsp;
                <span className="text-quantum-blue">╌</span> Detected (after η=0.85)
              </div>
            </div>
          </div>

        </section>


        {/* ── SECTION 4: Using the Simulator ── */}
        <section id="usage" className="flex flex-col gap-6">
          <div>
            <div className="text-xs font-mono text-[#6366f1] 
                            uppercase tracking-widest mb-2">
              Tutorial
            </div>
            <h2 className="text-2xl font-bold mb-4"
                style={{ color: 'var(--text-primary)' }}>
              Using the Simulator
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {[
              {
                step: '01',
                title: 'Set Parameters',
                description: `Use the Parameters panel on the right 
                  to configure your simulation. Start with the 
                  defaults: 1000 photons, 50km, 2% noise, no Eve.`,
                tip: 'Hover the ? icon next to each slider for a physics explanation.'
              },
              {
                step: '02', 
                title: 'Click RUN',
                description: `Press the RUN button in the top bar. 
                  The backend runs the complete BB84 pipeline and 
                  returns results in under 2 seconds.`,
                tip: 'Watch the status indicator change from READY → SIMULATING → SECURE.'
              },
              {
                step: '03',
                title: 'Watch the Photons',
                description: `Blue photons use the rectilinear (+) basis. 
                  Purple photons use the diagonal (×) basis. 
                  The line through each photon shows its exact 
                  polarization angle.`,
                tip: 'At 50km, ~90% of photons will fade mid-channel due to fiber attenuation.'
              },
              {
                step: '04',
                title: 'Read the Metrics',
                description: `Check the Performance tab below the canvas. 
                  QBER tells you the error rate. SKR tells you how 
                  many secure bits per raw bit were extracted.`,
                tip: 'Green = secure, Yellow = degraded, Red = threshold breached.'
              },
              {
                step: '05',
                title: 'Simulate an Attack',
                description: `Set Eve Attack to 100% and click RUN again. 
                  Watch the QBER jump to ~25% and the session abort. 
                  This demonstrates BB84 eavesdropping detection.`,
                tip: 'Try partial attack at 44% — this is near the detection threshold.'
              },
              {
                step: '06',
                title: 'Explore the Bit Stream',
                description: `Switch to the Bit Stream tab to see 
                  per-photon data. Intercepted photons are highlighted 
                  in red. The angle column shows each photon\'s 
                  polarization in degrees.`,
                tip: 'Rows with ✗ in the Match column were discarded during sifting.'
              },
            ].map(item => (
              <div key={item.step}
                   className="flex gap-4 p-4 rounded-lg border"
                   style={{ background: 'var(--card-bg)', 
                            borderColor: 'var(--card-border)' }}>
                <div className="text-2xl font-mono font-bold 
                                text-gray-700 flex-shrink-0 w-10">
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className="font-mono text-sm font-semibold mb-1"
                       style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                  <p className="text-sm leading-relaxed"
                     style={{ color: 'var(--text-secondary)' }}>
                    {item.description}
                  </p>
                  <div className="mt-2 text-xs font-mono 
                                  text-[#6366f1]">
                    💡 {item.tip}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 5: Glossary ── */}
        <section id="glossary" className="flex flex-col gap-6">
          <div>
            <div className="text-xs font-mono text-[#6366f1] 
                            uppercase tracking-widest mb-2">
              Reference
            </div>
            <h2 className="text-2xl font-bold mb-4"
                style={{ color: 'var(--text-primary)' }}>
              Glossary
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {GLOSSARY.map(item => (
              <GlossaryItem
                key={item.term}
                term={item.term}
                definition={item.definition}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t pt-8 text-center mb-20"
             style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveView('simulator')}
            className="inline-flex items-center gap-2 px-6 py-3
                       bg-indigo-600 hover:bg-indigo-500
                       text-white rounded font-mono text-sm
                       transition-colors"
          >
            ▶ Open Simulator
          </button>
          <p className="text-gray-600 text-xs font-mono mt-4">
            BB84 QKD Simulator — Research & Teaching Tool
          </p>
        </div>

      </div>
      )}

    </div>
  )
}
