/**
 * src/pages/LandingPage.jsx
 *
 * Interactive Landing Page for BB84 QKD Simulator.
 * Features:
 * - High-performance scroll-synchronized quantum wavefield background
 * - Experiential Hero Optical Sandbox (dynamic wavepackets, polarizer discs, SPAD ripple rings)
 * - User-rotatable 3D Bloch Sphere for quantum gates (interactive mouse orbit, no auto-rotation)
 * - Scroll-linked synchronized entrance animations
 * - Precision scientific instrument aesthetics (neutral charcoal chassis, gold/amber and emerald accents, NO blue majority)
 * - Modern typography (Plus Jakarta Sans, Space Grotesk, JetBrains Mono)
 */

import { useState, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Play, FlaskConical, Orbit, Activity, ShieldAlert, Zap, Cpu, Sliders, Lock, ArrowRight } from 'lucide-react'
import useSimulationStore from '../store/simulationStore'
import HeroOpticalSandbox from '../components/landing/HeroOpticalSandbox'
import QuantumVideoBackground from '../components/landing/QuantumVideoBackground'
import QuantumStateBadge from '../components/quantum/QuantumStateBadge'
import { buildLandingConfiguration } from '../lib/landingPreset'

const BlochSphere = lazy(() => import('../components/visualizations/BlochSphere'))

const EXPERIMENTS = [
  { n: 1, title: 'Random bits, clean channel', params: { n_bits: 1000, distance_km: 10, attack_prob: 0 } },
  { n: 2, title: 'Manual photon encoding', params: { n_bits: 10, distance_km: 0, attack_prob: 0 } },
  { n: 3, title: 'Random bits + Eve intercept', params: { n_bits: 1000, distance_km: 10, attack_prob: 1.0, attack_strategy: 'intercept_resend' } },
  { n: 4, title: 'Manual encoding + Eve', params: { n_bits: 10, distance_km: 0, attack_prob: 1.0, attack_strategy: 'intercept_resend' } },
  { n: 5, title: 'Quantum gate transmission', params: { n_bits: 500, distance_km: 0, attack_prob: 0 } },
  { n: 6, title: 'No-cloning theorem', params: { n_bits: 500, distance_km: 0, attack_prob: 0 } },
  { n: 7, title: 'PNS attack with WCP source', params: { n_bits: 2000, distance_km: 10, attack_prob: 1.0, attack_strategy: 'pns', source_model: 'realistic', mu: 0.2 } },
  { n: 8, title: 'Decoy state protocol', params: { n_bits: 2000, distance_km: 10, attack_prob: 1.0, attack_strategy: 'pns', source_model: 'realistic', mu: 0.5, decoy_enabled: true } },
]

const GATES = [
  { symbol: 'H', name: 'Hadamard', desc: 'Switches polarization basis', effect: '|0⟩ → |+⟩, |1⟩ → |-⟩', axis: 'X+Z' },
  { symbol: 'X', name: 'Pauli-X', desc: 'Bit flip (NOT gate)', effect: '|0⟩ → |1⟩, |1⟩ → |0⟩', axis: 'X' },
  { symbol: 'Y', name: 'Pauli-Y', desc: 'Bit + phase flip', effect: '|0⟩ → i|1⟩, |+⟩ → -i|-⟩', axis: 'Y' },
  { symbol: 'Z', name: 'Pauli-Z', desc: 'Phase flip only', effect: '|+⟩ → |-⟩, |-⟩ → |+⟩', axis: 'Z' },
  { symbol: 'S', name: 'S Gate', desc: 'π/2 phase rotation', effect: '|+⟩ → |+i⟩, 22.5° rotation', axis: 'Z (π/2)' },
  { symbol: 'T', name: 'T Gate', desc: 'π/4 phase rotation', effect: '11.25° fine rotation', axis: 'Z (π/4)' },
]

