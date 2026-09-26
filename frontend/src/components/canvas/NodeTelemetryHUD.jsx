/**
 * src/components/canvas/NodeTelemetryHUD.jsx
 *
 * Laboratory Optical Bench Telemetry Overlay for the Quantum Canvas.
 * Displays physical hardware instrumentation specs and real-time state
 * for Alice Transmitter, Fiber Channel, Bob Receiver, and Eve Tap.
 *
 * Adheres to Precision Optics Bench design tokens:
 * - Neutral matte surfaces
 * - Crisp 1px mechanical borders
 * - High-contrast monospace telemetry
 * - Zero artificial glow/gradient effects
 */

import { useState } from 'react'
import { Activity, Radio, Cpu, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'
import useSimulationStore from '../../store/simulationStore'

export default function NodeTelemetryHUD() {
  const [isOpen, setIsOpen] = useState(false)
  const distanceKm = useSimulationStore((s) => s.params.distance_km || 0)
  const wcpEnabled = useSimulationStore((s) => s.params.wcp_enabled)

  return (
    <div className="absolute top-4 left-4 z-20 pointer-events-auto flex flex-col items-start gap-1 font-body select-none">
      {/* HUD Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors"
        style={{
          backgroundColor: 'var(--q-surface-1, #1a1a1e)',
          border: '1px solid var(--q-border, #34343d)',
          color: 'var(--q-text-muted, #94a3b8)',
        }}
        title="Toggle Laboratory Hardware Telemetry"
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--q-accent-cyan, #38bdf8)' }} />
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--q-text-bright,#f1f5f9)]">
          HARDWARE TELEMETRY
        </span>
        <span className="text-[10px] font-mono tabular-nums text-[var(--q-text-dim,#64748b)]">
          [{distanceKm} km · {wcpEnabled ? 'WCP' : 'SPS'}]
        </span>
        {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {/* Expanded Instrumentation Panel (subscribes only when open) */}
      {isOpen && <ExpandedTelemetryPanel distanceKm={distanceKm} />}
    </div>
  )
}

function ExpandedTelemetryPanel({ distanceKm }) {
  const params = useSimulationStore((s) => s.params)
  const activeReadout = useSimulationStore((s) => s.animation.activeReadout)

  const alphaDbPerKm = 0.2 // Standard telecom fiber attenuation
  const channelLossDb = (alphaDbPerKm * distanceKm).toFixed(1)
  const channelTransmittance = (Math.pow(10, -alphaDbPerKm * distanceKm / 10) * 100).toFixed(1)

  const alice = activeReadout?.alice
  const bob = activeReadout?.bob
  const hasEve = (params.attack_prob || 0) > 0

  return (
        <div
          className="rounded p-3 flex flex-col gap-3 shadow-xl max-w-xl text-xs"
          style={{
            backgroundColor: 'var(--q-surface-1, #1a1a1e)',
            border: '1px solid var(--q-border, #34343d)',
            minWidth: 420,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--q-border-subtle, #282830)' }}>
            <span className="text-[10px] uppercase tracking-widest text-[var(--q-text-dim,#64748b)] font-semibold flex items-center gap-1.5">
              <Activity size={12} className="text-[var(--q-accent-cyan,#38bdf8)]" />
              BENCH CALIBRATION & HARDWARE METRICS
            </span>
            <span className="text-[10px] text-[var(--q-text-dim,#64748b)]">
              λ = 1550 nm (C-BAND)
            </span>
          </div>

          {/* Grid of hardware stages */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Alice Transmitter */}
            <div
              className="p-2.5 rounded flex flex-col gap-1.5"
              style={{ backgroundColor: 'var(--q-surface-0, #131317)', border: '1px solid var(--q-border-subtle, #282830)' }}
            >
              <div className="flex items-center gap-1.5 text-[var(--q-accent-cyan,#38bdf8)] font-semibold text-[11px]">
                <Radio size={12} />
                <span>TX: ALICE</span>
              </div>
              <div className="text-[10px] text-[var(--q-text-dim,#64748b)] flex flex-col gap-0.5">
                <div>Type: <span className="text-[var(--q-text-muted,#94a3b8)]">{params.wcp_enabled ? 'Weak Coherent' : 'Ideal Single-Photon'}</span></div>
                {params.wcp_enabled && (
                  <div>μ: <span className="text-[var(--q-text-bright,#f1f5f9)]">{params.mean_photon_number || 0.2} phot/pulse</span></div>
                )}
                <div>Modulation: <span className="text-[var(--q-text-muted,#94a3b8)]">Pockels Cell</span></div>
              </div>
              {alice?.basis && (
                <div className="mt-1 pt-1 border-t border-[var(--q-border-subtle,#282830)] text-[10px]">
                  <span className="text-[var(--q-text-dim,#64748b)]">Pulse: </span>
                  <span className="font-semibold text-[var(--q-accent-cyan,#38bdf8)]">
                    Bit {alice.bit} [{alice.basis}] {alice.label}
                  </span>
                </div>
              )}
            </div>

            {/* Quantum Channel */}
            <div
              className="p-2.5 rounded flex flex-col gap-1.5"
              style={{ backgroundColor: 'var(--q-surface-0, #131317)', border: '1px solid var(--q-border-subtle, #282830)' }}
            >
              <div className="flex items-center gap-1.5 text-[var(--q-text-bright,#f1f5f9)] font-semibold text-[11px]">
                <Activity size={12} />
                <span>CHANNEL: SMF-28</span>
              </div>
              <div className="text-[10px] text-[var(--q-text-dim,#64748b)] flex flex-col gap-0.5">
                <div>Length: <span className="text-[var(--q-text-bright,#f1f5f9)]">{distanceKm} km</span></div>
                <div>Atten: <span className="text-[var(--q-text-muted,#94a3b8)]">{channelLossDb} dB</span> (0.2 dB/km)</div>
                <div>Transmittance: <span className="text-[var(--q-text-bright,#f1f5f9)]">{channelTransmittance}%</span></div>
              </div>
              {params.noise_level > 0 && (
                <div className="mt-1 pt-1 border-t border-[var(--q-border-subtle,#282830)] text-[10px]">
                  <span className="text-[var(--q-text-dim,#64748b)]">Depolarization: </span>
                  <span className="text-[var(--q-accent-amber,#f59e0b)]">{(params.noise_level * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>

            {/* Bob Receiver */}
            <div
              className="p-2.5 rounded flex flex-col gap-1.5"
              style={{ backgroundColor: 'var(--q-surface-0, #131317)', border: '1px solid var(--q-border-subtle, #282830)' }}
            >
              <div className="flex items-center gap-1.5 text-[var(--q-accent-emerald,#10b981)] font-semibold text-[11px]">
                <Cpu size={12} />
                <span>RX: BOB</span>
              </div>
              <div className="text-[10px] text-[var(--q-text-dim,#64748b)] flex flex-col gap-0.5">
                <div>Sensor: <span className="text-[var(--q-text-muted,#94a3b8)]">InGaAs SPAD</span></div>
                <div>Efficiency: <span className="text-[var(--q-text-bright,#f1f5f9)]">η = 85%</span></div>
                <div>Dark count: <span className="text-[var(--q-text-muted,#94a3b8)]">10⁻⁵ / gate</span></div>
              </div>
              {bob?.basis && (
                <div className="mt-1 pt-1 border-t border-[var(--q-border-subtle,#282830)] text-[10px]">
                  <span className="text-[var(--q-text-dim,#64748b)]">Basis: </span>
                  <span className="font-semibold text-[var(--q-accent-violet,#c084fc)]">
                    [{bob.basis}] {bob.match ? '✓ MATCH' : '✗ DISCARD'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Eve Tap Row if configured */}
          {hasEve && (
            <div
              className="p-2 rounded flex items-center justify-between text-[11px]"
              style={{
                backgroundColor: 'rgba(224, 82, 82, 0.08)',
                border: '1px solid rgba(224, 82, 82, 0.3)',
              }}
            >
              <div className="flex items-center gap-2 text-[var(--q-accent-crimson,#e05252)]">
                <ShieldAlert size={14} />
                <span className="font-semibold uppercase tracking-wider text-[10px]">
                  OPTICAL TAP ACTIVE: {params.attack_strategy === 'pns' ? 'PNS ATTACK' : 'INTERCEPT-RESEND'}
                </span>
              </div>
              <div className="text-[10px] text-[var(--q-text-dim,#64748b)]">
                Sampling Rate: <span className="font-semibold text-[var(--q-accent-crimson,#e05252)]">{(params.attack_prob * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
  )
}
