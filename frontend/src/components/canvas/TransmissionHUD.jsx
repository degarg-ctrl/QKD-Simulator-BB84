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
            <span className="text-xs uppercase tracking-wider"
                style={{ color: dim ? 'var(--text-subtle)' : 'var(--text-muted)' }}>
                {label}
            </span>
            <span className="text-xs font-semibold font-mono tabular-nums"
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
            className="absolute bottom-4 left-4 z-20 pointer-events-auto rounded overflow-hidden select-none shadow-xl"
            style={{
                backgroundColor: 'var(--q-surface-1, #1a1a1e)',
                border: '1px solid var(--q-border, #34343d)',
                minWidth: 260,
            }}
        >
            {/* Draggable Header */}
            <div
                className="px-3.5 pt-2.5 pb-2 flex items-center justify-between cursor-move"
                style={{
                    borderBottom: '1px solid var(--q-border-subtle, #282830)',
                    backgroundColor: 'var(--q-surface-2, #222227)',
                }}
                title="Click and drag to move panel anywhere"
            >
                <div className="flex items-center gap-2">
                    <GripHorizontal size={14} className="text-[var(--q-text-dim,#64748b)] hover:text-[var(--q-text-bright,#f1f5f9)]" />
                    <span className="text-xs font-body uppercase tracking-wider font-semibold text-[var(--q-text-bright,#f1f5f9)]">
                        Transmission
                    </span>
                    {!isComplete && released > 0 && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: 'var(--q-accent-emerald, #10b981)' }}
                            title="Live playback active" />
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono tabular-nums text-[var(--q-text-dim,#64748b)]">
                        {released} / {totalTarget}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsCollapsed(!isCollapsed)
                        }}
                        className="p-1 rounded hover:bg-white/5 text-[var(--q-text-muted,#94a3b8)] transition-colors"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                </div>
            </div>

            {/* Live accounting content */}
            {!isCollapsed && (
                <>
                    <div className="px-3.5 py-2.5 flex flex-col gap-1.5 font-body text-xs">
                        <Stat label="Generated" value={released} />
                        <Stat label="Fiber survived" color="var(--q-accent-emerald, #10b981)" value={liveSurvived} />
                        <Stat label="Fiber lost" color="var(--q-text-dim, #64748b)" value={liveLost} />
                        {(liveVacuum > 0 || transmission.vacuum_pulses > 0) && (
                            <Stat label="Vacuum pulses" color="var(--q-text-dim, #64748b)" value={liveVacuum} />
                        )}
                        <div className="my-1" style={{ borderTop: '1px dashed var(--q-border-subtle, #282830)' }} />
                        <Stat label="Detected" color="var(--q-accent-emerald, #10b981)" value={liveDetected} />
                        <Stat label="Detector miss" color="var(--q-text-muted, #94a3b8)" value={liveDetectorMiss} />
                        {(liveDarkCounts > 0 || transmission.dark_counts > 0) && (
                            <Stat label="Dark counts" color="var(--q-text-dim, #64748b)" value={liveDarkCounts} />
                        )}
                        {(liveIntercepted > 0 || transmission.intercepted > 0) && (
                            <Stat label="Eve intercepted" color="var(--q-accent-crimson, #e05252)" value={liveIntercepted} />
                        )}
                        {(livePnsSplit > 0 || livePnsBlocked > 0 || transmission.pns_split > 0) && (
                            <>
                                <Stat label="PNS split" color="var(--q-accent-amber, #f59e0b)" value={livePnsSplit} />
                                <Stat label="PNS blocked" color="var(--q-accent-crimson, #e05252)" value={livePnsBlocked} />
                            </>
                        )}
                        <div className="my-1" style={{ borderTop: '1px dashed var(--q-border-subtle, #282830)' }} />
                        <Stat label="Sifted" color="var(--q-accent-cyan, #38bdf8)" value={liveSifted} />
                    </div>

                    {/* Sampling note */}
                    {isSample && (
                        <div className="px-3.5 py-1.5" style={{ borderTop: '1px solid var(--q-border-subtle, #282830)' }}>
                            <span className="text-[11px] font-body leading-normal text-[var(--q-text-dim,#64748b)]">
                                representative playback of N=<span className="font-mono tabular-nums">{transmission.generated}</span>
                            </span>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    )
}
