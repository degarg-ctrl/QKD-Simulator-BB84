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
      className={`border rounded-lg cursor-pointer transition-colors
                  ${isActive 
                    ? 'border-opacity-60 bg-gray-900/60' 
                    : 'border-gray-800 bg-gray-900/20 hover:border-gray-700'
                  }`}
      style={{ 
        borderColor: isActive ? stepData.color + '60' : undefined 
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
          <div className="text-sm font-mono text-white">
            {stepData.title}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
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
            <div className="px-4 pb-4 text-sm text-gray-400 
                            leading-relaxed border-t border-gray-800">
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
  const { setActiveView } = useSimulationStore()

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
    <div className="bg-[#0a0a0f] min-h-screen text-white">
      
      {/* Top nav */}
      <div className="sticky top-0 z-40 bg-[#11111a]/95 backdrop-blur
                      border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-3 
                        flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveView('simulator')}
              className="text-gray-500 hover:text-white 
                         font-mono text-xs transition-colors"
            >
              ← Simulator
            </button>
            <span className="text-gray-700">|</span>
            <span className="font-mono text-sm text-white">
              BB84 Guide
            </span>
          </div>
          {/* Section nav */}
          <div className="hidden md:flex items-center gap-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  const el = document.getElementById(s.id);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`px-3 py-1 text-xs font-mono rounded
                           transition-colors
                           ${activeSection === s.id
                             ? 'text-white bg-gray-800'
                             : 'text-gray-500 hover:text-gray-300'
                           }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12 
                      flex flex-col gap-20">

        {/* ── SECTION 1: What is QKD ── */}
        <section id="intro" className="flex flex-col gap-8">
          <div>
            <div className="text-xs font-mono text-[#6366f1] 
                            uppercase tracking-widest mb-2">
              Introduction
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              {QKD_INTRO.title}
            </h1>
            <p className="text-gray-300 leading-relaxed text-lg max-w-3xl">
              {QKD_INTRO.summary}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 bg-[#11111a] border border-gray-800 
                            rounded-lg">
              <div className="text-xs font-mono text-yellow-400 
                              uppercase tracking-wider mb-3">
                ⚠ The Quantum Threat
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {QKD_INTRO.whyItMatters}
              </p>
            </div>
            <div className="p-5 bg-[#11111a] border border-gray-800 
                            rounded-lg">
              <div className="text-xs font-mono text-[#22c55e] 
                              uppercase tracking-wider mb-3">
                ✓ The Quantum Solution
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
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
            <h2 className="text-2xl font-bold text-white mb-2">
              The BB84 Protocol — Step by Step
            </h2>
            <p className="text-gray-400 text-sm">
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
            <h2 className="text-2xl font-bold text-white mb-4">
              Security Analysis
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-950/20 border 
                            border-green-900/40 rounded-lg">
              <div className="text-xs font-mono text-[#22c55e] 
                              mb-2 uppercase tracking-wider">
                QBER &lt; 7%
              </div>
              <div className="text-2xl font-mono font-bold 
                              text-[#22c55e] mb-2">
                Secure
              </div>
              <p className="text-xs text-gray-400">
                Channel noise is within acceptable limits. 
                No significant eavesdropping detected. 
                Key extraction proceeds normally.
              </p>
            </div>
            <div className="p-4 bg-yellow-950/20 border 
                            border-yellow-900/40 rounded-lg">
              <div className="text-xs font-mono text-yellow-400 
                              mb-2 uppercase tracking-wider">
                7% ≤ QBER &lt; 11%
              </div>
              <div className="text-2xl font-mono font-bold 
                              text-yellow-400 mb-2">
                Warning
              </div>
              <p className="text-xs text-gray-400">
                Elevated error rate. Possible partial 
                eavesdropping or high channel noise. 
                Key rate significantly degraded.
              </p>
            </div>
            <div className="p-4 bg-red-950/20 border 
                            border-red-900/40 rounded-lg">
              <div className="text-xs font-mono text-[#ef4444] 
                              mb-2 uppercase tracking-wider">
                QBER ≥ 11%
              </div>
              <div className="text-2xl font-mono font-bold 
                              text-[#ef4444] mb-2">
                Abort
              </div>
              <p className="text-xs text-gray-400">
                Security threshold breached. Session aborted. 
                Eve likely intercepting significant fraction 
                of photons. SKR = 0.
              </p>
            </div>
          </div>

          <div className="p-5 bg-[#11111a] border border-gray-800 
                          rounded-lg">
            <div className="text-xs font-mono text-gray-500 
                            uppercase tracking-wider mb-3">
              Secret Key Rate Formula
            </div>
            <div className="font-mono text-center text-lg 
                            text-[#6366f1] py-4">
              R = S × (1 - 2H(Q))
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="text-center">
                <div className="font-mono text-[#6366f1] text-sm">
                  R
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Secret Key Rate
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-[#22c55e] text-sm">
                  S
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Sifted Key Rate
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-yellow-400 text-sm">
                  H(Q)
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Binary Entropy of QBER
                </div>
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
            <h2 className="text-2xl font-bold text-white mb-4">
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
                description: `Check the Metrics tab below the canvas. 
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
                   className="flex gap-4 p-4 bg-[#11111a] 
                              border border-gray-800 rounded-lg">
                <div className="text-2xl font-mono font-bold 
                                text-gray-700 flex-shrink-0 w-10">
                  {item.step}
                </div>
                <div className="flex-1">
                  <div className="font-mono text-white text-sm 
                                  font-semibold mb-1">
                    {item.title}
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">
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
            <h2 className="text-2xl font-bold text-white mb-4">
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
        <div className="border-t border-gray-800 pt-8 
                        text-center mb-20">
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
    </div>
  )
}
