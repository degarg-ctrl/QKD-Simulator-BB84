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
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, ALICE_X, BOB_X, EVE_X, ENTITY_Y,
  LANE_Y_POSITIONS, COLORS, PALETTE, NODE_RADIUS,
} from './visualEncoding'
// ─── DESIGN CONSTANTS ────────────────────────────────────────────
// Geometry, lanes, palette and NODE_RADIUS now come from
// ./visualEncoding (single source of truth, shared with
// PhotonParticle and the animation scheduler).

export default function QuantumCanvas({ className = '' }) {

  const canvasRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const wrapperRef = useRef(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [showStateVectors, setShowStateVectors] = useState(true)
  const [hoveredGateId, setHoveredGateId] = useState(null)

  const { results, animation, params, addGate, placedGates, removeGate, setSelectedGate, deleteGate, copyGate, viewResetSignal } = useSimulationStore()

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

  const GATE_COLORS = {
    H: '#6366f1', X: '#f59e0b', Y: '#ec4899',
    Z: '#14b8a6', S: '#8b5cf6', T: '#06b6d4'
  }

  /**
   * Draw a single entity node (Alice, Bob, or Eve).
   */
  const drawEntityNode = useCallback((ctx, x, y, label, color, sublabel = '', type = 'default') => {
    ctx.save()

    const r = NODE_RADIUS
    // Slow time-based pulse for active nodes (subtle, non-flashy)
    const t = Date.now() / 1000
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2)

    if (type === 'alice') {
      // Laser source — rectangle housing + emission triangle
      const w = r * 2.2, h = r * 1.4
      ctx.fillStyle = color + '25'
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 4)
      ctx.fill()
      ctx.stroke()
      // Source aperture: soft pulsing emission glow at the output
      const apertureX = x + w / 2 + 10
      const glow = ctx.createRadialGradient(
        apertureX, y, 0, apertureX, y, 14 + pulse * 6)
      glow.addColorStop(0, color + '55')
      glow.addColorStop(1, color + '00')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(apertureX, y, 14 + pulse * 6, 0, Math.PI * 2)
      ctx.fill()
      // Emission triangle on right side
      ctx.fillStyle = color + '50'
      ctx.beginPath()
      ctx.moveTo(x + w / 2, y - 6)
      ctx.lineTo(x + w / 2 + 10, y)
      ctx.lineTo(x + w / 2, y + 6)
      ctx.closePath()
      ctx.fill()
      // Laser text
      ctx.fillStyle = color
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('SRC', x, y)
    } else if (type === 'bob') {
      // Detector — funnel/trapezoid shape
      const w = r * 2.2, h = r * 1.4
      ctx.fillStyle = color + '25'
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      // Funnel — wider on left (receiving), narrow on right (sensing)
      ctx.moveTo(x - w / 2, y - h / 2)
      ctx.lineTo(x + w / 2, y - h / 4)
      ctx.lineTo(x + w / 2, y + h / 4)
      ctx.lineTo(x - w / 2, y + h / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Detector arc: subtle pulsing sensing region on the left face
      const senseX = x - w / 2
      const arc = ctx.createRadialGradient(
        senseX, y, 0, senseX, y, 12 + pulse * 5)
      arc.addColorStop(0, color + '44')
      arc.addColorStop(1, color + '00')
      ctx.fillStyle = arc
      ctx.beginPath()
      ctx.arc(senseX, y, 12 + pulse * 5, 0, Math.PI * 2)
      ctx.fill()

      // Detector text
      ctx.fillStyle = color
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('DET', x, y)
    } else if (type === 'eve') {
      // Spy tap — diamond/rhombus shape
      const s = r * 1.1
      ctx.fillStyle = color + '20'
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y - s)     // top
      ctx.lineTo(x + s, y)     // right
      ctx.lineTo(x, y + s)     // bottom
      ctx.lineTo(x - s, y)     // left
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Tap icon — crosshair lines
      ctx.strokeStyle = color + '60'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - s * 0.4, y)
      ctx.lineTo(x + s * 0.4, y)
      ctx.moveTo(x, y - s * 0.4)
      ctx.lineTo(x, y + s * 0.4)
      ctx.stroke()
      // Active Eve: pulsing halo (she only "exists" when attacking)
      const active = !sublabel.includes('Inactive')
      if (active) {
        ctx.beginPath()
        ctx.arc(x, y, s + 6 + pulse * 5, 0, Math.PI * 2)
        ctx.strokeStyle = color + (pulse > 0.5 ? '55' : '22')
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
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

    // Outer border ring
    const outerR = type === 'eve' ? r * 1.1 + 4 : r + 4
    if (type !== 'eve') {
      ctx.beginPath()
      ctx.arc(x, y, outerR, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Label
    const labelY = (type === 'eve') ? y + r * 1.1 + 8 : y + r + 8
    ctx.fillStyle = 'var(--text-primary, #ffffff)'
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(label, x, labelY)

    // Sublabel
    if (sublabel) {
      ctx.fillStyle = '#aaaaaa'
      ctx.font = '9px monospace'
      ctx.fillText(sublabel, x, labelY + 12)
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
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)'
    ctx.font = '10px JetBrains Mono, monospace'
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
   * Draw placed gates on channel lanes.
   */
  const drawGates = useCallback((ctx) => {
    if (!placedGates || placedGates.length === 0) return

    placedGates.forEach(gate => {
      // Calculate pixel position
      const channelWidth = BOB_X - ALICE_X
      const gateX = ALICE_X + channelWidth * gate.position
      const laneY = LANE_Y_POSITIONS[gate.lane] ?? ENTITY_Y

      if (gate.type === 'clone' || gate.type === 'cnot') {
        // Cloning probe — render as red danger symbol
        const size = 26

        // Red pulsing background
        ctx.fillStyle = '#ef444420'
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(gateX - size / 2, laneY - size / 2,
          size, size, 4)
        ctx.fill()
        ctx.stroke()

        ctx.shadowBlur = 0

        // Symbol
        ctx.fillStyle = '#ef4444'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(gate.type === 'clone' ? '⊗' : '⊕',
          gateX, laneY)

        // Warning label below
        ctx.fillStyle = '#ef444480'
        ctx.font = '8px monospace'
        ctx.fillText('NO-CLONE', gateX, laneY + size / 2 + 8)

        return  // Skip general rendering for this gate
      }

      const gateColor = gate.color || '#6366f1'

      // Gate background square — solid fill, no shadow
      const size = 32
      ctx.fillStyle = gateColor + '40'
      ctx.strokeStyle = gateColor
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.roundRect(gateX - size / 2, laneY - size / 2, size, size, 6)
      ctx.fill()
      ctx.stroke()

      // Gate label
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(gate.type, gateX, laneY)

      // Vertical line through lane showing gate position
      ctx.strokeStyle = gateColor + '40'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(gateX, laneY - 30)
      ctx.lineTo(gateX, laneY + 30)
      ctx.stroke()
      ctx.setLineDash([])
    })
  }, [placedGates, params.attack_prob])

  /**
   * Draw the static background.
   */
  const drawBackground = useCallback((ctx, width, height, canvasBg) => {
    // Use CSS variable background (light or dark)
    ctx.fillStyle = canvasBg || '#1a1a2e'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Subtle grid
    const isLight = canvasBg && canvasBg !== '#1a1a2e'
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
   * Draw continuous laser beam when animation mode is 'beam'
   */
  const drawContinuousBeam = useCallback((ctx) => {
    const storeState = useSimulationStore.getState()
    const isBeam = storeState.animation?.mode === 'beam'
    const hasResults = storeState.results !== null
    if (!isBeam || !hasResults) return

    ctx.save()
    const channelLeft = ALICE_X + NODE_RADIUS
    const channelRight = BOB_X - NODE_RADIUS
    const eveActive = params.attack_prob > 0
    const paused = storeState.animation.isPaused
    const t = paused ? 0 : (Date.now() / 1000)

    // Attenuation gradient: beam gets slightly dimmer with distance
    const beamGrad = ctx.createLinearGradient(channelLeft, 0, channelRight, 0)
    beamGrad.addColorStop(0, 'rgba(0, 229, 255, 0.85)')
    beamGrad.addColorStop(0.5, 'rgba(0, 204, 255, 0.75)')
    beamGrad.addColorStop(1, 'rgba(0, 180, 240, 0.60)')

    // 1. Wide outer aura / halo
    ctx.lineWidth = 14
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)'
    ctx.beginPath()
    ctx.moveTo(channelLeft, ENTITY_Y)
    ctx.lineTo(channelRight, ENTITY_Y)
    ctx.stroke()

    // 2. Focused mid beam
    ctx.lineWidth = 6
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)'
    ctx.stroke()

    // 3. High intensity core laser line
    ctx.lineWidth = 2.5
    ctx.strokeStyle = beamGrad
    ctx.stroke()

    // 4. Flowing optical wave ripples (interference fringes)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.setLineDash([14, 16])
    ctx.lineDashOffset = -t * 80
    ctx.beginPath()
    ctx.moveTo(channelLeft, ENTITY_Y)
    ctx.lineTo(channelRight, ENTITY_Y)
    ctx.stroke()
    ctx.setLineDash([])

    // 5. Eve tap refraction if active
    if (eveActive) {
      ctx.lineWidth = 8
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)'
      ctx.beginPath()
      ctx.moveTo(EVE_X, ENTITY_Y)
      ctx.lineTo(channelRight, ENTITY_Y)
      ctx.stroke()
    }

    // 6. Aperture flare at Alice & Collector glow at Bob
    const aliceGlow = ctx.createRadialGradient(channelLeft, ENTITY_Y, 0, channelLeft, ENTITY_Y, 16)
    aliceGlow.addColorStop(0, 'rgba(0, 229, 255, 0.8)')
    aliceGlow.addColorStop(1, 'rgba(0, 229, 255, 0.0)')
    ctx.fillStyle = aliceGlow
    ctx.beginPath()
    ctx.arc(channelLeft, ENTITY_Y, 16, 0, Math.PI * 2)
    ctx.fill()

    const bobGlow = ctx.createRadialGradient(channelRight, ENTITY_Y, 0, channelRight, ENTITY_Y, 16)
    bobGlow.addColorStop(0, 'rgba(168, 85, 247, 0.7)')
    bobGlow.addColorStop(1, 'rgba(168, 85, 247, 0.0)')
    ctx.fillStyle = bobGlow
    ctx.beginPath()
    ctx.arc(channelRight, ENTITY_Y, 16, 0, Math.PI * 2)
    ctx.fill()

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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)'
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(x - w / 2, y - h / 2, w, h, 6)
      ctx.fill()
      ctx.stroke()

      // Header
      ctx.font = 'bold 8px monospace'
      ctx.fillStyle = titleColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(title, x, y - h / 2 + 5)

      // Divider line
      ctx.strokeStyle = borderColor + '40'
      ctx.lineWidth = 0.75
      ctx.beginPath()
      ctx.moveTo(x - w / 2 + 6, y - h / 2 + 16)
      ctx.lineTo(x + w / 2 - 6, y - h / 2 + 16)
      ctx.stroke()

      childrenFn(x, y - h / 2 + 18, w, h)
    }

    // ── Alice Card (above Alice at X=ALICE_X, Y=ENTITY_Y - 90) ──
    const cardW = 120
    const cardH = 58
    const aliceY = ENTITY_Y - 90
    const isAliceActive = hasResults && alice?.basis

    drawBadge(
      ALICE_X, aliceY, cardW, cardH,
      'ALICE ENCODING',
      '#00e5ff',
      isAliceActive ? 'rgba(0, 229, 255, 0.6)' : 'rgba(148, 163, 184, 0.25)',
      (cx, topY) => {
        if (!hasResults || !alice?.basis) {
          ctx.font = '9px monospace'
          ctx.fillStyle = '#64748b'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('AWAITING PULSE', cx, topY + 14)
          return
        }

        const isRect = alice.basis === '+'
        const basisColor = isRect ? '#00e5ff' : '#d946ef'
        const basisSymbol = isRect ? '+' : '×'

        // Row 1: Bit & Basis
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(`Bit:`, cx - cardW / 2 + 10, topY + 6)
        ctx.fillStyle = '#38bdf8'
        ctx.fillText(`${alice.bit}`, cx - cardW / 2 + 38, topY + 6)

        ctx.fillStyle = '#ffffff'
        ctx.fillText(`Basis:`, cx + 6, topY + 6)
        ctx.fillStyle = basisColor
        ctx.fillText(`[ ${basisSymbol} ]`, cx + 50, topY + 6)

        // Row 2: State label and rotation angle
        ctx.font = '10px monospace'
        ctx.fillStyle = basisColor
        ctx.fillText(`${alice.label || ''}`, cx - cardW / 2 + 10, topY + 22)
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(`Rot:`, cx + 6, topY + 22)
        ctx.fillStyle = '#f1f5f9'
        ctx.fillText(`${alice.angle}°`, cx + 38, topY + 22)
      }
    )

    // ── Bob Card (above Bob at X=BOB_X, Y=ENTITY_Y - 90) ──
    const bobY = ENTITY_Y - 90
    const isBobActive = hasResults && bob?.basis

    drawBadge(
      BOB_X, bobY, cardW, cardH,
      'BOB MEASUREMENT',
      '#c084fc',
      isBobActive ? 'rgba(192, 132, 252, 0.6)' : 'rgba(148, 163, 184, 0.25)',
      (cx, topY) => {
        if (!hasResults || !bob?.basis) {
          ctx.font = '9px monospace'
          ctx.fillStyle = '#64748b'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('AWAITING PHOTON', cx, topY + 14)
          return
        }

        const isRect = bob.basis === '+'
        const basisColor = isRect ? '#00e5ff' : '#d946ef'
        const basisSymbol = isRect ? '+' : '×'

        // Row 1: Selected Basis
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'left'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(`Basis:`, cx - cardW / 2 + 10, topY + 6)
        ctx.fillStyle = basisColor
        ctx.fillText(`[ ${basisSymbol} ]`, cx - cardW / 2 + 54, topY + 6)

        // Row 2: Match / Status
        ctx.font = 'bold 9px monospace'
        if (bob.status === 'detected') {
          if (bob.match) {
            ctx.fillStyle = '#22c55e'
            ctx.fillText('MATCH ✓ (SIFTED)', cx - cardW / 2 + 10, topY + 22)
          } else {
            ctx.fillStyle = '#f59e0b'
            ctx.fillText('MISMATCH ✗', cx - cardW / 2 + 10, topY + 22)
          }
        } else {
          ctx.fillStyle = '#38bdf8'
          ctx.fillText('IN FLIGHT...', cx - cardW / 2 + 10, topY + 22)
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
    const canvasBg = computedStyle.getPropertyValue('--canvas-bg').trim() || '#1a1a2e'
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
  }, [addGate, GATE_COLORS, placedGates, toolMode])

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
      setScale(1)
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0
        scrollContainerRef.current.scrollTop = 0
      }
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
      {/* Scrollable Area */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 w-full h-full overflow-auto flex"
      >
        <div
          className="relative m-auto"
          style={{
            width: `${zoomedWidth}px`,
            height: `${zoomedHeight}px`,
            cursor: toolMode === 'hand' ? (isDragging.current ? 'grabbing' : 'grab') : 'default'
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

      {/* Floating UI Overlays */}
      <div className="absolute top-4 left-4 text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase pointer-events-none">
        Quantum Key Distribution Channel
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
        <div className="flex rounded-lg overflow-hidden border"
          style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setToolMode('cursor')}
            className={`flex items-center justify-center w-8 h-8 transition-colors ${toolMode === 'cursor' ? 'text-[#00B8E6]' : 'text-[var(--text-muted)]'}`}
            style={toolMode === 'cursor'
              ? { backgroundColor: 'rgba(0,184,230,0.12)' } : undefined}
            title="Select Mode"
          >
            <MousePointer2 size={15} />
          </button>
          <button
            onClick={() => setToolMode('hand')}
            className={`flex items-center justify-center w-8 h-8 transition-colors ${toolMode === 'hand' ? 'text-[#00B8E6]' : 'text-[var(--text-muted)]'}`}
            style={toolMode === 'hand'
              ? { backgroundColor: 'rgba(0,184,230,0.12)' } : undefined}
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
          className="px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors"
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-muted)'
          }}
          title="Reset View"
        >
          RESET
        </button>
      </div>

      {/* Transmission HUD — compact playback + full accounting */}
      <TransmissionHUD countersRef={countersRef} />

      {results?.secure_threshold_breached && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-950/40 
                        border border-red-500/50 rounded text-red-400 
                        text-[10px] font-mono tracking-wider animate-pulse pointer-events-none">
          ⚠ SECURITY THRESHOLD BREACHED
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

