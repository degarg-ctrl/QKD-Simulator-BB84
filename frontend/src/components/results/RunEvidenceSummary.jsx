import QuantumEquation from '../math/QuantumEquation'

function EvidenceCard({ label, value, note, accent = 'var(--q-text-1)' }) {
  return (
    <div className="rounded border border-[var(--q-border-subtle)] bg-[var(--q-surface-0)] p-3">
      <div className="foundation-label">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums" style={{ color: accent }}>{value}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-[var(--q-text-3)]">{note}</div>
    </div>
  )
}

export default function RunEvidenceSummary({ results, qberView }) {
  const t = results.transmission
  if (!t) return null
  const completeRecords = results.playback_stream?.length === t.generated
  const shownRecords = completeRecords
    ? results.playback_stream.length
    : (results.event_stream?.length || results.bit_stream?.length || 0)
  const sampleValue = qberView.sampleSize > 0
    ? `${qberView.sampleErrors} / ${qberView.sampleSize}`
    : 'Unavailable'

  return (
    <section className="rounded border border-[var(--q-border)] bg-[var(--q-surface-1)] p-4" aria-labelledby="run-evidence-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div id="run-evidence-title" className="foundation-label">Run evidence chain</div>
          <div className="mt-1 text-sm text-[var(--q-text-2)]">Full transmission totals, disclosed QBER sample and model output are separate quantities.</div>
        </div>
        <QuantumEquation name="qber" compact caption="QBER uses the disclosed sample, not every sifted-key error." />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <EvidenceCard label="Full simulated run" value={`${t.generated.toLocaleString()} pulses`} note={`${t.total_detections.toLocaleString()} detected · ${t.sifted.toLocaleString()} sifted`} accent="var(--q-accent)" />
        <EvidenceCard label="Inspection records" value={`${shownRecords.toLocaleString()} records`} note={completeRecords ? 'Complete identity-preserving stream' : 'Representative legacy stream; totals remain full-run'} accent="var(--q-accent-cyan)" />
        <EvidenceCard label="Disclosed QBER sample" value={sampleValue} note={qberView.estimated ? 'Official sampled error fraction' : 'Diagnostic preview; no security verdict'} accent="var(--q-warn)" />
        <EvidenceCard label="Asymptotic SKR model" value={qberView.skr == null ? 'Unavailable' : `${qberView.skr.toFixed(4)} bits/bit`} note={qberView.estimated ? 'Estimate only; EC/PA are not executed' : 'Preview only; official SKR withheld'} accent="var(--q-secure)" />
      </div>
    </section>
  )
}
