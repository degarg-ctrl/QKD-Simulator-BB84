/**
 * src/components/canvas/QuantumCanvas.jsx
 *
 * Main quantum channel visualization canvas.
 * Renders channel lanes, entity nodes, and hosts photon animation.
 *
 * Layout (canvas coordinates, 1200x400px):
 *
 * ALICE(120,200) ────────────────── EVE(600,200) ────────────────── BOB(1080,200)
 *     │                                  │                               │
 *  Lane 1 ════════════════════════════════════════════════════════════════
 *  Lane 2 ════════════════════════════════════════════════════════════════
 *  Lane 3 ════════════════════════════════════════════════════════════════
 *
 * Canvas is responsive — scales to container width maintaining aspect ratio.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { MousePointer2, Hand } from 'lucide-react'
import useSimulationStore from '../../store/simulationStore'
import { usePhotonAnimation } from '../../hooks/usePhotonAnimation'
import GateStateVector from '../gates/GateStateVector'
import GateContextMenu from '../gates/GateContextMenu'
import TransmissionHUD from './TransmissionHUD'
import NodeTelemetryHUD from './NodeTelemetryHUD'
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, ALICE_X, BOB_X, EVE_X, ENTITY_Y,
  LANE_Y_POSITIONS, COLORS, PALETTE, NODE_RADIUS,
} from './visualEncoding'
// ─── DESIGN CONSTANTS ────────────────────────────────────────────
// Geometry, lanes, palette and NODE_RADIUS now come from
// ./visualEncoding (single source of truth, shared with
// PhotonParticle and the animation scheduler).

const GATE_COLORS = {
  H: '#6366f1', X: '#f59e0b', Y: '#ec4899',
  Z: '#14b8a6', S: '#8b5cf6', T: '#06b6d4'
}

export default function QuantumCanvas({ className = '' }) {

  const canvasRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const wrapperRef = useRef(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [hoveredGateId, setHoveredGateId] = useState(null)
  const showStateVectors = true

  const { results, params, addGate, placedGates, removeGate, setSelectedGate, deleteGate, copyGate, viewResetSignal } = useSimulationStore()

  // Viewport & Pan states
  const [scale, setScale] = useState(1)
  const [toolMode, setToolMode] = useState('cursor') // 'cursor' | 'hand'
  const [baseWidth, setBaseWidth] = useState(1200)

  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  // Mathematical Size Calculation
  const zoomedWidth = baseWidth * scale
  const aspectRatio = CANVAS_HEIGHT / CANVAS_WIDTH
  const zoomedHeight = zoomedWidth * aspectRatio


  /**
   * Draw a single entity node (Alice, Bob, or Eve) as a precision optical module.
   */
  const drawEntityNode = useCallback((ctx, x, y, label, color, sublabel = '', type = 'default') => {
    ctx.save()

    const r = NODE_RADIUS

    if (type === 'alice') {
      // Precision Laser Diode Housing
      const w = r * 2.2, h = r * 1.4
      // Base chassis
      ctx.fillStyle = '#1a1a1e'
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 2)
      ctx.fill()
      ctx.stroke()

      // Optical bench mounting screws
      ctx.fillStyle = '#34343d'
      ctx.fillRect(x - w / 2 + 3, y - h / 2 + 3, 3, 3)
      ctx.fillRect(x - w / 2 + 3, y + h / 2 - 6, 3, 3)

      // FC/PC optical collimator nozzle collar
      ctx.fillStyle = '#282830'
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x + w / 2, y - 6, 8, 12, 1)
      ctx.fill()
      ctx.stroke()

      // Optical aperture port
      ctx.fillStyle = color
      ctx.fillRect(x + w / 2 + 8, y - 3, 3, 6)

      // Laser text
      ctx.fillStyle = color
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('TX', x - 2, y)
    } else if (type === 'bob') {
      // Precision SPAD Detector Housing
      const w = r * 2.2, h = r * 1.4
      ctx.fillStyle = '#1a1a1e'
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      // Trapezoid housing
      ctx.moveTo(x - w / 2, y - h / 2)
      ctx.lineTo(x + w / 2, y - h / 3)
      ctx.lineTo(x + w / 2, y + h / 3)
      ctx.lineTo(x - w / 2, y + h / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Optical input window / bandpass filter plate
      ctx.fillStyle = '#282830'
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x - w / 2 - 6, y - 9, 6, 18, 1)
      ctx.fill()
      ctx.stroke()

      // Active area grid tick
      ctx.strokeStyle = color + '80'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - w / 2, y - 5)
      ctx.lineTo(x - w / 2, y + 5)
      ctx.stroke()

      // Detector text
      ctx.fillStyle = color
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('RX', x + 2, y)
    } else if (type === 'eve') {
      // Optical Tap / Beam Splitter Mount
      const s = r * 1.1
      ctx.fillStyle = '#1a1a1e'
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, y - s)     // top
      ctx.lineTo(x + s, y)     // right
      ctx.lineTo(x, y + s)     // bottom
      ctx.lineTo(x - s, y)     // left
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Internal beam splitter 45° reflection plane
      ctx.strokeStyle = color + '90'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(x - s * 0.5, y + s * 0.5)
      ctx.lineTo(x + s * 0.5, y - s * 0.5)
      ctx.stroke()
      ctx.setLineDash([])

      // Tap sensor port upward indicator
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, y - s)
      ctx.lineTo(x, y - s - 6)
      ctx.stroke()

      // Eve label inside
      ctx.fillStyle = color
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('TAP', x, y)
    } else {
      // Fallback: solid bordered circle
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = color + '25'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Outer registration ring
    const outerR = type === 'eve' ? r * 1.1 + 4 : r + 4
    if (type !== 'eve') {
      ctx.beginPath()
      ctx.arc(x, y, outerR, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Label
    const labelY = (type === 'eve') ? y + r * 1.1 + 8 : y + r + 8
    ctx.fillStyle = 'var(--text-primary, #ffffff)'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(label, x, labelY)

    // Sublabel (spaced 16px below to ensure zero merging or text overlap)
    if (sublabel) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px monospace'
      ctx.fillText(sublabel, x, labelY + 16)
    }

    ctx.restore()
  }, [])

  /**
   * Draw the three horizontal channel lanes.
   */
  const drawChannelLanes = useCallback((ctx) => {
    /**
     * ONE physical channel, three VISUAL lanes.
     *
     * The lanes are drawn as sub-paths inside a single fiber envelope
     * (a subtle bounded region between Alice and Bob) so the layout
     * reads as one optical channel, not three independent fibers.
     * A horizontal attenuation gradient (stronger → fainter with
     * distance) hints at Beer-Lambert loss along the fiber; the
     * label states the simulated distance.
     */
    ctx.save()

    const eveActive = params.attack_prob > 0
    const channelLeft = ALICE_X + NODE_RADIUS
    const channelRight = BOB_X - NODE_RADIUS
    const channelWidth = channelRight - channelLeft
    const envelopeTop = ENTITY_Y - 26
    const envelopeBottom = ENTITY_Y + 26

    // ── Fiber envelope: single channel beam tube ─────────────
    const grad = ctx.createLinearGradient(channelLeft, 0, channelRight, 0)
    grad.addColorStop(0, 'rgba(148, 163, 184, 0.12)')
    grad.addColorStop(1, 'rgba(148, 163, 184, 0.04)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(channelLeft, envelopeTop, channelWidth,
      envelopeBottom - envelopeTop, 14)
    ctx.fill()
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'
    ctx.lineWidth = 1
    ctx.stroke()

    // ── Single BB84 transmission path (dashed, fading with distance) ──
    const laneGrad = ctx.createLinearGradient(channelLeft, 0, channelRight, 0)
    laneGrad.addColorStop(0, 'rgba(255,255,255,0.65)')
    laneGrad.addColorStop(1, 'rgba(255,255,255,0.22)')
    ctx.strokeStyle = laneGrad
    ctx.lineWidth = 2.5
    ctx.setLineDash([10, 14])

    if (eveActive) {
      // Channel segments leading into and out of Eve
      ctx.beginPath()
      ctx.moveTo(channelLeft, ENTITY_Y)
      ctx.lineTo(EVE_X - NODE_RADIUS, ENTITY_Y)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(EVE_X + NODE_RADIUS, ENTITY_Y)
      ctx.lineTo(channelRight, ENTITY_Y)
      ctx.stroke()
    } else {
      // Direct Alice -> Bob uninterrupted channel
      ctx.beginPath()
      ctx.moveTo(channelLeft, ENTITY_Y)
      ctx.lineTo(channelRight, ENTITY_Y)
      ctx.stroke()
    }

    // Cloning probe corruption segment on the single lane
    ctx.setLineDash([])
    const cloningProbes = placedGates.filter(
      g => g.type === 'clone' || g.type === 'cnot'
    )
    if (cloningProbes.length > 0) {
      const probe = cloningProbes[0]
      const probeX = ALICE_X + (BOB_X - ALICE_X) * probe.position
      ctx.beginPath()
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = '#ef444470'
      ctx.lineWidth = 2
      ctx.moveTo(probeX, ENTITY_Y)
      ctx.lineTo(channelRight, ENTITY_Y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // ── Distance label (top center of the envelope) ───────────
    ctx.fillStyle = 'rgba(226, 232, 240, 0.85)'
    ctx.font = '12px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(
      `optical fiber · ${params.distance_km} km · α = 0.2 dB/km`,
      (channelLeft + channelRight) / 2, envelopeTop - 6
    )
    ctx.textBaseline = 'alphabetic'

    ctx.restore()
  }, [placedGates, params.attack_prob, params.distance_km])

  /**
   * Draw placed gates on channel lanes as precision optical components.
   */
  const drawGates = useCallback((ctx) => {
    if (!placedGates || placedGates.length === 0) return

    const sublabels = {
      H: 'HADAMARD',
      X: 'BIT-FLIP',
      Y: 'BIT+PHASE',
      Z: 'PHASE-FLIP',
      S: 'π/2 ROT',
      T: 'π/4 ROT'
    }

    placedGates.forEach(gate => {
      // Calculate pixel position
      const channelWidth = BOB_X - ALICE_X
      const gateX = ALICE_X + channelWidth * gate.position
      const laneY = LANE_Y_POSITIONS[gate.lane] ?? ENTITY_Y

      if (gate.type === 'clone' || gate.type === 'cnot') {
        // Cloning probe — precision optical tap / beam-sampler component
        const size = 38

        // Optical stage mount
        ctx.fillStyle = 'rgba(28, 28, 34, 0.95)'
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(gateX - size / 2, laneY - size / 2, size, size, 6)
        ctx.fill()
        ctx.stroke()

        // Inner optical aperture
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(gateX - size / 2 + 4, laneY - size / 2 + 4, size - 8, size - 8, 4)
        ctx.fill()
        ctx.stroke()

        // Probe Symbol
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 16px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(gate.type === 'clone' ? '⊗' : '⊕', gateX, laneY)

        // Pill badge below — immune to axis collision
        const badgeY = laneY + size / 2 + 11
        const badgeW = 60
        const badgeH = 14
        ctx.fillStyle = 'rgba(24, 24, 27, 0.95)'
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(gateX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 3)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('NO-CLONE', gateX, badgeY)

        // Vertical optical alignment guide
        ctx.strokeStyle = '#ef444440'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(gateX, laneY - 38)
        ctx.lineTo(gateX, laneY + 38)
        ctx.stroke()
        ctx.setLineDash([])

        return
      }

      const gateColor = gate.color || '#6366f1'
      const size = 40

      // Outer precision optical stage frame
      ctx.fillStyle = 'rgba(28, 28, 34, 0.95)'
      ctx.strokeStyle = gateColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(gateX - size / 2, laneY - size / 2, size, size, 6)
      ctx.fill()
      ctx.stroke()

      // Optical crystal aperture
      ctx.fillStyle = gateColor + '25'
      ctx.strokeStyle = gateColor + '70'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(gateX - size / 2 + 4, laneY - size / 2 + 4, size - 8, size - 8, 4)
      ctx.fill()
      ctx.stroke()

      // Gate Symbol
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(gate.type, gateX, laneY)

      // Sublabel pill badge below
      const sub = sublabels[gate.type]
      if (sub) {
        const bW = 60
        const bH = 14
        const bY = laneY + size / 2 + 11
        ctx.fillStyle = 'rgba(24, 24, 27, 0.95)'
        ctx.strokeStyle = gateColor + '60'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(gateX - bW / 2, bY - bH / 2, bW, bH, 3)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#f1f5f9'
        ctx.font = 'bold 8.5px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(sub, gateX, bY)
      }

      // Vertical optical alignment guide
      ctx.strokeStyle = gateColor + '40'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(gateX, laneY - 38)
      ctx.lineTo(gateX, laneY + 38)
      ctx.stroke()
      ctx.setLineDash([])
    })
  }, [placedGates])

  /**
   * Draw the static background.
   */
  const drawBackground = useCallback((ctx, width, height, canvasBg) => {
    // Use CSS variable background (light or dark)
    ctx.fillStyle = canvasBg || '#2a2a2a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Subtle grid
    const isLight = canvasBg && canvasBg !== '#2a2a2a'
    ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    const gridSize = 40
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
    }
  }, [])

  /**
   * Draw continuous laser beam when animation mode is 'beam'.
   * Matches the experiential optical sandbox on the landing page:
   * - Transverse electric field sinusoidal traveling wave
   * - Traveling photon phase nodes with polarization vector needles
   * - Eve 45° dielectric beam splitter with upward reflected tap beam and collapse disturbance
   * - Bob SPAD detector expanding arrival ripple waves
   */
  const drawContinuousBeam = useCallback((ctx) => {
    const storeState = useSimulationStore.getState()
    const isBeam = storeState.animation?.mode === 'beam'
    const hasResults = storeState.results !== null
    if (!isBeam || !hasResults) return

    ctx.save()
    const channelLeft = ALICE_X + NODE_RADIUS + 8
    const channelRight = BOB_X - NODE_RADIUS - 6
    const eveActive = params.attack_prob > 0
    const paused = storeState.animation.isPaused
    const speed = storeState.animation.speed || 1.0
    const t = paused ? 0 : (Date.now() / 1000) * speed

    const aliceReadout = storeState.animation?.activeReadout?.alice
    const isDiagBasis = aliceReadout?.basis === 'x'
    const baseColor = isDiagBasis ? '#c084fc' : '#10b981' // Orchid (×) or Emerald (+)
    const polAngle = isDiagBasis ? 45 : 0

    // ── 1. Central Collimated Optical Guide ──
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.beginPath()
    ctx.moveTo(channelLeft, ENTITY_Y)
    ctx.lineTo(channelRight, ENTITY_Y)
    ctx.stroke()

    // ── 2. Transverse Electric-Field Sinusoidal Traveling Wave ──
    // Section A: Alice to Eve (or to Bob if Eve is inactive)
    const midPoint = eveActive ? EVE_X : channelRight

    ctx.lineWidth = 2
    ctx.strokeStyle = baseColor
    ctx.beginPath()
    const k = 0.04
    const omega = 10
    const amp = 10

    for (let x = channelLeft; x <= midPoint; x += 6) {
      const envelope = Math.min(1, Math.min((x - channelLeft) / 24, (midPoint - x) / 24))
      const phase = (x * k) - (t * omega)
      const y = ENTITY_Y + Math.sin(phase) * amp * envelope
      if (x === channelLeft) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Section B: Eve to Bob (if Eve active, exhibits state collapse / disturbance)
    if (eveActive) {
      // ── Eve 45° Beam Splitter Optical Cube ──
      ctx.fillStyle = '#1c1c24'
      ctx.strokeStyle = '#e05252'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(EVE_X - 18, ENTITY_Y - 18, 36, 36, 3)
      ctx.fill()
      ctx.stroke()

      // 45° Dielectric interface line
      ctx.strokeStyle = 'rgba(224, 82, 82, 0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(EVE_X - 14, ENTITY_Y + 14)
      ctx.lineTo(EVE_X + 14, ENTITY_Y - 14)
      ctx.stroke()

      // Upward reflected beam channel to Eve's tap detector
      const tapTopY = ENTITY_Y - 60
      ctx.strokeStyle = '#e05252'
      ctx.lineWidth = 1.5
      ctx.setLineDash([3, 4])
      ctx.lineDashOffset = -t * 40
      ctx.beginPath()
      ctx.moveTo(EVE_X, ENTITY_Y - 18)
      ctx.lineTo(EVE_X, tapTopY)
      ctx.stroke()
      ctx.setLineDash([])

      // Eve tap flash ripple
      const eveRippleR = ((t * 24) % 18) + 3
      const eveAlpha = Math.max(0, 1 - eveRippleR / 20)
      ctx.strokeStyle = `rgba(224, 82, 82, ${eveAlpha})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(EVE_X, tapTopY, eveRippleR, 0, Math.PI * 2)
      ctx.stroke()

      // Transmitted beam past Eve (interception disturbance)
      ctx.lineWidth = 2
      ctx.strokeStyle = '#e05252' // Disturbed by Eve
      ctx.beginPath()
      for (let x = EVE_X; x <= channelRight; x += 6) {
        const envelope = Math.min(1, Math.min((x - EVE_X) / 24, (channelRight - x) / 24))
        const phase = (x * k) - (t * omega) + Math.PI / 3 // Phase shift from disturbance
        const y = ENTITY_Y + Math.sin(phase) * (amp * 0.85) * envelope
        if (x === EVE_X) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    // ── 3. Traveling Photon Nodes & Polarization Needles ──
    const packetSpacing = 160
    const totalDist = channelRight - channelLeft
    const packetCount = Math.floor(totalDist / packetSpacing)
    const baseOffset = (t * 70) % packetSpacing

    for (let i = 0; i <= packetCount; i++) {
      const px = channelLeft + baseOffset + i * packetSpacing
      if (px > channelRight - 15) continue

      const isPostEve = eveActive && px > EVE_X
      const packetColor = isPostEve ? '#e05252' : baseColor
      const curAngle = isPostEve ? 135 : polAngle
      const rad = (curAngle * Math.PI) / 180
      const phase = (px * k) - (t * omega)
      const py = ENTITY_Y + Math.sin(phase) * 8

      // Bright photon core
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(px, py, 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Polarization needle
      const nLen = 10
      ctx.strokeStyle = packetColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(px - Math.cos(rad) * nLen, py - Math.sin(rad) * nLen)
      ctx.lineTo(px + Math.cos(rad) * nLen, py + Math.sin(rad) * nLen)
      ctx.stroke()
    }

    // ── 4. Bob SPAD Detection Ripple Waves ──
    const bobRipplePhase = (t * 30) % 24
    for (let r = 0; r < 2; r++) {
      const rRad = ((bobRipplePhase + r * 12) % 24) + 4
      const rAlpha = Math.max(0, 1 - rRad / 26)
      const rColor = eveActive && params.attack_prob > 0.5 ? '224, 82, 82' : '16, 185, 129'
      ctx.strokeStyle = `rgba(${rColor}, ${rAlpha * 0.7})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(channelRight + 8, ENTITY_Y, rRad, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
    }

    // ── 5. Aperture Couplers ──
    ctx.fillStyle = '#10b981'
    ctx.fillRect(channelLeft - 2, ENTITY_Y - 4, 3, 8)
    ctx.fillStyle = eveActive ? '#e05252' : '#c084fc'
    ctx.fillRect(channelRight - 1, ENTITY_Y - 4, 3, 8)

    ctx.restore()
  }, [params.attack_prob])

  /**
   * Draw dynamic live Bit & Basis readout badges above Alice and Bob
   */
  const drawAliceAndBobReadouts = useCallback((ctx) => {
    const storeState = useSimulationStore.getState()
    const readout = storeState.animation?.activeReadout
    const alice = readout?.alice
    const bob = readout?.bob
    const hasResults = storeState.results !== null

    ctx.save()

    // Helper to draw a badge card
    const drawBadge = (x, y, w, h, title, titleColor, borderColor, childrenFn) => {
      // Connector line linking badge to entity node below
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(x, y + h / 2)
      ctx.lineTo(x, ENTITY_Y - NODE_RADIUS - 4)
      ctx.stroke()
      ctx.setLineDash([])

      // Terminal anchor dot at node
      ctx.fillStyle = borderColor
      ctx.beginPath()
      ctx.arc(x, ENTITY_Y - NODE_RADIUS - 4, 2, 0, Math.PI * 2)
      ctx.fill()

      // Card body (neutral dark chassis)
      ctx.fillStyle = 'rgba(20, 20, 24, 0.96)'
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 4)
      ctx.fill()
      ctx.stroke()

      // Header
      ctx.font = 'bold 10px monospace'
      ctx.fillStyle = titleColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(title, x, y - h / 2 + 5)

      // Divider line
      ctx.strokeStyle = 'rgba(52, 52, 61, 0.8)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - w / 2 + 8, y - h / 2 + 18)
      ctx.lineTo(x + w / 2 - 8, y - h / 2 + 18)
      ctx.stroke()

      childrenFn(x, y - h / 2 + 20, w, h)
    }

    // ── Alice Card (above Alice at X=ALICE_X, Y=ENTITY_Y - 92) ──
    const cardW = 186
    const cardH = 68
    const aliceY = ENTITY_Y - 92
    const isAliceActive = hasResults && alice?.basis

    drawBadge(
      ALICE_X, aliceY, cardW, cardH,
      'ALICE ENCODING',
      '#10b981',
      isAliceActive ? '#10b981' : 'rgba(52, 52, 61, 0.8)',
      (cx, topY) => {
        if (!hasResults || !alice?.basis) {
          ctx.font = '11px monospace'
          ctx.fillStyle = '#64748b'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('AWAITING PULSE', cx, topY + 16)
          return
        }

        const isRect = alice.basis === '+'
        const basisColor = isRect ? '#10b981' : '#c084fc'
        const basisSymbol = isRect ? '+' : '×'

        // Row 1: Bit & Basis
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(`Bit:`, cx - 82, topY + 6)
        ctx.fillStyle = '#f1f5f9'
        ctx.fillText(`${alice.bit}`, cx - 50, topY + 6)

        ctx.fillStyle = '#94a3b8'
        ctx.fillText(`Basis:`, cx + 2, topY + 6)
        ctx.fillStyle = basisColor
        ctx.fillText(`[ ${basisSymbol} ]`, cx + 50, topY + 6)

        // Row 2: State label and rotation angle
        ctx.font = '11px monospace'
        ctx.fillStyle = basisColor
        ctx.fillText(`${alice.label || ''}`, cx - 82, topY + 25)
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(`Rot:`, cx + 2, topY + 25)
        ctx.fillStyle = '#f1f5f9'
        ctx.fillText(`${alice.angle}°`, cx + 36, topY + 25)
      }
    )

    // ── Bob Card (above Bob at X=BOB_X, Y=ENTITY_Y - 92) ──
    const bobY = ENTITY_Y - 92
    const isBobActive = hasResults && bob?.basis

    drawBadge(
      BOB_X, bobY, cardW, cardH,
      'BOB MEASUREMENT',
      '#c084fc',
      isBobActive ? '#c084fc' : 'rgba(52, 52, 61, 0.8)',
      (cx, topY) => {
        if (!hasResults || !bob?.basis) {
          ctx.font = '11px monospace'
          ctx.fillStyle = '#64748b'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('AWAITING PHOTON', cx, topY + 16)
          return
        }

        const isRect = bob.basis === '+'
        const basisColor = isRect ? '#10b981' : '#c084fc'
        const basisSymbol = isRect ? '+' : '×'

        // Row 1: Selected Basis
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(`Basis:`, cx - 82, topY + 6)
        ctx.fillStyle = basisColor
        ctx.fillText(`[ ${basisSymbol} ]`, cx - 32, topY + 6)

        // Row 2: Match / Status
        ctx.font = 'bold 11px monospace'
        if (bob.status === 'detected') {
          if (bob.match) {
            ctx.fillStyle = '#10b981'
            ctx.fillText('MATCH ✓ (SIFTED)', cx - 82, topY + 25)
          } else {
            ctx.fillStyle = '#f59e0b'
            ctx.fillText('MISMATCH ✗', cx - 82, topY + 25)
          }
        } else {
          ctx.fillStyle = '#f59e0b'
          ctx.fillText('IN FLIGHT...', cx - 82, topY + 25)
        }
      }
    )

    ctx.restore()
  }, [])

  /**
   * Main render function for static elements.
   * Called by usePhotonAnimation every frame.
   */
  const drawStaticScene = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas // These are the physical pixel sizes (zoomedWidth * dpr)

    const dpr = window.devicePixelRatio || 1
    ctx.save()
    // Reset transform completely before redrawing
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width, height)

    // Scale everything by dpr and then by the dynamic scaling factor (zoomedWidth / 1200)
    // This maps the 1200x400 internal coordinate system perfectly to the canvas pixels!
    const scaleFactorX = (zoomedWidth / CANVAS_WIDTH) * dpr
    const scaleFactorY = (zoomedHeight / CANVAS_HEIGHT) * dpr
    ctx.scale(scaleFactorX, scaleFactorY)

    // Read canvas background from CSS variable for light-mode support
    const computedStyle = getComputedStyle(document.documentElement)
    const canvasBg = computedStyle.getPropertyValue('--canvas-bg').trim() || '#2a2a2a'
    drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, canvasBg)
    drawChannelLanes(ctx)
    drawContinuousBeam(ctx)
    drawGates(ctx)

    const sourceModel = params.wcp_enabled ? 'WCP source' : 'Single-photon'
    drawEntityNode(ctx, ALICE_X, ENTITY_Y, 'ALICE',
      PALETTE.aliceNode, sourceModel, 'alice')
    drawEntityNode(ctx, BOB_X, ENTITY_Y, 'BOB',
      PALETTE.bobNode,
      params.wcp_enabled ? 'η=0.85 · dark 1e-5' : 'ideal detector',
      'bob')

    const eveActive = params.attack_prob > 0
    const eveColor = eveActive
      ? PALETTE.eveNode
      : PALETTE.eveNodeInactive
    const eveSublabel = eveActive
      ? params.attack_strategy === 'pns'
        ? `PNS · p=${(params.attack_prob * 100).toFixed(0)}%`
        : `${(params.attack_prob * 100).toFixed(0)}% intercept`
      : 'Inactive'
    drawEntityNode(ctx, EVE_X, ENTITY_Y, 'EVE', eveColor, eveSublabel, 'eve')

    // Live Alice & Bob state readouts
    drawAliceAndBobReadouts(ctx)

    ctx.restore()
  }, [drawBackground, drawChannelLanes, drawContinuousBeam, drawAliceAndBobReadouts, drawEntityNode, drawGates,
    params.attack_prob, params.attack_strategy, params.wcp_enabled,
    zoomedWidth, zoomedHeight])

  /**
   * Handle gate drop from sidebar drag.
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    if (toolMode !== 'cursor') return
    const gateType = e.dataTransfer.getData('gateType')
    if (!gateType) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Determine lane from y position: NEAREST lane center, not
    // canvas thirds. The three lane centers (150/200/250 in the
    // 400px coordinate system) all sit in the vertical middle of
    // the canvas, so dividing the canvas into thirds mapped every
    // drop to lane 1. Nearest-center matching places the gate on
    // the lane the user actually dropped on.
    const scaleY = CANVAS_HEIGHT / rect.height
    const canvasY = y * scaleY
    let lane = 0
    let bestDist = Infinity
    LANE_Y_POSITIONS.forEach((laneY, i) => {
      const d = Math.abs(canvasY - laneY)
      if (d < bestDist) { bestDist = d; lane = i }
    })

    // Determine position as fraction of channel width
    const scaleX = CANVAS_WIDTH / rect.width
    const canvasX = x * scaleX
    const channelStart = ALICE_X
    const channelEnd = BOB_X
    const channelWidth = channelEnd - channelStart
    let position = Math.max(0.05, Math.min(0.95,
      (canvasX - channelStart) / channelWidth
    ))

    // Snap to grid (15 slots) to prevent overlap
    const slots = 15
    position = Math.round(position * slots) / slots

    // Check if slot is occupied in this lane
    const isOccupied = placedGates.some(g =>
      g.lane === lane && Math.abs(g.position - position) < 0.05
    )

    if (isOccupied) return

    addGate({
      type: gateType,
      lane,
      position,
      color: GATE_COLORS[gateType] || '#6366f1'
    })
  }, [addGate, placedGates, toolMode])

  /**
   * Handle right-click to remove a gate.
   */
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    if (toolMode !== 'cursor') return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const canvasX = x * scaleX
    const canvasY = y * scaleY

    // Find gate near click position
    const clickedGate = placedGates.find(gate => {
      const channelWidth = BOB_X - ALICE_X
      const gateX = ALICE_X + channelWidth * gate.position
      const laneY = LANE_Y_POSITIONS[gate.lane] ?? ENTITY_Y
      const dist = Math.sqrt((canvasX - gateX) ** 2 + (canvasY - laneY) ** 2)
      return dist < 20
    })

    if (clickedGate) removeGate(clickedGate.id)
  }, [placedGates, removeGate, toolMode])

  // Attach animation loop — countersRef feeds the Transmission HUD
  const { countersRef } = usePhotonAnimation(canvasRef, drawStaticScene)

  // Canvas Layout Resize Observer
  useEffect(() => {
    const handleResize = () => {
      const wrapper = wrapperRef.current
      if (!wrapper) return
      let w = wrapper.clientWidth
      if (w === 0) return
      // We enforce a minimum base width so the channel doesn't get completely squished
      w = Math.max(w, 800)
      setBaseWidth(w)
    }

    const wrapper = wrapperRef.current
    let resizeObserver = null
    if (wrapper && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(wrapper)
    }

    // Initial calculation
    handleResize()

    return () => {
      if (resizeObserver) resizeObserver.disconnect()
    }
  }, [])

  // Sync canvas DOM element size to zoomed logic
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = zoomedWidth * dpr
    canvas.height = zoomedHeight * dpr
    canvas.style.width = `${zoomedWidth}px`
    canvas.style.height = `${zoomedHeight}px`
    drawStaticScene()
  }, [zoomedWidth, zoomedHeight, drawStaticScene])

  // Mouse wheel zoom logic
  useEffect(() => {
    const container = scrollContainerRef.current
    const wheelHandler = (e) => {
      // Zoom if NOT holding alt. (Vertical scroll if holding alt).
      if (!e.altKey) {
        e.preventDefault()
        const zoomFactor = -e.deltaY * 0.001
        setScale(s => Math.min(Math.max(0.5, s + zoomFactor), 3))
      }
    }

    if (container) {
      container.addEventListener('wheel', wheelHandler, { passive: false })
    }
    return () => {
      if (container) container.removeEventListener('wheel', wheelHandler)
    }
  }, [])

  // Panning interactions
  const handleMouseDown = useCallback((e) => {
    if (toolMode === 'hand') {
      isDragging.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
  }, [toolMode])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Listen to global reset
  useEffect(() => {
    if (viewResetSignal > 0) {
      const id = setTimeout(() => {
        setScale(1)
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = 0
          scrollContainerRef.current.scrollTop = 0
        }
      }, 0)
      return () => clearTimeout(id)
    }
  }, [viewResetSignal])

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full rounded-lg overflow-hidden border shadow-2xl ${className}`}
      style={{
        background: 'var(--canvas-bg)',
        borderColor: 'var(--border-color)'
      }}
    >
      {/* Scrollable Area (only overflow when zoomed) */}
      <div
        ref={scrollContainerRef}
        className={`absolute inset-0 w-full h-full flex ${
          scale > 1 ? 'overflow-auto' : 'overflow-hidden'
        }`}
      >
        <div
          className="relative m-auto"
          style={{
            width: `${zoomedWidth}px`,
            height: `${zoomedHeight}px`,
            cursor: toolMode === 'hand' ? 'grab' : 'default'
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => toolMode === 'cursor' && handleDrop(e)}
          onContextMenu={(e) => toolMode === 'cursor' && handleContextMenu(e)}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseMove={(e) => {
            if (toolMode === 'hand' && isDragging.current && scrollContainerRef.current) {
              const dx = e.clientX - lastMouse.current.x
              const dy = e.clientY - lastMouse.current.y
              lastMouse.current = { x: e.clientX, y: e.clientY }
              scrollContainerRef.current.scrollLeft -= dx
              scrollContainerRef.current.scrollTop -= dy
              return
            }

            if (toolMode === 'cursor') {
              const rect = canvasRef.current?.getBoundingClientRect()
              if (!rect) return
              const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width)
              const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
              const channelWidth = BOB_X - ALICE_X
              let foundGate = null
              placedGates.forEach(gate => {
                const gateX = ALICE_X + channelWidth * gate.position
                const laneY = LANE_Y_POSITIONS[gate.lane]
                const dist = Math.sqrt((x - gateX) ** 2 + (y - laneY) ** 2)
                if (dist < 20) foundGate = gate.id
              })
              setHoveredGateId(foundGate)
            }
          }}
          onClick={(e) => {
            if (toolMode !== 'cursor') return
            const rect = canvasRef.current?.getBoundingClientRect()
            if (!rect) return
            const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width)
            const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
            const channelWidth = BOB_X - ALICE_X
            placedGates.forEach(gate => {
              const gateX = ALICE_X + channelWidth * gate.position
              const laneY = LANE_Y_POSITIONS[gate.lane]
              const dist = Math.sqrt((x - gateX) ** 2 + (y - laneY) ** 2)
              if (dist < 20) setSelectedGate(gate)
            })
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ display: 'block' }}
          />

          {contextMenu && (
            <GateContextMenu
              position={{
                x: contextMenu.x * (zoomedWidth / CANVAS_WIDTH),
                y: contextMenu.y * (zoomedHeight / CANVAS_HEIGHT)
              }}
              gate={contextMenu.gate}
              onDelete={() => deleteGate(contextMenu.gate.id)}
              onCopy={() => copyGate(contextMenu.gate)}
              onViewMatrix={() => setSelectedGate(contextMenu.gate)}
              onClose={() => setContextMenu(null)}
            />
          )}

          {showStateVectors && placedGates.map((gate) => {
            const channelWidth = BOB_X - ALICE_X
            const gateX = ALICE_X + channelWidth * gate.position
            const laneY = LANE_Y_POSITIONS[gate.lane]

            const scaleX = zoomedWidth / CANVAS_WIDTH
            const scaleY = zoomedHeight / CANVAS_HEIGHT

            return (
              <div key={gate.id} className="absolute pointer-events-none">
                <GateStateVector
                  gate={gate}
                  position={{ x: gateX * scaleX, y: laneY * scaleY }}
                  isHovered={hoveredGateId === gate.id}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Laboratory Optical Bench Hardware Telemetry */}
      <NodeTelemetryHUD />

      {/* Floating Toolbar Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        <div
          className="flex rounded overflow-hidden"
          style={{ backgroundColor: 'var(--q-surface-1, #1a1a1e)', border: '1px solid var(--q-border, #34343d)' }}
        >
          <button
            onClick={() => setToolMode('cursor')}
            className={`flex items-center justify-center w-8 h-8 transition-colors ${toolMode === 'cursor' ? 'text-[var(--q-accent,#f59e0b)]' : 'text-[var(--q-text-muted,#94a3b8)]'}`}
            style={toolMode === 'cursor' ? { backgroundColor: 'rgba(245, 158, 11, 0.12)' } : undefined}
            title="Select Mode"
          >
            <MousePointer2 size={15} />
          </button>
          <button
            onClick={() => setToolMode('hand')}
            className={`flex items-center justify-center w-8 h-8 transition-colors ${toolMode === 'hand' ? 'text-[var(--q-accent,#f59e0b)]' : 'text-[var(--q-text-muted,#94a3b8)]'}`}
            style={toolMode === 'hand' ? { backgroundColor: 'rgba(245, 158, 11, 0.12)' } : undefined}
            title="Pan Mode"
          >
            <Hand size={15} />
          </button>
        </div>
        <button
          onClick={() => {
            setScale(1)
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollLeft = 0
              scrollContainerRef.current.scrollTop = 0
            }
          }}
          className="px-3 py-1.5 rounded text-xs font-body font-semibold transition-colors hover:text-[var(--q-text-bright,#f1f5f9)]"
          style={{
            backgroundColor: 'var(--q-surface-1, #1a1a1e)',
            border: '1px solid var(--q-border, #34343d)',
            color: 'var(--q-text-muted, #94a3b8)',
          }}
          title="Reset View"
        >
          RESET VIEW
        </button>
      </div>

      {/* Transmission HUD — compact playback + full accounting */}
      <TransmissionHUD countersRef={countersRef} />

      {results?.secure_threshold_breached && (
        <div
          className="absolute bottom-4 right-4 px-3.5 py-2 rounded text-xs font-body font-semibold tracking-wide pointer-events-none flex items-center gap-2 shadow-xl select-none"
          style={{
            backgroundColor: 'var(--q-surface-1, #1a1a1e)',
            border: '1px solid var(--q-accent-crimson, #e05252)',
            color: 'var(--q-accent-crimson, #e05252)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--q-accent-crimson,#e05252)] flex-shrink-0" />
          <span>SECURITY THRESHOLD BREACHED (QBER &gt; <span className="font-mono tabular-nums">11%</span>)</span>
        </div>
      )}
    </div>
  )
}

export {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ALICE_X,
  BOB_X,
  EVE_X,
  ENTITY_Y,
  LANE_Y_POSITIONS,
  COLORS,
  NODE_RADIUS
}