const SIMULATOR_FEATURES = [
  {
    id: 'dual-mode',
    title: 'Dual-Engine Wavefront Pipeline',
    badge: 'rAF CANVAS ENGINE',
    badgeColor: '#f59e0b',
    icon: Activity,
    desc: 'Toggle between discrete symbolic wavepackets and a high-throughput beam playback mode. Both render through the ref-driven requestAnimationFrame canvas loop.',
    telemetry: 'Wave playback | Beam playback | Symbolic polarization states',
    actionText: 'Explore Dual Engine',
    actionParams: { n_bits: 50, distance_km: 5, attack_prob: 0 }
  },
  {
    id: 'eavesdrop',
    title: 'Quantum Eavesdropping Suite',
    badge: 'NO-CLONING THEOREM',
    badgeColor: '#e05252',
    icon: ShieldAlert,
    desc: 'Simulate beam-splitter interception where Eve performs projective measurements in random bases, triggering quantum collapse and elevating QBER above the 11% threshold.',
    telemetry: 'Full intercept-resend QBER ≈ 25% | Eve basis mismatch P = 0.5',
    actionText: 'Test Eavesdropping',
    actionParams: { n_bits: 1000, distance_km: 10, attack_prob: 1.0, attack_strategy: 'intercept_resend' }
  },
  {
    id: 'decoy-state',
    title: 'WCP & Decoy-State Defense',
    badge: 'PNS RESISTANCE',
    badgeColor: '#10b981',
    icon: Zap,
    desc: 'Model Poissonian photon statistics of Weak Coherent Pulses. Enable multi-intensity decoy states (signal, decoy, vacuum) to detect and thwart Photon Number Splitting attacks.',
    telemetry: 'Signal μ = 0.5 | Decoy ν = 0.1 | Vacuum ω = 0',
    actionText: 'Load Decoy Setup',
    actionParams: { n_bits: 2000, distance_km: 15, attack_prob: 1.0, attack_strategy: 'pns', source_model: 'realistic', mu: 0.5, decoy_enabled: true }
  },
  {
    id: 'optical-gates',
    title: 'Dynamic Quantum Gate Placement',
    badge: 'UNITARY TRANSFORMS',
    badgeColor: '#c084fc',
    icon: Cpu,
    desc: 'Place unitary operators—Hadamard, Pauli-X/Y/Z, and S/T phase shifters—directly along the optical fiber to rotate polarization states and test basis invariance.',
    telemetry: 'H, X, Y, Z, S (π/2), T (π/4) | 3D State Inspection',
    actionText: 'Open Gate Bench',
    actionParams: { n_bits: 500, distance_km: 0, attack_prob: 0 }
  },
  {
    id: 'fiber-loss',
    title: 'Telecom Fiber Physics & SPAD',
    badge: 'OPTICAL REALISM',
    badgeColor: '#f59e0b',
    icon: Sliders,
    desc: 'Physics-grounded attenuation modeling over silica fiber (0.2 dB/km) paired with single-photon avalanche photodiode (SPAD) quantum efficiency and dark-count noise.',
    telemetry: 'Beer-Lambert: 10^(-αd/10) | Realistic η = 85% | Dark = 10⁻⁵',
    actionText: 'Tune Fiber Parameters',
    actionParams: { n_bits: 1000, distance_km: 25, attack_prob: 0, source_model: 'realistic', mu: 0.2 }
  },
  {
    id: 'otp-crypto',
    title: 'Key Sifting & One-Time Pad',
    badge: 'INFORMATION SECURITY',
    badgeColor: '#10b981',
    icon: Lock,
    desc: 'Use the backend post-sampling key in an educational XOR demonstration. The simulator checks key agreement and modeled attacks before enabling the one-time-pad panel.',
    telemetry: 'Raw bits → Sifting → QBER sample → Matching key → XOR demo',
    actionText: 'Inspect Key Demonstration',
    actionParams: { n_bits: 1000, distance_km: 5, attack_prob: 0 }
  }
]


