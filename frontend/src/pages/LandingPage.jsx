/**
 * src/pages/LandingPage.jsx
 *
 * Professional landing page for BB84 QKD Simulator.
 * Shows when app first opens. Describes the simulator
 * with animations. Has prominent Launch Simulator button.
 * Scrollable with 4 sections:
 *   1. Hero — title, tagline, launch button
 *   2. Features — 3 animated cards
 *   3. Experiments — 8 experiment overview
 *   4. Enter — final call to action
 */

import { useEffect, useRef } from 'react'
import { motion, useInView, useScroll, 
         useTransform } from 'framer-motion'
import useSimulationStore from '../store/simulationStore'

// ─── ANIMATION VARIANTS ──────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, 
             transition: { duration: 0.6, ease: 'easeOut' } }
}

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } }
}

const cardVariant = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0,
             transition: { duration: 0.5, ease: 'easeOut' } }
}

// ─── ANIMATED SECTION WRAPPER ────────────────────────────
function AnimatedSection({ children, className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── FEATURE CARD ────────────────────────────────────────
function FeatureCard({ icon, title, description, color }) {
  return (
    <motion.div
      variants={cardVariant}
      whileHover={{ scale: 1.03, y: -4 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 p-6 rounded-xl"
      style={{
        backgroundColor: 'var(--panel-bg)',
        border: `1px solid ${color}30`,
      }}
    >
      <div className="w-12 h-12 rounded-lg flex items-center 
                      justify-center text-2xl"
           style={{ backgroundColor: color + '20',
                    border: `1px solid ${color}40` }}>
        {icon}
      </div>
      <div className="text-base font-mono font-bold"
           style={{ color }}>
        {title}
      </div>
      <div className="text-sm leading-relaxed"
           style={{ color: 'var(--text-muted)' }}>
        {description}
      </div>
    </motion.div>
  )
}

// ─── EXPERIMENT PILL ─────────────────────────────────────
function ExpPill({ number, title, color }) {
  return (
    <motion.div
      variants={cardVariant}
      className="flex items-center gap-3 px-4 py-3 rounded-lg"
      style={{
        backgroundColor: color + '12',
        border: `1px solid ${color}30`
      }}
    >
      <div className="w-7 h-7 rounded-full flex items-center 
                      justify-center text-xs font-mono font-bold
                      flex-shrink-0"
           style={{ backgroundColor: color + '30', color }}>
        {number}
      </div>
      <span className="text-xs font-mono"
            style={{ color: 'var(--text-primary)' }}>
        {title}
      </span>
    </motion.div>
  )
}

// ─── ANIMATED PHOTON BACKGROUND ──────────────────────────
function PhotonBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden 
                    pointer-events-none">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 6 + 5,
            height: Math.random() * 6 + 5,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: i % 2 === 0 
              ? '#00aacc' : '#ccaa00',
            boxShadow: i % 2 === 0
              ? '0 0 12px #00aacc80'
              : '0 0 12px #ccaa0080',
          }}
          animate={{
            x: [0, Math.random() * 200 - 100],
            y: [0, Math.random() * 200 - 100],
            opacity: [0.5, 0.8, 0.5],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: Math.random() * 6 + 4,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: Math.random() * 3,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────
export default function LandingPage() {
  const { setActiveView } = useSimulationStore()
  const { scrollY } = useScroll()
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])
  const heroY = useTransform(scrollY, [0, 400], [0, -60])

  const launch = () => setActiveView('simulator')

  return (
    <div className="min-h-screen overflow-y-auto"
         style={{ backgroundColor: 'var(--canvas-bg)',
                  color: 'var(--text-primary)' }}>

      {/* ── HERO SECTION ── */}
      <section className="relative min-h-screen flex flex-col 
                           items-center justify-center px-6 
                           overflow-hidden">
        <PhotonBackground />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 flex flex-col items-center 
                     gap-8 text-center max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-2 px-4 py-2 
                       rounded-full text-xs font-mono"
            style={{
              backgroundColor: 'rgba(0, 204, 255, 0.15)',
              border: '1px solid rgba(0, 204, 255, 0.5)',
              color: '#00c8ff'
            }}
          >
            <span className="w-2 h-2 rounded-full 
                             bg-current animate-pulse" />
            QtHack04 · BB84 Protocol · Research Tool
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-5xl md:text-6xl font-bold 
                       font-mono leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Quantum Key
            <span style={{ color: '#00aacc' }}> Distribution</span>
            <br />
            Simulator
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-lg max-w-2xl leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            A physics-accurate, interactive simulation of the BB84 
            quantum cryptography protocol. Visualize photon 
            transmission, eavesdropping attacks, and quantum 
            security — in real time.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex items-center gap-4"
          >
            <motion.button
              onClick={launch}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-8 py-4 
                         rounded-xl font-mono font-bold text-base
                         text-white transition-all"
              style={{
                backgroundColor: '#00aacc',
                boxShadow: '0 0 30px #00aacc50'
              }}
            >
              ▶ Launch Simulator
            </motion.button>
            <motion.button
              onClick={() => setActiveView('guide')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-xl font-mono 
                         text-base transition-all"
              style={{
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                backgroundColor: 'transparent'
              }}
            >
              Read Guide
            </motion.button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="flex items-center gap-8 pt-4"
          >
            {[
              { value: '25%', label: 'QBER at full Eve', 
                color: '#ccaa00' },
              { value: '11%', label: 'Security threshold', 
                color: '#ff4444' },
              { value: '60fps', label: 'Photon animation', 
                color: '#00cc88' },
              { value: '8', label: 'Experiment modes', 
                color: '#00aacc' },
            ].map(stat => (
              <div key={stat.label} 
                   className="flex flex-col items-center gap-1">
                <div className="text-2xl font-mono font-bold"
                     style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-xs font-mono"
                     style={{ color: 'var(--text-muted)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2
                     flex flex-col items-center gap-2"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="text-xs font-mono">scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-lg"
          >
            ↓
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <AnimatedSection>
          <motion.div variants={fadeUp} 
                      className="text-center mb-12">
            <div className="text-xs font-mono uppercase 
                            tracking-widest mb-3"
                 style={{ color: '#00aacc' }}>
              Capabilities
            </div>
            <h2 className="text-3xl font-bold font-mono"
                style={{ color: 'var(--text-primary)' }}>
              What This Simulator Does
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon="⚛"
              title="Physics-Accurate BB84"
              color="#00aacc"
              description="Every formula verified against the BB84 
                physics contract. QBER exactly 25% at full Eve 
                interception. SKR computed via binary entropy. 
                Beer-Lambert fiber attenuation modeled precisely."
            />
            <FeatureCard
              icon="🔬"
              title="Real-World Impairments"
              color="#ccaa00"
              description="Weak Coherent Pulse model with Poisson 
                photon distribution. PNS attack simulation with 
                zero detectable QBER. Decoy state protocol detects 
                PNS via gain statistics comparison."
            />
            <FeatureCard
              icon="🎓"
              title="Teaching Tool"
              color="#00cc88"
              description="8 guided experiment modes from basic BB84 
                to no-cloning theorem. Step-by-step photon inspector. 
                One-time pad encryption demo. Complete mathematical 
                derivations in the Guide."
            />
          </div>
        </AnimatedSection>
      </section>

      {/* ── EXPERIMENTS SECTION ── */}
      <section className="px-6 py-20"
               style={{ backgroundColor: 'var(--panel-bg)' }}>
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <motion.div variants={fadeUp} 
                        className="text-center mb-12">
              <div className="text-xs font-mono uppercase 
                              tracking-widest mb-3"
                   style={{ color: '#a855f7' }}>
                Experiments
              </div>
              <h2 className="text-3xl font-bold font-mono"
                  style={{ color: 'var(--text-primary)' }}>
                8 Guided Experiment Modes
              </h2>
              <p className="mt-3 text-sm max-w-xl mx-auto"
                 style={{ color: 'var(--text-muted)' }}>
                From basic key generation to advanced quantum attacks.
                Each experiment has a guided modal explaining the 
                physics and what to expect.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { n:1, title:'Random bits, clean channel', 
                  color:'#00cc88' },
                { n:2, title:'Manual photon encoding', 
                  color:'#00aacc' },
                { n:3, title:'Random bits + Eve attack', 
                  color:'#ccaa00' },
                { n:4, title:'Manual encoding + Eve', 
                  color:'#ccaa00' },
                { n:5, title:'Quantum gate transmission', 
                  color:'#a855f7' },
                { n:6, title:'No-cloning theorem', 
                  color:'#ff4444' },
                { n:7, title:'PNS attack (WCP source)', 
                  color:'#ff8800' },
                { n:8, title:'Decoy state protocol', 
                  color:'#00aacc' },
              ].map(exp => (
                <ExpPill key={exp.n} number={exp.n}
                         title={exp.title} color={exp.color} />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── QUANTUM GATES SECTION ── */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <AnimatedSection>
          <motion.div variants={fadeUp} 
                      className="text-center mb-12">
            <div className="text-xs font-mono uppercase 
                            tracking-widest mb-3"
                 style={{ color: '#ccaa00' }}>
              Interactive
            </div>
            <h2 className="text-3xl font-bold font-mono"
                style={{ color: 'var(--text-primary)' }}>
              Drag-and-Drop Quantum Gates
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              { symbol:'H', name:'Hadamard', color:'#6366f1',
                desc:'Switches basis' },
              { symbol:'X', name:'Pauli-X', color:'#f59e0b',
                desc:'Bit flip' },
              { symbol:'Y', name:'Pauli-Y', color:'#ec4899',
                desc:'Bit+Phase flip' },
              { symbol:'Z', name:'Pauli-Z', color:'#14b8a6',
                desc:'Phase flip' },
              { symbol:'S', name:'S Gate', color:'#8b5cf6',
                desc:'π/2 rotation' },
              { symbol:'T', name:'T Gate', color:'#06b6d4',
                desc:'π/4 rotation' },
            ].map(gate => (
              <motion.div
                key={gate.symbol}
                variants={cardVariant}
                whileHover={{ scale: 1.08, y: -4 }}
                className="flex flex-col items-center gap-2 
                           p-4 rounded-xl w-28"
                style={{
                  backgroundColor: gate.color + '15',
                  border: `1px solid ${gate.color}40`
                }}
              >
                <div className="w-12 h-12 rounded-lg flex items-center 
                               justify-center text-xl font-mono 
                               font-bold"
                     style={{ backgroundColor: gate.color + '30',
                              color: gate.color }}>
                  {gate.symbol}
                </div>
                <div className="text-xs font-mono font-bold text-center"
                     style={{ color: gate.color }}>
                  {gate.name}
                </div>
                <div className="text-xs text-center"
                     style={{ color: 'var(--text-muted)' }}>
                  {gate.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-6 py-24 text-center"
               style={{ backgroundColor: 'var(--panel-bg)' }}>
        <AnimatedSection className="max-w-2xl mx-auto">
          <motion.div variants={fadeUp} 
                      className="flex flex-col items-center gap-6">
            <div className="text-xs font-mono uppercase 
                            tracking-widest"
                 style={{ color: '#00aacc' }}>
              Ready to explore quantum cryptography?
            </div>
            <h2 className="text-4xl font-bold font-mono"
                style={{ color: 'var(--text-primary)' }}>
              Enter the Simulator
            </h2>
            <p className="text-sm leading-relaxed"
               style={{ color: 'var(--text-muted)' }}>
              Run experiments, visualize photon transmission, 
              test quantum attacks, and learn BB84 from the 
              ground up — no quantum hardware required.
            </p>
            <motion.button
              onClick={launch}
              whileHover={{ scale: 1.05,
                boxShadow: '0 0 40px #00aacc60' }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-3 px-10 py-4 
                         rounded-xl font-mono font-bold text-lg
                         text-white"
              style={{ backgroundColor: '#00aacc' }}
            >
              ▶ Launch Simulator
            </motion.button>
          </motion.div>
        </AnimatedSection>
      </section>

    </div>
  )
}
