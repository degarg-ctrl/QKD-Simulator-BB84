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
import useSimulationStore from '../../store/simulationStore'
import { usePhotonAnimation } from '../../hooks/usePhotonAnimation'
import GateStateVector from '../gates/GateStateVector'
import GateContextMenu from '../gates/GateContextMenu'
// ─── DESIGN CONSTANTS ────────────────────────────────────────────
const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 400
const ALICE_X = 120
const BOB_X = 1080
const EVE_X = 600
const ENTITY_Y = 200

const LANE_Y_POSITIONS = [150, 200, 250]  // 3 channel lanes

const COLORS = {
  background:      '#1a1a2e',
  laneLine:        '#ffffff',
  laneGlow:        'rgba(255,255,255,0.3)',
  aliceNode:       '#00d4ff',
  bobNode:         '#00ff88',
  eveNode:         '#ff4444',
  eveNodeInactive: '#555555',
  nodeText:        '#ffffff',
  nodeBorder:      'rgba(255,255,255,0.4)',
  photonBlue:      '#00d4ff',
  photonPurple:    '#ffd700',
  photonLost:      '#555555',
  labelText:       '#aaaaaa',
}

const NODE_RADIUS = 28

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
  const drawEntityNode = useCallback((ctx, x, y, label, color, sublabel = '') => {
    ctx.save()

    // White outer ring
    ctx.beginPath()
    ctx.arc(x, y, NODE_RADIUS + 4, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1.5
    ctx.stroke()
      
      ctx.shadowBlur = 0

    // Colored glow ring
    ctx.beginPath()
    ctx.arc(x, y, NODE_RADIUS + 2, 0, Math.PI * 2)
    ctx.strokeStyle = color + '60'
    ctx.lineWidth = 3
    ctx.shadowColor = color
    ctx.shadowBlur = 12
    ctx.stroke()
      
      ctx.shadowBlur = 0
    ctx.shadowBlur = 0

    // Filled circle
    ctx.beginPath()
    ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = color + '30'
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.stroke()
      
      ctx.shadowBlur = 0

    // Label
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(label, x, y + NODE_RADIUS + 8)

    // Sublabel
    if (sublabel) {
      ctx.fillStyle = '#aaaaaa'
      ctx.font = '9px monospace'
      ctx.fillText(sublabel, x, y + NODE_RADIUS + 20)
    }

    ctx.restore()
  }, [])

  /**
   * Draw the three horizontal channel lanes.
   */
  const drawChannelLanes = useCallback((ctx) => {
    ctx.save()

    const eveActive = params.attack_prob > 0

    LANE_Y_POSITIONS.forEach((y, laneIndex) => {
      // Glow effect
      ctx.shadowBlur = 3
      ctx.shadowColor = 'rgba(255,255,255,0.2)'
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 15]) // Dashed line

      if (eveActive) {
        // Draw lane in two segments: Alice to Eve, Eve to Bob
        ctx.beginPath()
        ctx.moveTo(ALICE_X + NODE_RADIUS, y)
        ctx.lineTo(EVE_X - NODE_RADIUS, y)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(EVE_X + NODE_RADIUS, y)
        ctx.lineTo(BOB_X - NODE_RADIUS, y)
        ctx.stroke()
      } else {
        // Draw continuous lane (Eve can be overshadowed)
        ctx.beginPath()
        ctx.moveTo(ALICE_X + NODE_RADIUS, y)
        ctx.lineTo(BOB_X - NODE_RADIUS, y)
        ctx.stroke()
      }
      
      ctx.shadowBlur = 0

      // Lane label on far left
      ctx.setLineDash([])
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '9px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`LANE 0${laneIndex + 1}`, 20, y + 4)

      // Check if any cloning probe is on this lane
      // If so, draw the lane segment AFTER the probe in red
      const cloningProbes = placedGates.filter(
        g => (g.type === 'clone' || g.type === 'cnot') && 
             g.lane === laneIndex
      )
      
      if (cloningProbes.length > 0) {
        const probe = cloningProbes[0]
        const channelWidth = BOB_X - ALICE_X
        const probeX = ALICE_X + channelWidth * probe.position
        
        // Draw corrupted segment in red after probe
        ctx.beginPath()
        ctx.setLineDash([4, 4])
        ctx.strokeStyle = '#ef444460'
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 4
        ctx.lineWidth = 1.5
        ctx.moveTo(probeX, y)
        ctx.lineTo(BOB_X - NODE_RADIUS, y)
        ctx.stroke()
      
      ctx.shadowBlur = 0
        ctx.setLineDash([])
        ctx.shadowBlur = 0
      }
    })

    ctx.restore()
  }, [placedGates, params.attack_prob])

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

      if (gate.type === 'clone' || gate.type === 'cnot') {
        // Cloning probe — render as red danger symbol
        const size = 26
        
        // Red pulsing background
        ctx.fillStyle = '#ef444420'
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(gateX - size/2, laneY - size/2, 
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
        ctx.fillText('NO-CLONE', gateX, laneY + size/2 + 8)
        
        return  // Skip general rendering for this gate
      }

      const gateColor = gate.color || '#6366f1'

      // Gate background square
      // Shadow/glow effect
      ctx.shadowColor = gateColor
      ctx.shadowBlur = 8
      
      const size = 32
      ctx.fillStyle = gateColor + '40'
      ctx.strokeStyle = gateColor
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.roundRect(gateX - size/2, laneY - size/2, size, size, 6)
      ctx.fill()
      ctx.stroke()
      
      ctx.shadowBlur = 0

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
      
      ctx.shadowBlur = 0
      ctx.setLineDash([])
    })
  }, [placedGates, params.attack_prob])

  /**
   * Draw the static background.
   */
  const drawBackground = useCallback((ctx, width, height) => {
    // Solid charcoal-blue base
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Subtle grid with white lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    const gridSize = 40
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
      
      ctx.shadowBlur = 0
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
      
      ctx.shadowBlur = 0
    }
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
  }, [drawBackground, drawChannelLanes, drawEntityNode, drawGates, params.attack_prob, zoomedWidth, zoomedHeight])

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
      const laneY = LANE_Y_POSITIONS[gate.lane]
      const dist = Math.sqrt((canvasX-gateX)**2 + (canvasY-laneY)**2)
      return dist < 20
    })

    if (clickedGate) removeGate(clickedGate.id)
  }, [placedGates, removeGate, toolMode])

  // Attach animation loop
  usePhotonAnimation(canvasRef, drawStaticScene)

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
        background: '#1a1a2e',
        borderColor: 'rgba(255,255,255,0.08)' 
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
        <div className="flex bg-gray-900/80 border border-gray-700 rounded-lg overflow-hidden backdrop-blur-sm shadow-xl">
          <button 
            onClick={() => setToolMode('cursor')}
            className={`px-3 py-1.5 text-sm transition-colors ${toolMode === 'cursor' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'}`}
            title="Select Mode"
          >
            👆
          </button>
          <button 
            onClick={() => setToolMode('hand')}
            className={`px-3 py-1.5 text-sm transition-colors ${toolMode === 'hand' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'}`}
            title="Pan Mode"
          >
            ✋
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
          className="px-3 py-1.5 bg-gray-900/80 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white hover:bg-gray-800 backdrop-blur-sm shadow-xl transition-colors font-mono"
          title="Reset View"
        >
          RESET
        </button>
      </div>

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