function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-serif)',
        fontStyle: 'italic',
        fontSize: '0.85rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: 'var(--q-accent, #f59e0b)',
        marginBottom: '0.75rem',
      }}
    >
      {children}
    </div>
  )
}

function StoryTransition({ label }) {
  return (
    <div aria-hidden="true" style={{ maxWidth: '68rem', margin: '0 auto', padding: '0 1.5rem', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--q-text-4)' }}>
        <span style={{ width: 7, height: 7, border: '1px solid var(--q-accent)', borderRadius: '50%', boxShadow: '0 0 12px color-mix(in srgb, var(--q-accent) 55%, transparent)' }} />
        <span style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, color-mix(in srgb, var(--q-accent) 36%, transparent), color-mix(in srgb, var(--q-border) 55%, transparent), transparent)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{label}</span>
      </div>
    </div>
  )
}

function LandingStoryRail() {
  const chapters = [
    { n: '01', title: 'Encode', copy: 'Alice selects a bit and basis, producing one of four BB84 polarization states.', state: { basis: '+', bit: 0 } },
    { n: '02', title: 'Transmit', copy: 'The pulse crosses a lossy optical channel while its event identity remains traceable.', state: { basis: 'x', bit: 0 } },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: '0.8rem', marginBottom: '1rem' }}>
      {chapters.map((chapter) => (
        <div key={chapter.n} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', border: '1px solid color-mix(in srgb, var(--q-border) 76%, transparent)', background: 'rgba(14, 13, 12, 0.48)', backdropFilter: 'blur(8px)', borderRadius: '0.45rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--q-accent)', fontSize: '0.68rem' }}>{chapter.n}</span>
          <span>
            <strong style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--q-text-1)' }}>{chapter.title}</strong>
            <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '0.7rem', lineHeight: 1.45, color: 'var(--q-text-3)' }}>{chapter.copy}</span>
          </span>
          <QuantumStateBadge basis={chapter.state.basis} bit={chapter.state.bit} size="sm" showKet={false} />
        </div>
      ))}
    </div>
  )
}

function SimulatorPreview() {
  return (
    <div aria-label="Simulator interface preview" style={{ marginTop: '1rem', border: '1px solid color-mix(in srgb, var(--q-accent) 30%, var(--q-border))', background: 'rgba(12, 12, 11, 0.68)', backdropFilter: 'blur(12px)', borderRadius: '0.6rem', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.32)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0.8rem', borderBottom: '1px solid var(--q-border)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--q-text-3)' }}>
        <span>SIMULATOR UI PREVIEW · BB84</span><span style={{ color: 'var(--q-success)' }}>● CHANNEL READY</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(9rem, 0.28fr)', minHeight: 150 }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '1.6rem 1.2rem' }}>
          <div style={{ position: 'absolute', left: '12%', right: '12%', top: '50%', height: 2, background: 'linear-gradient(90deg, var(--q-basis-rect), var(--q-accent), var(--q-basis-diag))' }} />
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--q-basis-rect)' }}>ALICE · TX</span>
            <QuantumStateBadge basis="x" bit={0} size="sm" showKet />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--q-success)' }}>BOB · RX</span>
          </div>
        </div>
        <div style={{ padding: '0.8rem', borderLeft: '1px solid var(--q-border)', background: 'rgba(24, 22, 19, 0.66)', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--q-text-3)', lineHeight: 1.9 }}>
          <div style={{ color: 'var(--q-text-2)' }}>RUN SNAPSHOT</div>
          <div>Pulses <b style={{ color: 'var(--q-text-1)' }}>1,000</b></div>
          <div>Fiber <b style={{ color: 'var(--q-text-1)' }}>10 km</b></div>
          <div>Mode <b style={{ color: 'var(--q-accent)' }}>Waves</b></div>
        </div>
      </div>
    </div>
  )
}

