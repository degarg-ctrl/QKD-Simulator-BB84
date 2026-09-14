/**
 * src/components/canvas/TransmissionHUD.jsx
 *
 * Compact transmission HUD rendered INSIDE the main Quantum Canvas.
 *
 * Answers "What is happening right now?" — shows PLAYBACK counters
 * (events released/completed so far in the animation) side by side
 * with the FULL-SIMULATION totals from the backend `transmission`
 * accounting (which is authoritative and complete even when the
 * event stream is a representative sample).
 *
 * The HUD is NOT a draggable window: it is anchored bottom-left in
 * the canvas, pointer-events disabled, monospace, minimal footprint.
 */

import { useEffect, useState } from 'react'
import useSimulationStore from '../../store/simulationStore'

// Poll interval for counter refresh (ms). 10 Hz is smooth enough for
// counting numbers while staying cheap.
const POLL_MS = 100

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

    // Poll the animation counters ref (mutated by the rAF loop)
    useEffect(() => {
        if (!countersRef) return
        const id = setInterval(() => {
            setCounters({ ...countersRef.current })
        }, POLL_MS)
        return () => clearInterval(id)
    }, [countersRef])

    const transmission = results?.transmission
    if (!transmission) return null

    const released = counters?.released ?? 0
    const sampled = results.event_stream?.length ?? 0
    const isSample = transmission.event_stream_truncated

    return (
        <div
            className="absolute bottom-3 left-3 pointer-events-none
                 rounded-lg overflow-hidden select-none"
            style={{
                backgroundColor: 'color-mix(in srgb, var(--panel-bg) 88%, transparent)',
                border: '1px solid var(--border-color)',
                backdropFilter: 'blur(4px)',
                minWidth: 190,
            }}
        >
            {/* Header */}
            <div className="px-3 pt-2 pb-1.5 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border-color)' }}>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em]"
                    style={{ color: 'var(--text-muted)' }}>
                    Transmission
                </span>
                <span className="text-[9px] font-mono tabular-nums"
                    style={{ color: 'var(--text-subtle)' }}>
                    {isSample
                        ? `${released} / ${sampled} shown`
                        : `${released} / ${transmission.generated}`}
                </span>
            </div>

            {/* Full-simulation accounting (backend authority) */}
            <div className="px-3 py-2 flex flex-col gap-1 font-mono">
                <Stat label="Generated"
                    value={transmission.generated} />
                <Stat label="Fiber survived" color="#34d399"
                    value={transmission.fiber_survived} />
                <Stat label="Fiber lost" color="#64748b"
                    value={transmission.fiber_lost} />
                {transmission.vacuum_pulses > 0 && (
                    <Stat label="Vacuum pulses" color="#64748b"
                        value={transmission.vacuum_pulses} />
                )}
                <div className="my-0.5"
                    style={{ borderTop: '1px dashed var(--border-color)' }} />
                <Stat label="Detected" color="#34d399"
                    value={transmission.real_detections} />
                <Stat label="Detector miss" color="#94a3b8"
                    value={transmission.detector_loss} />
                {transmission.dark_counts > 0 && (
                    <Stat label="Dark counts" color="#e0e7ff"
                        value={transmission.dark_counts} />
                )}
                {transmission.intercepted > 0 && (
                    <Stat label="Eve intercepted" color="#ef4444"
                        value={transmission.intercepted} />
                )}
                {(transmission.pns_split > 0 || transmission.pns_blocked > 0) && (
                    <>
                        <Stat label="PNS split" color="#fb7185"
                            value={transmission.pns_split} />
                        <Stat label="PNS blocked" color="#fb7185"
                            value={transmission.pns_blocked} />
                    </>
                )}
                <div className="my-0.5"
                    style={{ borderTop: '1px dashed var(--border-color)' }} />
                <Stat label="Sifted" color="#22d3ee"
                    value={transmission.sifted} />
            </div>

            {/* Sampling note */}
            {isSample && (
                <div className="px-3 py-1"
                    style={{ borderTop: '1px solid var(--border-color)' }}>
                    <span className="text-[8px] font-mono"
                        style={{ color: 'var(--text-subtle)' }}>
                        representative playback of N={transmission.generated}
                    </span>
                </div>
            )}
        </div>
    )
}
