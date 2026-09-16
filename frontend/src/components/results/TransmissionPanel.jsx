/**
 * src/components/results/TransmissionPanel.jsx
 *
 * Detailed whole-simulation transmission accounting, shown in the
 * BottomPanel "Transmission" tab.
 *
 * All numbers come from the backend `transmission` object (computed
 * on the backend from the COMPLETE simulation arrays — never from the
 * truncated event_stream sample). Answers "What happened in the
 * whole simulation?" as a complement to the in-canvas HUD's
 * "What is happening right now?".
 */

const SECTIONS = [
    {
        title: 'Source',
        rows: [
            { key: 'generated', label: 'Pulses generated', color: '#38bdf8' },
            {
                key: 'vacuum_pulses', label: 'Vacuum pulses (n=0)',
                color: '#64748b', wcpOnly: true
            },
        ],
    },
    {
        title: 'Fiber',
        rows: [
            { key: 'fiber_survived', label: 'Survived fiber', color: '#34d399' },
            { key: 'fiber_lost', label: 'Lost in fiber', color: '#64748b' },
        ],
    },
    {
        title: 'Detector',
        rows: [
            { key: 'real_detections', label: 'Real detections', color: '#34d399' },
            { key: 'detector_loss', label: 'Detector misses (η)', color: '#94a3b8' },
            { key: 'dark_counts', label: 'Dark counts', color: '#e0e7ff' },
        ],
    },
    {
        title: 'Eavesdropper',
        rows: [
            { key: 'intercepted', label: 'Intercept-resend', color: '#ef4444' },
            { key: 'pns_split', label: 'PNS splits', color: '#fb7185' },
            { key: 'pns_blocked', label: 'PNS blocked', color: '#fb7185' },
            { key: 'eve_copies', label: 'Eve retained copies', color: '#fb7185' },
        ],
    },
    {
        title: 'Protocol',
        rows: [
            { key: 'noise_flipped', label: 'Noise flips', color: '#f59e0b' },
            { key: 'total_detections', label: 'Total detections', color: '#22d3ee' },
            { key: 'sifted', label: 'Sifted key entries', color: '#22d3ee' },
        ],
    },
]

export default function TransmissionPanel({ results }) {
    const t = results?.transmission
    if (!t) {
        return (
            <div className="text-xs font-mono text-[var(--text-subtle)] py-4">
                Transmission accounting unavailable (run a simulation).
            </div>
        )
    }

    const wcp = results.wcp_enabled
    const pct = (n) =>
        t.generated > 0 ? `${((n / t.generated) * 100).toFixed(1)}%` : '0%'

    // Flow bar segments (proportions of generated pulses)
    const bar = [
        { n: t.real_detections, color: '#34d399', label: 'Detected' },
        {
            n: t.sifted && t.sifted < t.real_detections
                ? t.real_detections - t.sifted : 0, color: '#22d3ee',
            label: 'Detected, unsifted'
        },
        { n: t.detector_loss, color: '#94a3b8', label: 'Detector miss' },
        { n: t.pns_blocked, color: '#fb7185', label: 'PNS blocked' },
        { n: t.fiber_lost, color: '#475569', label: 'Fiber lost' },
        { n: t.vacuum_pulses, color: '#334155', label: 'Vacuum' },
    ]

    return (
        <div className="flex flex-col gap-4 max-h-56 overflow-y-auto">

            {/* Proportional flow bar */}
            <div>
                <div className="flex h-5 w-full rounded overflow-hidden"
                    style={{ border: '1px solid var(--border-color)' }}>
                    {bar.map((seg, i) => {
                        const w = (seg.n / Math.max(1, t.generated)) * 100
                        if (w <= 0) return null
                        return (
                            <div key={i} title={`${seg.label}: ${seg.n}`}
                                style={{ width: `${w}%`, backgroundColor: seg.color }} />
                        )
                    })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                    {bar.map((seg, i) => (
                        <span key={i}
                            className="text-xs font-mono flex items-center gap-1.5"
                            style={{ color: 'var(--text-secondary)' }}>
                            <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
                                style={{ backgroundColor: seg.color }} />
                            {seg.label} {seg.n}
                        </span>
                    ))}
                </div>
            </div>

            {/* Accounting grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {SECTIONS.map((section) => (
                    <div key={section.title} className="flex flex-col gap-2 min-w-0">
                        <div className="text-xs font-mono uppercase tracking-wider font-semibold border-b border-[var(--border-color)]/40 pb-1"
                            style={{ color: 'var(--text-primary)' }}>
                            {section.title}
                        </div>
                        {section.rows
                            .filter((r) => !r.wcpOnly || wcp)
                            .map((r) => (
                                <div key={r.key}
                                    className="flex items-baseline justify-between gap-2 text-xs font-mono">
                                    <span className="text-[var(--text-muted)] truncate" title={r.label}>
                                        {r.label}
                                    </span>
                                    <span className="font-semibold tabular-nums flex-shrink-0"
                                        style={{ color: r.color }}>
                                        {t[r.key]}
                                        <span className="text-[10px] font-normal ml-1"
                                            style={{ color: 'var(--text-subtle)' }}>
                                            {pct(t[r.key])}
                                        </span>
                                    </span>
                                </div>
                            ))}
                    </div>
                ))}
            </div>

            {/* Sampling note */}
            {t.event_stream_truncated && (
                <div className="text-xs font-mono leading-relaxed pt-2 border-t border-[var(--border-color)]/30"
                    style={{ color: 'var(--text-muted)' }}>
                    Counts cover all {t.generated.toLocaleString()} simulated
                    pulses. The canvas animation plays a representative sample
                    (first 500 events by deterministic stride) — counters in the
                    HUD reflect full-simulation totals.
                </div>
            )}
        </div>
    )
}
