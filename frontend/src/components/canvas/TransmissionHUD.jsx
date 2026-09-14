/**
 * src/components/canvas/TransmissionHUD.jsx
 *
 * Draggable, live-updating transmission HUD rendered inside the Quantum Canvas.
 *
 * Answers "What is happening right now?" — displays in-flight counters
 * (generated, fiber lost, survived, detected, sifted) updating live as
 * photons travel across the channel, detach on fiber loss, and arrive at Bob.
 */

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { GripHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import useSimulationStore from '../../store/simulationStore'

const POLL_MS = 60

function Stat({ label, value, color, dim = false }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="text-[9px] uppercase tracking-[0.12em]"
                style={{ color: dim ? 'var(--text-subtle)' : 'var(--text-muted)' }}>
                {label}
            </span>
            <span className="text-[11px] font-semibold tabular-nums"
                style={{ color: color || 'var(--text-primary)' }}>
                {value}
            </span>
        </div>
    )
}

export default function TransmissionHUD({ countersRef }) {
    const results = useSimulationStore((s) => s.results)
    const [counters, setCounters] = useState(null)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const hudRef = useRef(null)

    // Poll the animation counters ref (mutated by the rAF loop)
    useEffect(() => {
        if (!countersRef) return
        const id = setInterval(() => {
            if (countersRef.current) {
                setCounters({ ...countersRef.current })
            }
        }, POLL_MS)
        return () => clearInterval(id)
    }, [countersRef])

    const transmission = results?.transmission
    if (!transmission) return null

    const released = counters?.released ?? 0
    const sampled = results.event_stream?.length ?? 0
    const isSample = transmission.event_stream_truncated
    const totalTarget = isSample ? sampled : transmission.generated
    const isComplete = totalTarget > 0 && released >= totalTarget

    // Authoritative live numbers during playback, snapping to final totals on complete
    const liveLost = isComplete ? transmission.fiber_lost : (counters?.live_fiber_loss ?? 0)
    const liveVacuum = isComplete ? transmission.vacuum_pulses : (counters?.vacuum ?? 0)
    const livePnsBlocked = isComplete ? (transmission.pns_blocked ?? 0) : (counters?.pns_blocked ?? 0)
    const liveSurvived = isComplete
        ? transmission.fiber_survived
        : Math.max(0, released - liveLost - liveVacuum - livePnsBlocked)

    const liveDetected = isComplete ? transmission.real_detections : (counters?.live_detected ?? 0)
    const liveDetectorMiss = isComplete ? transmission.detector_loss : (counters?.live_detector_loss ?? 0)
    const liveDarkCounts = isComplete ? transmission.dark_counts : (counters?.dark_count ?? 0)
    const liveIntercepted = isComplete ? transmission.intercepted : (counters?.intercepted ?? 0)
    const livePnsSplit = isComplete ? transmission.pns_split : (counters?.pns_split ?? 0)
    const liveSifted = isComplete ? transmission.sifted : (counters?.live_sifted ?? 0)

    return (
        <motion.div
            ref={hudRef}
            drag
            dragMomentum={false}
            initial={{ x: 20, y: 30 }}
            className="absolute z-20 pointer-events-auto rounded-lg overflow-hidden select-none shadow-2xl"
            style={{
                backgroundColor: 'color-mix(in srgb, var(--panel-bg) 92%, transparent)',
                border: '1px solid var(--border-color)',
                backdropFilter: 'blur(8px)',
                minWidth: 200,
            }}
        >
            {/* Draggable Header */}
            <div
                className="px-3 pt-2 pb-1.5 flex items-center justify-between cursor-move"
                style={{
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                }}
                title="Click and drag to move panel anywhere"
            >
                <div className="flex items-center gap-1.5">
                    <GripHorizontal size={13} className="text-[var(--text-subtle)] hover:text-[var(--text-primary)]" />
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] font-semibold"
                        style={{ color: 'var(--text-primary)' }}>
                        Transmission
                    </span>
                    {!isComplete && released > 0 && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                            title="Live playback active" />
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono tabular-nums"
                        style={{ color: 'var(--text-subtle)' }}>
                        {released} / {totalTarget}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsCollapsed(!isCollapsed)
                        }}
                        className="p-0.5 rounded hover:bg-white/10 text-[var(--text-muted)] transition-colors"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    </button>
                </div>
            </div>

            {/* Live accounting content */}
            {!isCollapsed && (
                <>
                    <div className="px-3 py-2 flex flex-col gap-1 font-mono">
                        <Stat label="Generated" value={released} />
                        <Stat label="Fiber survived" color="#34d399" value={liveSurvived} />
                        <Stat label="Fiber lost" color="#64748b" value={liveLost} />
                        {(liveVacuum > 0 || transmission.vacuum_pulses > 0) && (
                            <Stat label="Vacuum pulses" color="#64748b" value={liveVacuum} />
                        )}
                        <div className="my-0.5" style={{ borderTop: '1px dashed var(--border-color)' }} />
                        <Stat label="Detected" color="#34d399" value={liveDetected} />
                        <Stat label="Detector miss" color="#94a3b8" value={liveDetectorMiss} />
                        {(liveDarkCounts > 0 || transmission.dark_counts > 0) && (
                            <Stat label="Dark counts" color="#e0e7ff" value={liveDarkCounts} />
                        )}
                        {(liveIntercepted > 0 || transmission.intercepted > 0) && (
                            <Stat label="Eve intercepted" color="#ef4444" value={liveIntercepted} />
                        )}
                        {(livePnsSplit > 0 || livePnsBlocked > 0 || transmission.pns_split > 0) && (
                            <>
                                <Stat label="PNS split" color="#fb7185" value={livePnsSplit} />
                                <Stat label="PNS blocked" color="#fb7185" value={livePnsBlocked} />
                            </>
                        )}
                        <div className="my-0.5" style={{ borderTop: '1px dashed var(--border-color)' }} />
                        <Stat label="Sifted" color="#22d3ee" value={liveSifted} />
                    </div>

                    {/* Sampling note */}
                    {isSample && (
                        <div className="px-3 py-1" style={{ borderTop: '1px solid var(--border-color)' }}>
                            <span className="text-[8px] font-mono" style={{ color: 'var(--text-subtle)' }}>
                                representative playback of N={transmission.generated}
                            </span>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    )
}