function AccentBadge({ children }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1.75rem',
        height: '1.75rem',
        flexShrink: 0,
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        backgroundColor: 'var(--q-surface-2, #1c1c23)',
        border: '1px solid var(--q-border, #2e2e38)',
        color: 'var(--q-accent, #f59e0b)',
      }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const { setActiveView, applySimulationConfiguration, openExperimentModal } = useSimulationStore()
  const [selectedGate, setSelectedGate] = useState(GATES[0])

  const launch = () => setActiveView('simulator')

  const launchExperiment = (exp) => {
    applySimulationConfiguration(buildLandingConfiguration(exp.params))
    setActiveView('simulator')
  }

  const openGuidedExperiment = (exp) => {
    setActiveView('simulator')
    openExperimentModal(`exp${exp.n}`)
  }

  const section = { maxWidth: '68rem', margin: '0 auto', padding: '4.5rem 1.5rem', position: 'relative', zIndex: 1 }
  const sectionAlt = {
    position: 'relative',
    zIndex: 1,
  }
  const localSurface = {
    border: '1px solid color-mix(in srgb, var(--q-border) 78%, transparent)',
    borderRadius: '0.75rem',
    background: 'linear-gradient(145deg, rgba(18, 17, 15, 0.76), rgba(13, 13, 14, 0.58))',
    boxShadow: '0 22px 70px rgba(0,0,0,0.26)',
    backdropFilter: 'blur(12px)',
  }

  const h2 = {
    fontFamily: 'var(--font-serif)',
    fontSize: '2.1rem',
    fontWeight: 600,
    letterSpacing: '-0.015em',
    marginBottom: '1.5rem',
    lineHeight: 1.25,
    color: 'var(--q-text-1, #f1f1f4)',
  }

  const bodyText = {
    fontFamily: 'var(--font-body)',
    color: 'var(--q-text-3, #9e9ea8)',
    lineHeight: 1.7,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(10,10,11,0.3), rgba(12,11,10,0.52))',
        color: 'var(--q-text-1, #f1f1f4)',
        position: 'relative',
      }}
    >
      {/* ── Cinematic Scroll-Synchronized Quantum Background Video ── */}
      <QuantumVideoBackground />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ ...section, paddingTop: '3.5rem', paddingBottom: '3rem' }}
      >
        <SectionLabel>BB84 Protocol · Precision Quantum Optics Bench</SectionLabel>

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(2.6rem, 5.8vw, 4.4rem)',
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            marginBottom: '1.25rem',
          }}
        >
          Interactive Quantum Key{' '}
          <span style={{ fontFamily: 'var(--font-calligraphy)', fontStyle: 'italic', fontWeight: 600, color: 'var(--q-accent, #f59e0b)' }}>
            Distribution
          </span>
          <br />
          <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--q-text-2, #d1d1d8)' }}>
            Laboratory Bench
          </span>
        </h1>

        <p style={{ ...bodyText, fontSize: '1.05rem', maxWidth: '44rem', marginBottom: '2rem' }}>
          An interactive, physics-grounded simulation bench for the BB84 quantum cryptography protocol.
          Directly manipulate photon polarization vectors, observe fiber attenuation, trigger beam-splitter
          eavesdropping disturbance, and inspect modeled post-sampling keys.
        </p>

        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '2.5rem' }}>
          <button
            onClick={launch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: '0.35rem',
              fontSize: '0.875rem',
              fontFamily: "var(--font-body), sans-serif",
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: 'var(--q-accent, #f59e0b)',
              color: '#0e0e12',
              transition: 'transform 0.15s, opacity 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Play size={15} fill="currentColor" /> Open Simulator Bench
          </button>
          <button
            onClick={() => setActiveView('guide')}
            style={{
              padding: '0.75rem 1.4rem',
              borderRadius: '0.35rem',
              fontSize: '0.875rem',
              fontFamily: "var(--font-body), sans-serif",
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: 'var(--q-surface-2, #1c1c23)',
              color: 'var(--q-text-2, #d1d1d8)',
              border: '1px solid var(--q-border, #2e2e38)',
              transition: 'color 0.15s, background-color 0.15s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.color = '#ffffff'
              e.currentTarget.style.backgroundColor = '#25252e'
            }}
            onMouseOut={e => {
              e.currentTarget.style.color = 'var(--q-text-2, #d1d1d8)'
              e.currentTarget.style.backgroundColor = 'var(--q-surface-2, #1c1c23)'
            }}
          >
            Interactive Protocol Guide
          </button>
        </div>

        <LandingStoryRail />
        <div style={{ marginBottom: '0.55rem', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.13em', color: 'var(--q-text-4)', textTransform: 'uppercase' }}>
          Illustrative optical sequence · interaction model below
        </div>
        {/* ── EXPERIENTIAL OPTICAL BENCH SANDBOX ── */}
        <HeroOpticalSandbox />
        <SimulatorPreview />
      </motion.section>

      <StoryTransition label="State transformation" />

      {/* ── QUANTUM GATES (INTERACTIVE 3D BLOCH SPHERE) ────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6 }}
        style={{ ...sectionAlt }}
      >
        <div style={{ ...section, ...localSurface, padding: '3rem 2rem' }}>
          <SectionLabel>Interactive Quantum Hardware</SectionLabel>
          <h2 style={{ ...h2, marginBottom: '0.75rem' }}>
            3D Bloch Sphere &amp; <span style={{ fontFamily: 'var(--font-calligraphy)', fontStyle: 'italic', fontWeight: 600, color: 'var(--q-accent, #f59e0b)' }}>Gate Unitary Inspector</span>
          </h2>
          <p style={{ ...bodyText, fontSize: '0.9rem', maxWidth: '44rem', marginBottom: '2rem' }}>
            Click any gate to inspect its transformation. <b>Click and drag with your mouse</b> directly on the sphere to inspect state vectors from any vantage point.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '2rem', alignItems: 'center' }}>
            {/* Gate Buttons Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {GATES.map(gate => {
                const isSel = selectedGate.symbol === gate.symbol
                return (
                  <button
                    key={gate.symbol}
                    onClick={() => setSelectedGate(gate)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '1rem 0.6rem',
                      borderRadius: '0.35rem',
                      border: isSel ? '1px solid var(--q-accent, #f59e0b)' : '1px solid var(--q-border, #2e2e38)',
                      backgroundColor: isSel ? 'rgba(245, 158, 11, 0.1)' : 'var(--q-surface-1, #17171d)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: '2.25rem',
                        height: '2.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '0.25rem',
                        fontSize: '1rem',
                        fontFamily: "var(--font-mono), monospace",
                        fontWeight: 700,
                        backgroundColor: 'var(--q-surface-0, #0e0e12)',
                        color: isSel ? 'var(--q-accent, #f59e0b)' : '#ffffff',
                        border: '1px solid var(--q-border, #2e2e38)',
                      }}
                    >
                      {gate.symbol}
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--q-text-1, #f1f1f4)' }}>{gate.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--q-text-3, #9e9ea8)' }}>Axis: {gate.axis}</div>
                  </button>
                )
              })}
            </div>

            {/* Interactive 3D Bloch Sphere Canvas (Rotatable with mouse) */}
            <div
              className="flex flex-col items-center justify-center p-5 rounded-lg border relative font-body"
              style={{
                backgroundColor: 'var(--q-surface-1, #17171d)',
                borderColor: 'var(--q-border, #2e2e38)'
              }}
            >
              <div className="flex items-center justify-between w-full border-b pb-2 mb-3" style={{ borderColor: 'var(--q-border, #2e2e38)' }}>
                <span className="font-body text-xs uppercase tracking-wider text-[#f59e0b] font-semibold">
                  GATE // <span className="font-mono font-bold">{selectedGate.symbol}</span> ({selectedGate.name})
                </span>
                <span className="text-[11px] text-[var(--q-text-dim,#64748b)] font-body font-medium flex items-center gap-1">
                  <Orbit size={13} /> Click &amp; drag to rotate
                </span>
              </div>

              <Suspense fallback={<div className="w-[280px] h-[280px] flex items-center justify-center text-xs font-body text-gray-500">Loading Bloch Sphere...</div>}>
                <BlochSphere gateType={selectedGate.symbol} animate={false} size={280} />
              </Suspense>

              <div className="w-full mt-4 grid grid-cols-2 gap-2 text-xs font-body">
                <div className="p-2.5 rounded bg-black/40 border border-[#2e2e38] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#f59e0b] font-body uppercase font-bold">Input State <span className="font-mono">|ψ_in⟩</span></span>
                  <span className="text-white font-mono font-semibold">|0⟩ (Z = +1)</span>
                </div>
                <div className="p-2.5 rounded bg-black/40 border border-[#2e2e38] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#10b981] font-body uppercase font-bold">Transformed <span className="font-mono">|ψ_out⟩</span></span>
                  <span className="text-white font-mono font-semibold truncate">{selectedGate.effect}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>



      <StoryTransition label="From state to evidence" />

      {/* ── SIMULATOR CAPABILITIES & SCIENTIFIC INSTRUMENTATION ─────────── */}
      <motion.section
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6 }}
        style={section}
      >
        <SectionLabel>Laboratory Instrumentation</SectionLabel>
        <h2 style={{ ...h2, marginBottom: '0.75rem' }}>
          Engineered for <span style={{ fontFamily: 'var(--font-calligraphy)', fontStyle: 'italic', fontWeight: 600, color: 'var(--q-accent, #f59e0b)' }}>Precision Physics &amp; Discovery</span>
        </h2>
        <p style={{ ...bodyText, fontSize: '0.95rem', maxWidth: '46rem', marginBottom: '2.5rem' }}>
          Explore the modeled toolchain—from quantum state preparation and unitary transforms to QBER analysis, decoy-state checks, and post-sampling key inspection.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(20rem, 1fr))',
            gap: '1.25rem',
          }}
        >
          {SIMULATOR_FEATURES.map((feat) => {
            const Icon = feat.icon
            return (
              <div
                key={feat.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.4rem',
                  borderRadius: '0.45rem',
                  border: '1px solid var(--q-border, #2e2e38)',
                  backgroundColor: 'var(--q-surface-1, #17171d)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  transition: 'border-color 0.2s, transform 0.2s, background-color 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--q-accent, #f59e0b)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--q-border, #2e2e38)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: '2.4rem',
                        height: '2.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '0.35rem',
                        backgroundColor: 'var(--q-surface-2, #1c1c23)',
                        border: '1px solid var(--q-border, #2e2e38)',
                        color: feat.badgeColor,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontFamily: "var(--font-mono), monospace",
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '0.25rem',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        border: '1px solid var(--q-border, #2e2e38)',
                        color: feat.badgeColor,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {feat.badge}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontFamily: "var(--font-serif), serif",
                      fontWeight: 600,
                      color: 'var(--q-text-1, #f1f1f4)',
                      marginBottom: '0.5rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {feat.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.85rem',
                      fontFamily: "var(--font-body), sans-serif",
                      color: 'var(--q-text-3, #9e9ea8)',
                      lineHeight: 1.6,
                      marginBottom: '1rem',
                    }}
                  >
                    {feat.desc}
                  </p>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: "var(--font-mono), monospace",
                      color: 'var(--q-text-2, #d1d1d8)',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '0.3rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--q-border, #2e2e38)',
                      marginBottom: '1rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {feat.telemetry}
                  </div>

                  <button
                    onClick={() => launchExperiment({ params: feat.actionParams })}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 0.9rem',
                      borderRadius: '0.3rem',
                      fontSize: '0.8rem',
                      fontFamily: "var(--font-body), sans-serif",
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--q-border, #2e2e38)',
                      backgroundColor: 'var(--q-surface-2, #1c1c23)',
                      color: 'var(--q-text-2, #d1d1d8)',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = '#ffffff'
                      e.currentTarget.style.borderColor = 'var(--q-accent, #f59e0b)'
                      e.currentTarget.style.backgroundColor = '#25252e'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = 'var(--q-text-2, #d1d1d8)'
                      e.currentTarget.style.borderColor = 'var(--q-border, #2e2e38)'
                      e.currentTarget.style.backgroundColor = 'var(--q-surface-2, #1c1c23)'
                    }}
                  >
                    <span>{feat.actionText}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </motion.section>

      <StoryTransition label="Choose a protocol path" />

      {/* ── GUIDED EXPERIMENTS ───────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6 }}
        style={{ ...sectionAlt }}
      >
        <div style={{ ...section, ...localSurface, padding: '3rem 2rem' }}>
          <SectionLabel>Guided Protocols</SectionLabel>
          <h2 style={{ ...h2, marginBottom: '0.75rem' }}>
            8 Guided <span style={{ fontFamily: 'var(--font-calligraphy)', fontStyle: 'italic', fontWeight: 600, color: 'var(--q-accent, #f59e0b)' }}>Experiment Scenarios</span>
          </h2>
          <p style={{ ...bodyText, fontSize: '0.9rem', maxWidth: '44rem', marginBottom: '2rem' }}>
            Preconfigured quantum optics scenarios—from basic clean fiber operation to active beam-splitter interception, unitary gate transformations, and decoy-state PNS defense.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(19rem, 1fr))',
              gap: '1.25rem',
            }}
          >
            {EXPERIMENTS.map(exp => (
              <div
                key={exp.n}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderRadius: '0.35rem',
                  border: '1px solid var(--q-border, #2e2e38)',
                  backgroundColor: 'var(--q-surface-1, #17171d)',
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <AccentBadge>{exp.n}</AccentBadge>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
                      {exp.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontFamily: "var(--font-mono), monospace", color: 'var(--q-text-3, #9e9ea8)' }}>
                      N={exp.params.n_bits} · {exp.params.distance_km}km · Eve={exp.params.attack_prob ? `${exp.params.attack_prob * 100}%` : '0%'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openGuidedExperiment(exp)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontFamily: "var(--font-body), sans-serif",
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid var(--q-border, #2e2e38)',
                    backgroundColor: 'var(--q-surface-2, #1c1c23)',
                    color: 'var(--q-text-2, #d1d1d8)',
                    marginTop: '0.5rem',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.color = '#f59e0b'
                    e.currentTarget.style.borderColor = '#f59e0b'
                    e.currentTarget.style.backgroundColor = '#25252e'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.color = 'var(--q-text-2, #d1d1d8)'
                    e.currentTarget.style.borderColor = 'var(--q-border, #2e2e38)'
                    e.currentTarget.style.backgroundColor = 'var(--q-surface-2, #1c1c23)'
                  }}
                >
                  <FlaskConical size={13} /> Load Scenario in Bench
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <StoryTransition label="Enter the laboratory" />

      {/* ── FINAL LAUNCH CONSOLE ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 35 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6 }}
        style={section}
      >
        <h2 style={{ ...h2, marginBottom: '1rem' }}>Ready to launch your quantum experiment?</h2>
        <p style={{ ...bodyText, fontSize: '0.95rem', maxWidth: '36rem', marginBottom: '2rem' }}>
          Open the quantum optics console. Place gates, tune fiber distance, simulate eavesdropping attacks, and inspect backend-computed key material through deterministic playback.
        </p>
        <button
          onClick={launch}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.35rem',
            fontSize: '0.875rem',
            fontFamily: "var(--font-body), sans-serif",
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: 'var(--q-accent, #f59e0b)',
            color: '#0e0e12',
            transition: 'transform 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Play size={15} fill="currentColor" /> Open Simulator Console
        </button>
      </motion.section>
    </div>
  )
}
