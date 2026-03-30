/**
 * src/components/inspector/PhotonInspector.jsx
 *
 * Floating draggable panel showing step-by-step
 * photon journey through the BB84 pipeline.
 * Appears over the canvas after simulation runs.
 * User steps through each detected photon one by one.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'

const BASIS_COLOR = {
  '+': '#00aacc',
  'x': '#ccaa00',
}

function StageCard({ title, color, children }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg"
         style={{ 
           backgroundColor: color + '15',
           border: `1px solid ${color}40`
         }}>
      <div className="text-xs font-mono uppercase tracking-wider"
           style={{ color }}>
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {children}
      </div>
    </div>
  )
}

function DataRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between 
                    text-xs font-mono">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={highlight 
        ? 'text-[var(--text-primary)] font-bold' 
        : 'text-[var(--text-muted)]'}>
        {value}
      </span>
    </div>
  )
}

export default function PhotonInspector() {
  const {
    results,
    inspector,
    closeInspector,
    setInspectorIndex,
    setInspectorPlaying,
    params
  } = useSimulationStore()

  // Draggable state
  const [position, setPosition] = useState({ x: 20, y: 10 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef(null)
  const panelRef = useRef(null)

  const photons = results?.bit_stream || []
  const current = photons[inspector.currentIndex]
  const total = photons.length

  // Auto-play logic
  useEffect(() => {
    if (!inspector.isPlaying) return
    if (inspector.currentIndex >= total - 1) {
      setInspectorPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      setInspectorIndex(inspector.currentIndex + 1)
    }, inspector.playSpeed)
    return () => clearTimeout(timer)
  }, [inspector.isPlaying, inspector.currentIndex, 
      total, inspector.playSpeed])

  const goFirst = () => {
    setInspectorPlaying(false)
    setInspectorIndex(0)
  }

  const goPrev = () => {
    setInspectorPlaying(false)
    setInspectorIndex(Math.max(0, inspector.currentIndex - 1))
  }

  const goNext = () => {
    setInspectorPlaying(false)
    setInspectorIndex(
      Math.min(total - 1, inspector.currentIndex + 1)
    )
  }

  const goLast = () => {
    setInspectorPlaying(false)
    setInspectorIndex(total - 1)
  }

  const togglePlay = () => {
    if (inspector.currentIndex >= total - 1) {
      setInspectorIndex(0)
    }
    setInspectorPlaying(!inspector.isPlaying)
  }

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('button')) return
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      })
    }
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!inspector.isOpen || !current) return null

  // Determine result status
  const isMatch = current.match
  const isIntercepted = current.intercepted
  const isLost = current.lost
  const inSiftedKey = isMatch && !isLost

  const stateLabel = {
    '+_0': '|0⟩', '+_1': '|1⟩',
    'x_0': '|+⟩', 'x_1': '|-⟩'
  }[`${current.alice_basis}_${current.alice_bit}`] || '|?⟩'

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 100,
        width: 310,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      className="rounded-xl shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Panel background */}
      <div style={{ 
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--border-color)'
      }}>

        {/* Header */}
        <div className="flex items-center justify-between 
                        px-4 py-3"
             style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-quantum-blue 
                            animate-pulse" />
            <span className="text-xs font-mono text-[var(--text-primary)] 
                             uppercase tracking-wider">
              Photon Inspector
            </span>
          </div>
          <button
            onClick={closeInspector}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] 
                       transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Progress */}
        <div className="px-4 py-2 flex items-center 
                        justify-between"
             style={{ borderBottom: '1px solid var(--border-color)' }}>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Photon {inspector.currentIndex + 1} of {total}
          </span>
          {/* Progress bar */}
          <div className="flex-1 mx-3 h-1 bg-[var(--panel-dark)] rounded-full">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${((inspector.currentIndex + 1) / total) * 100}%`,
                backgroundColor: '#00aacc'
              }}
            />
          </div>
          <span className="text-xs font-mono text-[var(--text-subtle)]">
            #{current.index}
          </span>
        </div>

        {/* Content */}
        <div className="p-3 flex flex-col gap-2">

          {/* Alice stage */}
          <StageCard title="Alice — Encoding" 
                     color="#00aacc">
            <DataRow label="Secret bit" 
                     value={current.alice_bit} 
                     highlight />
            <DataRow label="Basis chosen"
                     value={current.alice_basis === '+'
                       ? '+ Rectilinear'
                       : '× Diagonal'} />
            <DataRow label="Quantum state"
                     value={stateLabel} highlight />
            <DataRow label="Polarization"
                     value={`${current.polarization_angle}°`} />
          </StageCard>

          {/* Channel stage */}
          <StageCard title="Quantum Channel"
                     color={isLost ? '#ff4444' : '#00ff88'}>
            <DataRow label="Distance"
                     value={`${params.distance_km} km`} />
            <DataRow label="Photon survived"
                     value={isLost ? '✗ Lost' : '✓ Yes'}
                     highlight={!isLost} />
            <DataRow label="Dark count"
                     value={current.dark_count 
                       ? '⚡ Yes' : 'No'} />
          </StageCard>

          {/* Eve stage */}
          <StageCard title="Eve — Eavesdropper"
                     color={isIntercepted 
                       ? '#ff4444' : '#555555'}>
            <DataRow label="Intercepted"
                     value={isIntercepted 
                       ? '⚡ YES — state disturbed' 
                       : '✓ Not intercepted'}
                     highlight={isIntercepted} />
            {isIntercepted && (
              <DataRow label="Basis mismatch"
                       value={current.basis_mismatch
                         ? 'Yes — error introduced'
                         : 'No — correct guess'} />
            )}
          </StageCard>

          {/* Bob stage */}
          <StageCard title="Bob — Measurement"
                     color="#00ff88">
            <DataRow label="Basis chosen"
                     value={current.bob_basis === '+'
                       ? '+ Rectilinear'
                       : current.bob_basis === 'x'
                         ? '× Diagonal'
                         : 'N/A (lost)'} />
            <DataRow label="Measured bit"
                     value={current.bob_bit ?? 'N/A'}
                     highlight />
            <DataRow label="Basis match"
                     value={isMatch ? '✓ Match' : '✗ Mismatch'} />
          </StageCard>

          {/* Result */}
          <div className="p-3 rounded-lg text-center"
               style={{
                 backgroundColor: inSiftedKey 
                   ? '#00ff8820' : '#ff444420',
                 border: `1px solid ${inSiftedKey 
                   ? '#00ff8840' : '#ff444440'}`
               }}>
            <div className="text-sm font-mono font-bold"
                 style={{ 
                   color: inSiftedKey ? '#00ff88' : '#ff4444' 
                 }}>
              {isLost
                ? '✗ Lost in channel'
                : !isMatch
                  ? '✗ Discarded — basis mismatch'
                  : isIntercepted
                    ? '⚡ Kept but may contain error'
                    : '✓ Added to sifted key'
              }
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between 
                        px-3 py-2"
             style={{ borderTop: '1px solid var(--border-color)' }}>
          <button onClick={goFirst}
                  disabled={inspector.currentIndex === 0}
                  className="px-2 py-1 text-xs font-mono
                             text-[var(--text-muted)] hover:text-[var(--text-primary)]
                             disabled:opacity-30 transition-colors">
            |◀
          </button>
          <button onClick={goPrev}
                  disabled={inspector.currentIndex === 0}
                  className="px-2 py-1 text-xs font-mono
                             text-[var(--text-muted)] hover:text-[var(--text-primary)]
                             disabled:opacity-30 transition-colors">
            ◀ Prev
          </button>
          <button onClick={togglePlay}
                  className="px-4 py-1.5 text-xs font-mono
                             rounded font-bold transition-colors"
                  style={{
                    backgroundColor: inspector.isPlaying
                      ? '#ff444430' : '#00aacc30',
                    color: inspector.isPlaying
                      ? '#ff4444' : '#00aacc',
                    border: `1px solid ${inspector.isPlaying
                      ? '#ff444460' : '#00aacc60'}`
                  }}>
            {inspector.isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={goNext}
                  disabled={inspector.currentIndex >= total - 1}
                  className="px-2 py-1 text-xs font-mono
                             text-[var(--text-muted)] hover:text-[var(--text-primary)]
                             disabled:opacity-30 transition-colors">
            Next ▶
          </button>
          <button onClick={goLast}
                  disabled={inspector.currentIndex >= total - 1}
                  className="px-2 py-1 text-xs font-mono
                             text-[var(--text-muted)] hover:text-[var(--text-primary)]
                             disabled:opacity-30 transition-colors">
            ▶|
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Depends on: store/simulationStore.js
// Used by: pages/SimulatorPage.jsx (rendered over canvas)
