/**
 * src/components/landing/HeroOpticalSandbox.jsx
 *
 * Experiential, dynamic visual optical bench for the Landing Page.
 * Focuses on direct visual experience, geometric shapes, and continuous motion:
 * - Oscillating transverse electric-field wavepacket animation (vector rotation)
 * - Direct-manipulation rotatable optical polarizing crystals with physical grid slits
 * - Eve 45° dielectric beam splitter with dynamic beam reflection and state collapse flash
 * - Bob avalanche photodiode SPAD with radial detection ripple rings
 * - Pure laboratory instrument styling (charcoal/slate substrate, emerald/violet/gold encoding, NO cyan/blue majority)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, Zap, Eye, EyeOff, Sparkles } from 'lucide-react'
import useSimulationStore from '../../store/simulationStore'

export default function HeroOpticalSandbox() {
  const { setActiveView } = useSimulationStore()
  const canvasRef = useRef(null)

  // Direct tactile controls
  const [aliceAngle, setAliceAngle] = useState(0) // 0°, 45°, 90°, 135°
  const [bobAngle, setBobAngle] = useState(0)     // 0°, 45°, 90°, 135°
  const [eveEnabled, setEveEnabled] = useState(false)
  const [isContinuous, setIsContinuous] = useState(false) // Default paused per user request
  const [stats, setStats] = useState({ emitted: 0, matched: 0, siftedBits: [] })

  // Animation particles and optical state refs (to run at 60fps without React re-render lag)
  const animStateRef = useRef({
    time: 0,
    photons: [],
    ripples: [],
    lastSpawn: 0,
    eveAngle: 45
  })

  // Spawn a new photon packet
  const spawnPhoton = useCallback(() => {
    const angle = aliceAngle
    const basis = (angle === 0 || angle === 90) ? '+' : 'x'
    const bit = (angle === 0 || angle === 45) ? 0 : 1

    animStateRef.current.photons.push({
      id: Math.random(),
      x: 100,
      y: 150,
      speed: 3.5,
      angle: angle,
      basis: basis,
      bit: bit,
      eveHit: false,
      dead: false,
      color: basis === '+' ? '#10b981' : '#c084fc' // Emerald (+) or Violet (×)
    })

    setStats(s => ({ ...s, emitted: s.emitted + 1 }))
  }, [aliceAngle])

  // Canvas 60fps render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frameId

    const render = () => {
      const state = animStateRef.current
      state.time += 0.04

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
      }

      ctx.clearRect(0, 0, width, height)

      // Geometry references
      const startX = 80
      const endX = width - 80
      const channelY = height * 0.52
      const eveX = (startX + endX) * 0.5
      const bobX = endX

      // ── 1. Optical Bench Rail ──
      ctx.strokeStyle = '#282832'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(startX, channelY)
      ctx.lineTo(endX, channelY)
      ctx.stroke()
      ctx.setLineDash([])

      // ── 2. Alice Transmitter Housing ──
      ctx.save()
      ctx.fillStyle = '#18181f'
      ctx.strokeStyle = '#383844'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(startX - 50, channelY - 32, 50, 64, 4)
      ctx.fill()
      ctx.stroke()

      // Collimator Nozzle
      ctx.fillStyle = '#10b981'
      ctx.fillRect(startX, channelY - 4, 10, 8)

      // Laser diode pulse indicator (only blinks when actively transmitting pulses)
      const isTransmitting = isContinuous || (state.photons && state.photons.length > 0)
      if (isTransmitting) {
        const pulseBrightness = Math.sin(state.time * 8) * 0.5 + 0.5
        ctx.fillStyle = `rgba(16, 185, 129, ${0.35 + pulseBrightness * 0.65})`
      } else {
        // Calm steady standby state when simulation is stopped
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'
      }
      ctx.beginPath()
      ctx.arc(startX - 25, channelY, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // ── 3. Eve Beam Splitter Stage (if enabled) ──
      if (eveEnabled) {
        ctx.save()
        // Beam splitter mount
        ctx.fillStyle = '#1c1c24'
        ctx.strokeStyle = '#e05252'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(eveX - 22, channelY - 22, 44, 44, 3)
        ctx.fill()
        ctx.stroke()

        // 45° Dielectric interface line
        ctx.strokeStyle = 'rgba(224, 82, 82, 0.85)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(eveX - 18, channelY + 18)
        ctx.lineTo(eveX + 18, channelY - 18)
        ctx.stroke()

        // Upward reflection channel to Eve's tap detector
        ctx.strokeStyle = 'rgba(224, 82, 82, 0.3)'
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(eveX, channelY - 22)
        ctx.lineTo(eveX, channelY - 70)
        ctx.stroke()
        ctx.setLineDash([])

        // Eve detector aperture
        ctx.fillStyle = '#18181f'
        ctx.strokeStyle = '#e05252'
        ctx.beginPath()
        ctx.roundRect(eveX - 16, channelY - 86, 32, 16, 2)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#e05252'
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('EVE TAP', eveX, channelY - 75)
        ctx.restore()
      }

      // ── 4. Bob Analyzer & SPAD Funnel ──
      ctx.save()
      // SPAD collection funnel
      ctx.fillStyle = '#18181f'
      ctx.strokeStyle = '#383844'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(bobX, channelY - 28)
      ctx.lineTo(bobX + 45, channelY - 16)
      ctx.lineTo(bobX + 45, channelY + 16)
      ctx.lineTo(bobX, channelY + 28)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Sensor Active Window
      ctx.fillStyle = '#c084fc'
      ctx.fillRect(bobX - 6, channelY - 12, 6, 24)
      ctx.restore()

      // ── 5. Photons in Flight (Electromagnetic Wavepackets) ──
      for (let i = state.photons.length - 1; i >= 0; i--) {
        const p = state.photons[i]
        p.x += p.speed
        p.y = channelY

        // Eve Interaction point
        if (eveEnabled && p.x >= eveX && !p.eveHit) {
          p.eveHit = true
          // 50% state collapse / change if Eve measures in non-matching basis
          if (Math.random() < 0.5) {
            p.angle = Math.random() < 0.5 ? 45 : 135
            p.basis = 'x'
            p.color = '#e05252' // Disturbed by Eve
          }

          // Eve upward reflection particle ripple
          state.ripples.push({
            x: eveX,
            y: channelY - 75,
            radius: 4,
            maxRadius: 28,
            color: 'rgba(224, 82, 82, 0.8)'
          })
        }

        // Draw oscillating wavepacket (Transverse electric field sinusoidal trace)
        ctx.save()
        ctx.strokeStyle = p.color
        ctx.lineWidth = 2
        ctx.beginPath()

        const waveLen = 32
        const rad = (p.angle * Math.PI) / 180
        const sinRad = Math.sin(rad)
        const cosRad = Math.cos(rad)

        for (let dx = -waveLen; dx <= waveLen; dx += 2) {
          const envelope = Math.cos((dx / waveLen) * (Math.PI / 2)) // Gaussian-like bell envelope
          const oscillation = Math.sin(dx * 0.4 - state.time * 8) * 12 * envelope
          const wx = p.x + dx
          const wy = p.y + oscillation * (Math.abs(sinRad) > 0.1 ? sinRad : 0.2)

          if (dx === -waveLen) ctx.moveTo(wx, wy)
          else ctx.lineTo(wx, wy)
        }
        ctx.stroke()

        // Central photon particle core with polarization pointer
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()

        // Polarization vector needle
        const needleLen = 14
        ctx.strokeStyle = p.color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(p.x - cosRad * needleLen, p.y - sinRad * needleLen)
        ctx.lineTo(p.x + cosRad * needleLen, p.y + sinRad * needleLen)
        ctx.stroke()
        ctx.restore()

        // Bob Arrival detection
        if (p.x >= bobX) {
          p.dead = true

          // Quantum Malus Law measurement outcome:
          // P(match) = cos^2(theta_bob - theta_photon)
          const angleDiff = Math.abs(bobAngle - p.angle)
          const matchProb = Math.pow(Math.cos((angleDiff * Math.PI) / 180), 2)
          const isMatch = Math.random() < matchProb

          const siftBit = isMatch ? p.bit : (Math.random() < 0.5 ? 0 : 1)
          const isBasisMatch = (p.basis === '+' && (bobAngle === 0 || bobAngle === 90)) ||
                              (p.basis === 'x' && (bobAngle === 45 || bobAngle === 135))

          // Add detection ripple
          state.ripples.push({
            x: bobX + 20,
            y: channelY,
            radius: 5,
            maxRadius: 36,
            color: isBasisMatch ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.6)'
          })

          if (isBasisMatch) {
            setStats(s => ({
              ...s,
              matched: s.matched + 1,
              siftedBits: [siftBit, ...s.siftedBits].slice(0, 14)
            }))
          }
        }
      }

      // Filter dead photons
      state.photons = state.photons.filter(p => !p.dead)

      // ── 6. Detection Wavefront Ripples ──
      for (let r = state.ripples.length - 1; r >= 0; r--) {
        const rip = state.ripples[r]
        rip.radius += 1.2
        const alpha = Math.max(0, 1 - rip.radius / rip.maxRadius)

        ctx.save()
        ctx.strokeStyle = rip.color.replace(/[\d.]+\)$/, `${alpha})`)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        if (rip.radius >= rip.maxRadius) {
          state.ripples.splice(r, 1)
        }
      }

      // Continuous pulse emission timing
      if (isContinuous && state.time - state.lastSpawn > 0.85) {
        state.lastSpawn = state.time
        spawnPhoton()
      }

      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frameId)
  }, [bobAngle, eveEnabled, isContinuous, spawnPhoton])

  return (
    <div
      className="w-full rounded-lg border overflow-hidden flex flex-col font-body select-none"
      style={{
        backgroundColor: 'var(--q-surface-1, #17171d)',
        borderColor: 'var(--q-border, #2e2e38)',
      }}
    >
      {/* Visual Canvas Corridor */}
      <div className="relative w-full h-64 bg-[#0e0e12] overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Dynamic Polarizer Discs (Interactive Geometric Overlays) */}
        <div className="absolute top-3 left-4 flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-[var(--q-text-dim,#64748b)] font-body font-medium">
              Alice Polarizer (<span className="font-mono tabular-nums">{aliceAngle}°</span>)
            </span>
            <div className="flex items-center gap-1.5">
              {[0, 45, 90, 135].map(deg => (
                <button
                  key={deg}
                  onClick={() => setAliceAngle(deg)}
                  className={`w-7 h-7 rounded border text-[11px] font-mono font-bold tabular-nums flex items-center justify-center transition-all ${
                    aliceAngle === deg
                      ? 'border-[#f59e0b] bg-[#f59e0b]/20 text-[#f59e0b] scale-105'
                      : 'border-[#2e2e38] text-[var(--q-text-muted,#94a3b8)] hover:border-[#42424e]'
                  }`}
                  title={`Rotate Alice polarizer to ${deg}°`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Eve Optical Tap Toggle */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
          <button
            onClick={() => setEveEnabled(!eveEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded border text-xs font-body font-semibold transition-all ${
              eveEnabled
                ? 'border-[#e05252] bg-[#e05252]/15 text-[#e05252] shadow-sm'
                : 'border-[#2e2e38] bg-[#17171d]/80 text-[var(--q-text-muted,#94a3b8)] hover:border-[#42424e]'
            }`}
          >
            {eveEnabled ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>{eveEnabled ? 'Eve Intercept Active (45° Splitter)' : 'Channel Clean (No Eve)'}</span>
          </button>
        </div>

        {/* Bob Measurement Analyzer */}
        <div className="absolute top-3 right-4 flex flex-col items-end gap-1">
          <span className="text-[10px] uppercase tracking-wider text-[var(--q-text-dim,#64748b)] font-body font-medium">
            Bob Analyzer (<span className="font-mono tabular-nums">{bobAngle}°</span>)
          </span>
          <div className="flex items-center gap-1.5">
            {[0, 45, 90, 135].map(deg => (
              <button
                key={deg}
                onClick={() => setBobAngle(deg)}
                className={`w-7 h-7 rounded border text-[11px] font-mono font-bold tabular-nums flex items-center justify-center transition-all ${
                  bobAngle === deg
                    ? 'border-[#c084fc] bg-[#c084fc]/20 text-[#c084fc] scale-105'
                    : 'border-[#2e2e38] text-[var(--q-text-muted,#94a3b8)] hover:border-[#42424e]'
                }`}
                title={`Rotate Bob polarizer to ${deg}°`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Live Sifted Bitstream Visual Tape */}
        <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between pointer-events-none text-xs font-body">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[var(--q-text-dim,#64748b)] font-semibold">
              Quantum Sifted Bits:
            </span>
            <div className="flex items-center gap-1">
              {stats.siftedBits.map((b, idx) => (
                <motion.span
                  key={idx}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50"
                >
                  {b}
                </motion.span>
              ))}
              {stats.siftedBits.length === 0 && (
                <span className="text-[10px] text-[var(--q-text-dim,#64748b)] font-body">
                  Awaiting matching basis coincidence...
                </span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-[var(--q-text-dim,#64748b)] font-body">
            Emitted: <span className="text-white font-mono font-bold tabular-nums">{stats.emitted}</span> · Sifted Matches:{' '}
            <span className="text-[#10b981] font-mono font-bold tabular-nums">{stats.matched}</span>
          </div>
        </div>
      </div>

      {/* Tactile Experiential Control Bar */}
      <div
        className="p-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-body"
        style={{
          backgroundColor: 'var(--q-surface-0, #111115)',
          borderColor: 'var(--q-border, #2e2e38)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => spawnPhoton()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#f59e0b] bg-[#f59e0b] text-[#111115] font-body font-semibold hover:brightness-110 active:scale-95 transition-all"
          >
            <Zap size={13} fill="currentColor" /> Single Photon Pulse
          </button>
          <button
            onClick={() => setIsContinuous(!isContinuous)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border font-body font-semibold transition-all ${
              isContinuous
                ? 'border-[#2e2e38] bg-[#1c1c23] text-white'
                : 'border-[#f59e0b]/50 text-[#f59e0b] hover:bg-[#f59e0b]/10'
            }`}
          >
            {isContinuous ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
            <span>{isContinuous ? 'Pause Stream' : 'Start Continuous Stream'}</span>
          </button>
        </div>

        <button
          onClick={() => setActiveView('simulator')}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#2e2e38] hover:border-[#f59e0b] text-[var(--q-text-bright,#f1f5f9)] hover:text-[#f59e0b] font-body font-medium transition-colors"
        >
          <span>Open Full Interactive Simulator Bench</span>
          <Sparkles size={13} />
        </button>
      </div>
    </div>
  )
}
