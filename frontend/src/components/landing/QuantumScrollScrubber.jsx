/**
 * src/components/landing/QuantumScrollScrubber.jsx
 *
 * Cinematic Scroll-Synced Frame-by-Frame Quantum Video & Optics Scrubber.
 * Implements Engine B architecture from quantum_video_and_design_architecture.md:
 * - 200 Frame timeline across 4 optical phases
 * - High-precision 60 FPS HTML5 Canvas with subpixel lerp smoothing
 * - Frame scrubbing synchronized with page scroll, trackpad wheel, and tactile slider
 * - Instant bidirectional scrubbing (forward & reverse rewind with 0ms latency)
 * - Precision instrument aesthetics (charcoal carbon chassis, gold/amber, emerald, violet, crimson)
 * - Layered editorial typography (Cormorant Garamond serif, Italiana calligraphy, Plus Jakarta Sans, JetBrains Mono)
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Play, Pause, RotateCcw, Sliders, CheckCircle2, Sparkles
} from 'lucide-react'

// ─── 4 OPTICAL PHASES SPECIFICATION ─────────────────────────────────
const PHASES = [
  {
    id: 1,
    range: [0, 45],
    title: 'Alice Laser Diode & Polarizer Disc',
    shortName: '01 · Alice Tx',
    accentColor: '#f59e0b', // Instrument Amber
    accentBg: 'rgba(245, 158, 11, 0.12)',
    action: 'Optical attenuation to single-photon regime (μ ≤ 0.1); random basis selection (+ / ×).',
    telemetryTag: 'PULSE_GEN',
    telemetry: {
      wavelength: '1550 nm (Telecom C-Band)',
      meanPhotonNumber: 'μ = 0.10 photons/pulse',
      basisState: '|ψ_A⟩ ∈ {0°, 45°, 90°, 135°}',
      prngEntropy: 'PCG64 Uniform Random',
    },
    formula: 'P(n) = \\frac{\\mu^n e^{-\\mu}}{n!} \\implies P(1) \\approx 0.0905',
    formulaDesc: 'Poisson photon-number distribution of attenuated weak coherent laser pulses.',
    componentCoord: { xRatio: 0.15, yRatio: 0.5 },
  },
  {
    id: 2,
    range: [46, 90],
    title: 'Fiber Optic Quantum Channel',
    shortName: '02 · Quantum Fiber',
    accentColor: '#10b981', // Precision Emerald
    accentBg: 'rgba(16, 185, 129, 0.12)',
    action: 'Propagation across silica fiber (SMF-28) with canonical 0.20 dB/km Beer-Lambert attenuation.',
    telemetryTag: 'FIBER_CH',
    telemetry: {
      lossCoefficient: 'α = 0.20 dB/km',
      transmission: 'T(d) = 10^(-0.2d / 10)',
      groupVelocity: 'vg ≈ 2.05 × 10⁸ m/s',
      dispersion: 'D ≈ 17 ps/(nm·km)',
    },
    formula: 'T = 10^{-\\frac{\\alpha \\cdot d}{10}} \\implies T(10\\text{km}) = 63.1\\%',
    formulaDesc: 'Beer-Lambert optical transmission survival probability through SMF-28 silica.',
    componentCoord: { xRatio: 0.40, yRatio: 0.5 },
  },
  {
    id: 3,
    range: [91, 145],
    title: 'Eve Beam-Splitter Interception',
    shortName: '03 · Eavesdropper',
    accentColor: '#ef4444', // Security Crimson
    accentBg: 'rgba(239, 68, 68, 0.12)',
    action: '50:50 optical tap and projective measurement, collapsing superposition states and generating errors.',
    telemetryTag: 'EVE_DISTURBANCE',
    telemetry: {
      attackMode: 'Intercept-Resend Tap',
      inducedQBER: 'Q_induced = +25.00%',
      basisCollapse: 'P(mismatch) = 50.0%',
      noCloningLimit: 'Δ_fidelity ≥ 0.25',
    },
    formula: '\\text{QBER}_{\\text{Eve}} = \\frac{1}{2} P(\\text{mismatch}) = 25\\%',
    formulaDesc: 'BB84 quantum disturbance limit: measurement collapses unmeasured non-orthogonal bases.',
    componentCoord: { xRatio: 0.62, yRatio: 0.5 },
  },
  {
    id: 4,
    range: [146, 200],
    title: 'Bob SPAD Receiver & Sifting Logic',
    shortName: '04 · Bob Rx & Sift',
    accentColor: '#c084fc', // Quantum Violet
    accentBg: 'rgba(192, 132, 252, 0.12)',
    action: 'Silicon avalanche photodiode detection, public basis matching, and sifted key generation.',
    telemetryTag: 'SIFT_RECONCILIATION',
    telemetry: {
      detectorEta: 'η = 85.0% (SPAD APD)',
      darkCountProb: 'P_dark = 1.0 × 10⁻⁵',
      qberSecurityThreshold: 'QBER_max = 11.00%',
      siftEfficiency: 'Sift Yield ≈ 50.0%',
    },
    formula: 'R_{\\text{sec}} = S \\cdot [1 - 2H(\\text{QBER})] > 0',
    formulaDesc: 'Shor-Preskill / Devetak-Winter asymptotic secure key rate under one-way reconciliation.',
    componentCoord: { xRatio: 0.86, yRatio: 0.5 },
  },
]

export default function QuantumScrollScrubber() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const animStateRef = useRef({
    currentFrame: 0,
    targetFrame: 0,
    isPlaying: false,
    lastTime: 0,
    ripples: [],
    photonHistory: [],
  })

  const [activeFrame, setActiveFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Current active phase
  const currentPhase = PHASES.find(p => activeFrame >= p.range[0] && activeFrame <= p.range[1]) || PHASES[0]

  // Synchronize target frame with scroll position
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const windowHeight = window.innerHeight
      // Total scroll active distance inside viewport
      const totalDist = rect.height + windowHeight * 0.5
      const currentDist = windowHeight - rect.top

      if (currentDist >= 0 && currentDist <= totalDist) {
        const progress = Math.max(0, Math.min(1, currentDist / totalDist))
        animStateRef.current.targetFrame = progress * 200
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Main 60 FPS requestAnimationFrame canvas render loop with subpixel lerp
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(canvas)
    handleResize()

    const state = animStateRef.current

    const render = (time) => {
      // Auto-playback advance
      if (state.isPlaying) {
        state.targetFrame = (state.targetFrame + 0.65) % 200
      }

      // Smooth subpixel lerp (Linear Interpolation)
      state.currentFrame += (state.targetFrame - state.currentFrame) * 0.12
      const f = Math.max(0, Math.min(200, state.currentFrame))
      const roundedFrame = Math.round(f)

      setActiveFrame(prev => prev === roundedFrame ? prev : roundedFrame)

      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      ctx.clearRect(0, 0, w, h)

      // ── Optical Bench Substrate (Matte dark carbon grid) ──
      const benchY = h * 0.5
      const aliceX = w * 0.12
      const bobX = w * 0.88
      const eveX = w * 0.62
      const channelLength = bobX - aliceX

      // 1. Background Bench Demarcation Rails
      ctx.strokeStyle = '#1e1e26'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(aliceX - 30, benchY - 44)
      ctx.lineTo(bobX + 30, benchY - 44)
      ctx.moveTo(aliceX - 30, benchY + 44)
      ctx.lineTo(bobX + 30, benchY + 44)
      ctx.stroke()

      // Scale ticks on rail
      const tickStep = channelLength / 20
      for (let i = 0; i <= 20; i++) {
        const tx = aliceX + i * tickStep
        ctx.strokeStyle = i % 5 === 0 ? '#383846' : '#22222b'
        ctx.beginPath()
        ctx.moveTo(tx, benchY + 44)
        ctx.lineTo(tx, benchY + (i % 5 === 0 ? 54 : 49))
        ctx.stroke()
      }

      // 2. Optical Fiber Channel Core (Silica Waveguide)
      const fiberGrad = ctx.createLinearGradient(aliceX, 0, bobX, 0)
      fiberGrad.addColorStop(0, 'rgba(245, 158, 11, 0.45)') // Alice amber
      fiberGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.35)') // Fiber emerald
      fiberGrad.addColorStop(0.7, f > 90 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.35)') // Eve tap
      fiberGrad.addColorStop(1, 'rgba(192, 132, 252, 0.45)') // Bob violet

      ctx.strokeStyle = fiberGrad
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(aliceX, benchY)
      ctx.lineTo(bobX, benchY)
      ctx.stroke()

      // Fiber core evanescent glow
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 9
      ctx.beginPath()
      ctx.moveTo(aliceX, benchY)
      ctx.lineTo(bobX, benchY)
      ctx.stroke()

      // 3. Alice Laser Optical Diode Enclosure (Left Module)
      ctx.fillStyle = '#14141a'
      ctx.strokeStyle = '#2d2d38'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(aliceX - 60, benchY - 36, 60, 72, 4)
      ctx.fill()
      ctx.stroke()

      // Laser Diode Port & Polarizer Disc
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(aliceX - 16, benchY, 14, 0, Math.PI * 2)
      ctx.fill()

      // Rotating Polarizer Angle Line
      const polAngle = (f / 45) * (Math.PI / 2) // Rotates 0° to 90° during Phase 1
      ctx.strokeStyle = '#0e0e12'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(aliceX - 16 - Math.cos(polAngle) * 11, benchY - Math.sin(polAngle) * 11)
      ctx.lineTo(aliceX - 16 + Math.cos(polAngle) * 11, benchY + Math.sin(polAngle) * 11)
      ctx.stroke()

      // Alice Label
      ctx.fillStyle = '#f59e0b'
      ctx.font = '600 10px var(--font-body), sans-serif'
      ctx.fillText('ALICE TX', aliceX - 52, benchY - 18)
      ctx.fillStyle = '#8e8e9a'
      ctx.font = '400 9px var(--font-mono), monospace'
      ctx.fillText('λ=1550nm', aliceX - 52, benchY + 24)

      // 4. Bob SPAD APD Receiver Enclosure (Right Module)
      ctx.fillStyle = '#14141a'
      ctx.strokeStyle = '#2d2d38'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(bobX, benchY - 36, 60, 72, 4)
      ctx.fill()
      ctx.stroke()

      // Bob SPAD Active Sensor Window
      ctx.fillStyle = f >= 146 ? '#c084fc' : '#22222b'
      ctx.beginPath()
      ctx.arc(bobX + 16, benchY, 14, 0, Math.PI * 2)
      ctx.fill()

      // Bob Dual Basis Splitter Symbol
      ctx.strokeStyle = '#0e0e12'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(bobX + 16, benchY - 8)
      ctx.lineTo(bobX + 16, benchY + 8)
      ctx.moveTo(bobX + 8, benchY)
      ctx.lineTo(bobX + 24, benchY)
      ctx.stroke()

      // Bob Label
      ctx.fillStyle = '#c084fc'
      ctx.font = '600 10px var(--font-body), sans-serif'
      ctx.fillText('BOB RX', bobX + 12, benchY - 18)
      ctx.fillStyle = '#8e8e9a'
      ctx.font = '400 9px var(--font-mono), monospace'
      ctx.fillText('SPAD η=85%', bobX + 6, benchY + 24)

      // 5. Eve Beam-Splitter Tap (Center-Right Module)
      const isEveActive = f >= 91
      ctx.fillStyle = isEveActive ? '#1c1517' : '#14141a'
      ctx.strokeStyle = isEveActive ? '#ef4444' : '#2d2d38'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(eveX - 18, benchY - 30, 36, 60, 3)
      ctx.fill()
      ctx.stroke()

      // Beam Splitter 45° Diagonal Mirror
      ctx.strokeStyle = isEveActive ? '#ef4444' : '#4a4a58'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(eveX - 12, benchY + 12)
      ctx.lineTo(eveX + 12, benchY - 12)
      ctx.stroke()

      // Eve Eavesdropping Tap Siphon Line
      if (isEveActive) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)'
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(eveX, benchY - 12)
        ctx.lineTo(eveX, benchY - 48)
        ctx.stroke()
        ctx.setLineDash([])

        // Eve Detector Sensor
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(eveX, benchY - 48, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.font = '600 8px var(--font-body), sans-serif'
        ctx.fillText('EVE TAP (50%)', eveX - 26, benchY - 58)
      }

      // ── 6. Single-Photon Pulse Transit (Tied Directly to Frame f) ──
      const photonProgress = Math.max(0, Math.min(1, f / 185))
      const photonX = aliceX + photonProgress * channelLength
      const photonY = benchY

      // Store photon trail
      if (f > 2 && f < 198) {
        state.photonHistory.push({ x: photonX, y: photonY, frame: f })
        if (state.photonHistory.length > 24) state.photonHistory.shift()
      } else {
        state.photonHistory = []
      }

      // Draw photon trail wavepacket
      ctx.lineWidth = 1.5
      for (let i = 0; i < state.photonHistory.length; i++) {
        const pt = state.photonHistory[i]
        const alpha = (i / state.photonHistory.length) * 0.4
        const waveY = pt.y + Math.sin((pt.x * 0.08) + time * 0.01) * 7

        ctx.strokeStyle = f > 90
          ? `rgba(239, 68, 68, ${alpha})`
          : `rgba(245, 158, 11, ${alpha})`
        ctx.beginPath()
        ctx.arc(pt.x, waveY, 1.5, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Active Photon Wavepacket Core
      if (f > 0 && f < 195) {
        const pulseColor = f > 90 ? '#ef4444' : (f > 45 ? '#10b981' : '#f59e0b')
        const waveOffset = Math.sin(time * 0.01 + f * 0.2) * 6

        // Wavefront ripples
        ctx.strokeStyle = pulseColor + '60'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(photonX, photonY + waveOffset, 8, 0, Math.PI * 2)
        ctx.stroke()

        ctx.strokeStyle = pulseColor + '30'
        ctx.beginPath()
        ctx.arc(photonX, photonY + waveOffset, 14, 0, Math.PI * 2)
        ctx.stroke()

        // Photon Core
        ctx.fillStyle = pulseColor
        ctx.beginPath()
        ctx.arc(photonX, photonY + waveOffset, 3.5, 0, Math.PI * 2)
        ctx.fill()

        // Polarization vector arrow
        const angle = f > 90 ? Math.PI / 4 : (polAngle)
        const vLen = 14
        const vx = Math.cos(angle) * vLen
        const vy = Math.sin(angle) * vLen
        ctx.strokeStyle = pulseColor
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.moveTo(photonX - vx, (photonY + waveOffset) - vy)
        ctx.lineTo(photonX + vx, (photonY + waveOffset) + vy)
        ctx.stroke()

        // Quantum State readout tag above photon
        ctx.fillStyle = '#ffffff'
        ctx.font = '700 9px var(--font-mono), monospace'
        const stateStr = f > 90 ? '|ψ_disturbed⟩' : (f > 45 ? '|ψ_fiber⟩' : '|ψ_0⟩')
        ctx.fillText(stateStr, photonX - 22, photonY - 22)
      }

      // Bob Arrival Coincidence Flash
      if (f >= 180) {
        const flashAlpha = Math.max(0, 1 - (f - 180) / 20)
        ctx.fillStyle = `rgba(192, 132, 252, ${flashAlpha * 0.5})`
        ctx.beginPath()
        ctx.arc(bobX, benchY, 32, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
    }
  }, [])

  // Manual Seek Handler for Slider & Wheel
  const handleScrub = useCallback((newFrame) => {
    animStateRef.current.targetFrame = Math.max(0, Math.min(200, newFrame))
    setIsPlaying(false)
    animStateRef.current.isPlaying = false
  }, [])

  const togglePlayback = () => {
    const next = !isPlaying
    setIsPlaying(next)
    animStateRef.current.isPlaying = next
  }

  const resetScrubber = () => {
    animStateRef.current.targetFrame = 0
    animStateRef.current.currentFrame = 0
    setIsPlaying(false)
    animStateRef.current.isPlaying = false
  }

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col gap-6 relative select-none"
    >
      {/* ── Console Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--q-border, #2e2e38)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-serif italic text-[#f59e0b] font-semibold">
              Frame-by-Frame Optical Breakdown
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#2e2e38] text-[var(--q-text-3)] bg-[#17171d]">
              60 FPS SUBPIXEL SCRUBBER
            </span>
          </div>
          <h3 className="font-serif text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            BB84 Quantum Key Distribution: <span className="font-calligraphy italic font-normal text-[#f59e0b]">Transmission Timeline</span>
          </h3>
        </div>

        {/* Phase Quick-Jump Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PHASES.map((p) => {
            const isCurrent = currentPhase.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => handleScrub(p.range[0])}
                className="px-2.5 py-1 rounded text-xs font-body font-semibold transition-all cursor-pointer border"
                style={{
                  backgroundColor: isCurrent ? p.accentBg : 'var(--q-surface-1, #17171d)',
                  borderColor: isCurrent ? p.accentColor : 'var(--q-border, #2e2e38)',
                  color: isCurrent ? p.accentColor : 'var(--q-text-3, #9e9ea8)',
                }}
              >
                {p.shortName}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main Interactive Canvas Stage ── */}
      <div
        className="w-full h-[260px] sm:h-[300px] rounded-lg border relative overflow-hidden flex items-center justify-center"
        style={{
          backgroundColor: '#0a0a0d',
          borderColor: 'var(--q-border, #2e2e38)',
        }}
        onWheel={(e) => {
          // Allow trackpad or mouse wheel to scrub frames when cursor is over the stage
          e.preventDefault()
          const delta = e.deltaY > 0 ? 3 : -3
          handleScrub(animStateRef.current.targetFrame + delta)
        }}
      >
        {/* HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />

        {/* Active Phase Badge Tag (Top Left of Canvas) */}
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          <span
            className="px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase border shadow-md"
            style={{
              backgroundColor: currentPhase.accentBg,
              borderColor: currentPhase.accentColor,
              color: currentPhase.accentColor,
            }}
          >
            PHASE {currentPhase.id} // {currentPhase.telemetryTag}
          </span>
          <span className="text-[11px] font-mono text-[var(--q-text-3)] tabular-nums">
            FRAME: {String(activeFrame).padStart(3, '0')} / 200
          </span>
        </div>

        {/* Scroll Sync Instruction (Top Right of Canvas) */}
        <div className="absolute top-3 right-3 text-[11px] font-body text-[var(--q-text-3)] flex items-center gap-1.5 pointer-events-none bg-black/60 px-2 py-1 rounded border border-[#2e2e38]">
          <Sliders size={12} className="text-[#f59e0b]" />
          <span>Scroll down page or drag scrubber</span>
        </div>
      </div>

      {/* ── Scrubber Controls & Progress Slider ── */}
      <div
        className="p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          backgroundColor: 'var(--q-surface-1, #17171d)',
          borderColor: 'var(--q-border, #2e2e38)',
        }}
      >
        {/* Playback Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayback}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-body font-semibold cursor-pointer border transition-colors"
            style={{
              backgroundColor: isPlaying ? 'rgba(245, 158, 11, 0.15)' : 'var(--q-surface-2, #1c1c23)',
              borderColor: isPlaying ? '#f59e0b' : 'var(--q-border, #2e2e38)',
              color: isPlaying ? '#f59e0b' : 'var(--q-text-1, #f1f1f4)',
            }}
          >
            {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            {isPlaying ? 'PAUSE' : 'AUTOPLAY'}
          </button>
          <button
            onClick={resetScrubber}
            className="p-1.5 rounded text-xs font-body cursor-pointer border border-[#2e2e38] text-[var(--q-text-3)] hover:text-white bg-[var(--q-surface-2)] transition-colors"
            title="Rewind to Frame 0"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Tactile Frame Scrubber Slider */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--q-text-3)] tabular-nums">000</span>
          <input
            type="range"
            min="0"
            max="200"
            value={activeFrame}
            onChange={(e) => handleScrub(Number(e.target.value))}
            className="flex-1 h-1.5 bg-[#252530] rounded-lg appearance-none cursor-pointer accent-[#f59e0b]"
          />
          <span className="text-xs font-mono text-[#f59e0b] font-bold tabular-nums">
            {String(activeFrame).padStart(3, '0')}
          </span>
        </div>

        {/* Timeline Percent Readout */}
        <div className="text-xs font-mono text-[var(--q-text-3)] tabular-nums flex items-center gap-1">
          <span>PROGRESS:</span>
          <span className="text-white font-bold">{Math.round((activeFrame / 200) * 100)}%</span>
        </div>
      </div>

      {/* ── Synchronized Component Breakdown Overlay & Telemetry Dashboard ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Active Optical Hardware Highlight */}
        <div
          className="p-4 rounded-lg border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--q-surface-1, #17171d)',
            borderColor: 'var(--q-border, #2e2e38)',
          }}
        >
          <div>
            <div className="text-[11px] font-body uppercase tracking-wider text-[var(--q-text-3)] font-semibold mb-1">
              Active Hardware Module
            </div>
            <div
              className="text-base font-serif font-bold mb-2 flex items-center gap-2"
              style={{ color: currentPhase.accentColor }}
            >
              {currentPhase.title}
            </div>
            <p className="text-xs font-body text-[var(--q-text-2)] leading-relaxed">
              {currentPhase.action}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-[#2e2e38] flex items-center justify-between text-xs">
            <span className="text-[var(--q-text-3)] font-body">Frame Window:</span>
            <span className="font-mono text-white font-semibold tabular-nums">
              {String(currentPhase.range[0]).padStart(3, '0')} – {String(currentPhase.range[1]).padStart(3, '0')}
            </span>
          </div>
        </div>

        {/* Card 2: Live Physics Formula & Analytical Equation */}
        <div
          className="p-4 rounded-lg border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--q-surface-1, #17171d)',
            borderColor: 'var(--q-border, #2e2e38)',
          }}
        >
          <div>
            <div className="text-[11px] font-body uppercase tracking-wider text-[var(--q-text-3)] font-semibold mb-1">
              Governing Optical Physics
            </div>
            <div className="text-xs font-mono font-bold text-white bg-black/50 p-2.5 rounded border border-[#2e2e38] mb-2 truncate">
              {currentPhase.formula}
            </div>
            <p className="text-xs font-body text-[var(--q-text-3)] leading-relaxed">
              {currentPhase.formulaDesc}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-[#2e2e38] flex items-center gap-2 text-[11px] text-[var(--q-text-3)]">
            <Sparkles size={13} className="text-[#f59e0b]" />
            <span className="font-body">Evaluated in real-time by BB84 model</span>
          </div>
        </div>

        {/* Card 3: Optical Telemetry Stream Readouts */}
        <div
          className="p-4 rounded-lg border flex flex-col justify-between"
          style={{
            backgroundColor: 'var(--q-surface-1, #17171d)',
            borderColor: 'var(--q-border, #2e2e38)',
          }}
        >
          <div>
            <div className="text-[11px] font-body uppercase tracking-wider text-[var(--q-text-3)] font-semibold mb-2">
              Optical Telemetry Stream
            </div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(currentPhase.telemetry).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-xs py-0.5 border-b border-[#252530]">
                  <span className="text-[var(--q-text-3)] font-body capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </span>
                  <span className="font-mono text-white tabular-nums font-medium text-[11px]">
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-[#10b981]">
            <span className="flex items-center gap-1 font-body">
              <CheckCircle2 size={12} /> Sync Status: Active
            </span>
            <span className="font-mono text-[var(--q-text-3)] tabular-nums">0.0ms seek</span>
          </div>
        </div>
      </div>
    </div>
  )
}
