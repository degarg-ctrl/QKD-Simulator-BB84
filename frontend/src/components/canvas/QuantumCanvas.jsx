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

import { useEffect, useRef, useCallback } from 'react'
import useSimulationStore from '../../store/simulationStore'
import { usePhotonAnimation } from '../../hooks/usePhotonAnimation'

// ─── DESIGN CONSTANTS ────────────────────────────────────────────
const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 400
const ALICE_X = 120
const BOB_X = 1080
const EVE_X = 600
const ENTITY_Y = 200

const LANE_Y_POSITIONS = [150, 200, 250]  // 3 channel lanes

const COLORS = {
  background:      '#0a0a0f',
  laneLine:        '#1e1e3f',
  laneGlow:        '#2a2a5f',
  aliceNode:       '#6366f1',   // quantum-blue
  bobNode:         '#22c55e',   // quantum-green
  eveNode:         '#ef4444',   // quantum-red
  eveNodeInactive: '#374151',   // grey when attack_prob=0
  nodeText:        '#ffffff',
  nodeBorder:      '#ffffff22',
  photonBlue:      '#6366f1',   // rectilinear basis
  photonPurple:    '#a855f7',   // diagonal basis
  photonLost:      '#374151',
  labelText:       '#6b7280',
}

const NODE_RADIUS = 28

