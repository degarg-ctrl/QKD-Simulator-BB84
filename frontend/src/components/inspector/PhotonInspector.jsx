/**
 * src/components/inspector/PhotonInspector.jsx
 *
 * Floating draggable panel showing the complete journey of one
 * pulse/photon through the BB84 pipeline.
 *
 * Reads backend event records (event_stream): every field shown —
 * Alice's encoding, fiber outcome, WCP photon count, Eve's
 * measurement/PNS action, Bob's detection — comes from the actual
 * simulated event. Falls back to the legacy bit_stream (detected
 * photons only) for older responses.
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'

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

  // Full event stream (all outcomes) with legacy fallback
  const photons = results?.event_stream?.length
    ? results.event_stream
    : (results?.bit_stream || [])
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

  // Event outcome (backend fields)
  const isMatch = current.match
  const isIntercepted = current.intercepted
  const isDark = !!current.dark_count
  const isVacuum = !!current.wcp_vacuum
  const isPnsSplit = !!current.pns_split
  const isPnsBlocked = !!current.pns_blocked
  const fiberSurvived = current.fiber_survived !== false
  const detected = !!current.detector_detected
  const inSiftedKey = !!current.sifted

  const stateLabel = {
    '+_0': '|0⟩', '+_1': '|1⟩',
    'x_0': '|+⟩', 'x_1': '|−⟩'
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
              Pulse Inspector
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
            Event {inspector.currentIndex + 1} of {total}
          </span>
          <div className="flex-1 mx-3 h-1 bg-[var(--panel-dark)] rounded-full">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${((inspector.currentIndex + 1) / total) * 100}%`,
                backgroundColor: '#22d3ee'
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
          <StageCard title="Alice — Encoding" color="#22d3ee">
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
              value={`${current.alice_polarization_angle
                ?? current.polarization_angle}°`} />
          </StageCard>

          {/* Channel stage */}
          <StageCard title="Quantum Channel"
            color={fiberSurvived && !isVacuum
              ? '#34d399' : '#64748b'}>
            <DataRow label="Distance"
              value={`${params.distance_km} km`} />
            <DataRow label="Fiber survived"
              value={isVacuum ? '— vacuum (no photon)'
                : fiberSurvived ? '✓ Yes' : '✗ Absorbed'}
              highlight={fiberSurvived && !isVacuum} />
            {current.noise_flipped && (
              <DataRow label="Noise flip"
                value="⚡ detected bit flipped"
                highlight />
            )}
          </StageCard>

          {/* WCP stage (only when the model is active) */}
          {(current.wcp_photon_count != null || isVacuum) && (
            <StageCard title="WCP Pulse" color="#c084fc">
              <DataRow label="Photon count (n)"
                value={current.wcp_photon_count ?? 0}
                highlight />
              <DataRow label="Category"
                value={isVacuum ? 'Vacuum (n=0)'
                  : current.wcp_single ? 'Single (n=1)'
                    : 'Multiphoton (n≥2)'} />
            </StageCard>
          )}

          {/* Eve stage */}
          <StageCard title="Eve — Eavesdropper"
            color={isIntercepted || isPnsSplit || isPnsBlocked
              ? '#ef4444' : '#475569'}>
            {isIntercepted ? (
              <>
                <DataRow label="Intercepted"
                  value="⚡ YES — measured & re-sent"
                  highlight />
                <DataRow label="Eve basis"
                  value={current.eve_basis === '+'
                    ? '+ Rectilinear' : '× Diagonal'} />
                <DataRow label="Eve measured bit"
                  value={current.eve_bit} />
                <DataRow label="Basis vs Alice"
                  value={current.eve_basis_match
                    ? '✓ Match — no disturbance'
                    : '✗ Mismatch — state disturbed'}
                  highlight={!current.eve_basis_match} />
                <DataRow label="Re-sent angle"
                  value={`${current.eve_resend_angle}°`} />
              </>
            ) : isPnsSplit ? (
              <>
                <DataRow label="Attack" value="PNS — split" highlight />
                <DataRow label="Multiphoton pulse"
                  value="✓ Eve retained one photon" highlight />
                <DataRow label="Eve has copy" value="YES" />
                <DataRow label="QBER impact"
                  value="none (measures after basis reveal)" />
              </>
            ) : isPnsBlocked ? (
              <>
                <DataRow label="Attack" value="PNS — block" highlight />
                <DataRow label="Single photon"
                  value="✗ blocked — Bob receives nothing"
                  highlight />
              </>
            ) : (
              <DataRow label="Intercepted"
                value="✓ Not intercepted" />
            )}
          </StageCard>

          {/* Bob stage */}
          <StageCard title="Bob — Measurement"
            color={detected || isDark ? '#34d399' : '#94a3b8'}>
            {isDark ? (
              <>
                <DataRow label="Outcome"
                  value="⚡ Dark count (spurious click)"
                  highlight />
                <DataRow label="Basis chosen"
                  value={current.bob_basis === '+'
                    ? '+ Rectilinear' : '× Diagonal'} />
                <DataRow label="Registered bit"
                  value={`${current.bob_bit} (random)`} />
              </>
            ) : !fiberSurvived || isPnsBlocked || isVacuum ? (
              <DataRow label="Outcome"
                value={isPnsBlocked ? '✗ Blocked at Eve'
                  : isVacuum ? '— nothing to detect'
                    : '✗ Lost in fiber'} />
            ) : !detected ? (
              <DataRow label="Outcome"
                value="✗ Detector miss (efficiency draw)"
                highlight />
            ) : (
              <>
                <DataRow label="Outcome"
                  value="✓ Real detection" highlight />
                <DataRow label="Basis chosen"
                  value={current.bob_basis === '+'
                    ? '+ Rectilinear'
                    : current.bob_basis === 'x'
                      ? '× Diagonal'
                      : 'N/A'} />
                <DataRow label="Measured bit"
                  value={current.bob_bit ?? 'N/A'}
                  highlight />
                <DataRow label="Basis match"
                  value={isMatch ? '✓ Match' : '✗ Mismatch'} />
              </>
            )}
          </StageCard>

          {/* Result */}
          <div className="p-3 rounded-lg text-center"
            style={{
              backgroundColor: inSiftedKey
                ? '#34d39920' : '#f8717120',
              border: `1px solid ${inSiftedKey
                ? '#34d39940' : '#f8717140'}`
            }}>
            <div className="text-sm font-mono font-bold"
              style={{
                color: inSiftedKey ? '#34d399' : '#f87171'
              }}>
              {isDark
                ? '⚡ Dark count — not a real photon'
                : isVacuum
                  ? '— Vacuum pulse — nothing sent'
                  : isPnsBlocked
                    ? '✗ Blocked by Eve (PNS)'
                    : !fiberSurvived
                      ? '✗ Lost in fiber'
                      : !detected
                        ? '✗ Detector miss — not registered'
                        : !isMatch
                          ? '✗ Discarded — basis mismatch'
                          : isPnsSplit
                            ? '⚡ Sifted — Eve holds a copy (PNS)'
                            : isIntercepted
                              ? '⚡ Sifted — may contain Eve error'
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
                ? '#ef444430' : '#22d3ee30',
              color: inspector.isPlaying
                ? '#ef4444' : '#22d3ee',
              border: `1px solid ${inspector.isPlaying
                ? '#ef444460' : '#22d3ee60'}`
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