export default function QuantumCanvas({ className = '' }) {

  const canvasRef = useRef(null)
  const { results, params, addGate, placedGates, removeGate } = useSimulationStore()

  const GATE_COLORS = {
    H: '#6366f1', X: '#f59e0b', Y: '#ec4899',
    Z: '#14b8a6', S: '#8b5cf6', T: '#06b6d4'
  }

  /**
   * Draw a single entity node (Alice, Bob, or Eve).
   */
  const drawEntityNode = useCallback((ctx, x, y, label, color, sublabel = '') => {
    ctx.save()

    // Outer glow ring
    const gradient = ctx.createRadialGradient(x, y, NODE_RADIUS * 0.8, x, y, NODE_RADIUS * 1.5)
    gradient.addColorStop(0, `${color}44`)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, NODE_RADIUS * 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Inner glow
    ctx.shadowBlur = 15
    ctx.shadowColor = color

    // Filled circle
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2)
    ctx.fill()

    // Border
    ctx.strokeStyle = COLORS.nodeBorder
    ctx.lineWidth = 2
    ctx.stroke()

    // Text Label below node
    ctx.shadowBlur = 0
    ctx.fillStyle = COLORS.nodeText
    ctx.font = 'bold 14px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, x, y + NODE_RADIUS + 25)

    // Sublabel
    if (sublabel) {
      ctx.fillStyle = COLORS.labelText
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.fillText(sublabel, x, y + NODE_RADIUS + 42)
    }

    ctx.restore()
  }, [])

  /**
   * Draw the three horizontal channel lanes.
   */
  const drawChannelLanes = useCallback((ctx) => {
    ctx.save()

    LANE_Y_POSITIONS.forEach((y, index) => {
      // Glow effect
      ctx.shadowBlur = 8
      ctx.shadowColor = COLORS.laneGlow
      ctx.strokeStyle = COLORS.laneLine
      ctx.lineWidth = 2
      ctx.setLineDash([10, 15]) // Dashed line

      ctx.beginPath()
      ctx.moveTo(ALICE_X + NODE_RADIUS, y)
      ctx.lineTo(BOB_X - NODE_RADIUS, y)
      ctx.stroke()

      // Lane label on far left
      ctx.setLineDash([])
      ctx.shadowBlur = 0
      ctx.fillStyle = COLORS.laneGlow
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`LANE 0${index + 1}`, 20, y + 4)
    })

    ctx.restore()
  }, [])

  /**
   * Draw placed gates on channel lanes.
   */
  const drawGates = useCallback((ctx) => {
    if (!placedGates || placedGates.length === 0) return

    placedGates.forEach(gate => {
      // Calculate pixel position
      const channelWidth = BOB_X - ALICE_X
      const gateX = ALICE_X + channelWidth * gate.position
      const laneY = LANE_Y_POSITIONS[gate.lane]

      const gateColor = gate.color || '#6366f1'

      // Gate background square
      const size = 22
      ctx.fillStyle = gateColor + '30'
      ctx.strokeStyle = gateColor
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(gateX - size/2, laneY - size/2, size, size, 4)
      ctx.fill()
      ctx.stroke()

      // Gate label
      ctx.fillStyle = gateColor
      ctx.font = 'bold 11px monospace'
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
  }, [placedGates])

  /**
   * Draw the static background.
   */
  const drawBackground = useCallback((ctx, width, height) => {
    ctx.save()

    const bgGradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, width / 1.5
    )
    bgGradient.addColorStop(0, '#10101a')
    bgGradient.addColorStop(1, COLORS.background)
    
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#ffffff05'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

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
    const { width, height } = canvas

    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.scale(dpr, dpr)
    const logicalWidth = width / dpr
    const logicalHeight = height / dpr
    const scaleX = logicalWidth / CANVAS_WIDTH
    const scaleY = logicalHeight / CANVAS_HEIGHT
    ctx.scale(scaleX, scaleY)

    drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)
    drawChannelLanes(ctx)
    drawGates(ctx)

    drawEntityNode(ctx, ALICE_X, ENTITY_Y, 'ALICE', COLORS.aliceNode, 'Sender')
    drawEntityNode(ctx, BOB_X, ENTITY_Y, 'BOB', COLORS.bobNode, 'Receiver')

    const eveColor = params.attack_prob > 0 
      ? COLORS.eveNode 
      : COLORS.eveNodeInactive
    const eveSublabel = params.attack_prob > 0 
      ? `${(params.attack_prob * 100).toFixed(0)}% intercept`
      : 'Inactive'
    drawEntityNode(ctx, EVE_X, ENTITY_Y, 'EVE', eveColor, eveSublabel)

    ctx.restore()
  }, [drawBackground, drawChannelLanes, drawEntityNode, drawGates, params.attack_prob])

  /**
   * Handle gate drop from sidebar drag.
   */
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const gateType = e.dataTransfer.getData('gateType')
    if (!gateType) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Determine lane from y position
    const canvasHeight = rect.height
    const laneHeight = canvasHeight / 3
    const lane = Math.min(2, Math.floor(y / laneHeight))

    // Determine position as fraction of channel width
    const scaleX = CANVAS_WIDTH / rect.width
    const canvasX = x * scaleX
    const channelStart = ALICE_X
    const channelEnd = BOB_X
    const channelWidth = channelEnd - channelStart
    const position = Math.max(0.05, Math.min(0.95,
      (canvasX - channelStart) / channelWidth
    ))

    addGate({
      type: gateType,
      lane,
      position,
      color: GATE_COLORS[gateType] || '#6366f1'
    })
  }, [addGate, GATE_COLORS])

  /**
   * Handle right-click to remove a gate.
   */
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
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
      const laneY = LANE_Y_POSITIONS[gate.lane]
      const dist = Math.sqrt((canvasX-gateX)**2 + (canvasY-laneY)**2)
      return dist < 20
    })

    if (clickedGate) removeGate(clickedGate.id)
  }, [placedGates, removeGate])

  // Attach animation loop
  usePhotonAnimation(canvasRef, drawStaticScene)

  // Configure canvas on mount and resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const configureCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const container = canvas.parentElement
      if (!container) return

      // Use full container width — never clip
      const containerWidth = container.clientWidth
      const aspectRatio = CANVAS_HEIGHT / CANVAS_WIDTH
      const logicalHeight = containerWidth * aspectRatio

      canvas.width = containerWidth * dpr
      canvas.height = logicalHeight * dpr
      canvas.style.width = `${containerWidth}px`
      canvas.style.height = `${logicalHeight}px`

      drawStaticScene()
    }

    configureCanvas()
    window.addEventListener('resize', configureCanvas)
    return () => window.removeEventListener('resize', configureCanvas)
  }, [drawStaticScene, params.attack_prob])

  return (
    <div
      className={`relative w-full bg-[#0a0a0f] rounded-lg overflow-hidden border border-[#1e1e3f] shadow-2xl ${className}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ display: 'block' }}
      />
      <div className="absolute top-4 left-4 text-[10px] text-gray-500 
                      font-mono tracking-[0.2em] uppercase pointer-events-none">
        Quantum Key Distribution Channel
      </div>
      {results?.secure_threshold_breached && (
        <div className="absolute top-4 right-4 px-3 py-1 bg-red-950/40 
                        border border-red-500/50 rounded text-red-400 
                        text-[10px] font-mono tracking-wider animate-pulse">
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
