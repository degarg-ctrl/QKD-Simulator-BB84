/**
 * src/components/guide/InteractiveBB84Stepper.jsx
 *
 * Hands-on step-by-step interactive BB84 protocol demonstration for the Guide page.
 * Allows students to step through the entire protocol:
 * 1. Alice Bit/Basis generation
 * 2. Polarization Encoding
 * 3. Channel Transit & Eve Interception
 * 4. Bob Measurement
 * 5. Public Sifting
 * 6. QBER Calculation & Security Threshold Verdict
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, RotateCcw, ArrowRight, ShieldCheck, ShieldAlert, Check, X, RefreshCw } from 'lucide-react'

const DEFAULT_PULSES = [
  { id: 1, aliceBit: 0, aliceBasis: '+', eveAttack: false, bobBasis: '+', state: '|0⟩', angle: 0 },
  { id: 2, aliceBit: 1, aliceBasis: '+', eveAttack: false, bobBasis: 'x', state: '|1⟩', angle: 90 },
  { id: 3, aliceBit: 0, aliceBasis: 'x', eveAttack: true,  bobBasis: 'x', state: '|+⟩', angle: 45 },
  { id: 4, aliceBit: 1, aliceBasis: 'x', eveAttack: false, bobBasis: '+', state: '|-⟩', angle: 135 },
  { id: 5, aliceBit: 1, aliceBasis: '+', eveAttack: true,  bobBasis: '+', state: '|1⟩', angle: 90 },
  { id: 6, aliceBit: 0, aliceBasis: '+', eveAttack: false, bobBasis: '+', state: '|0⟩', angle: 0 },
]

export default function InteractiveBB84Stepper() {
  const [currentStep, setCurrentStep] = useState(1) // 1 to 6
  const [pulses, setPulses] = useState(DEFAULT_PULSES)
  const [eveEnabled, _setEveEnabled] = useState(true)

  const randomizePulses = () => {
    const newPulses = Array.from({ length: 6 }, (_, i) => {
      const bit = Math.random() < 0.5 ? 0 : 1
      const basis = Math.random() < 0.5 ? '+' : 'x'
      const bobB = Math.random() < 0.5 ? '+' : 'x'
      const attack = eveEnabled ? Math.random() < 0.5 : false

      let state, angle
      if (basis === '+') {
        state = bit === 0 ? '|0⟩' : '|1⟩'
        angle = bit === 0 ? 0 : 90
      } else {
        state = bit === 0 ? '|+⟩' : '|-⟩'
        angle = bit === 0 ? 45 : 135
      }

      // Compute Bob measured bit
      let bobBit = bit
      let disturbed = false
      if (attack) {
        const eveB = Math.random() < 0.5 ? '+' : 'x'
        if (eveB !== basis) {
          // 50% chance bit gets flipped
          if (Math.random() < 0.5) {
            disturbed = true
            bobBit = 1 - bit
          }
        }
      } else if (bobB !== basis) {
        bobBit = Math.random() < 0.5 ? 0 : 1
      }

      return {
        id: i + 1,
        aliceBit: bit,
        aliceBasis: basis,
        eveAttack: attack,
        bobBasis: bobB,
        bobBit,
        state,
        angle,
        disturbed,
      }
    })
    setPulses(newPulses)
  }

  // Sifting analysis
  const matchingPulses = pulses.filter(p => p.aliceBasis === p.bobBasis)
  const errorPulses = matchingPulses.filter(p => p.aliceBit !== p.bobBit)
  const qber = matchingPulses.length > 0 ? (errorPulses.length / matchingPulses.length) * 100 : 0
  const isSecure = qber < 11.0

  const STEPS_NAV = [
    { num: 1, title: 'Bit & Basis Prep' },
    { num: 2, title: 'State Polarization' },
    { num: 3, title: 'Eavesdropping' },
    { num: 4, title: 'Bob Measurement' },
    { num: 5, title: 'Public Sifting' },
    { num: 6, title: 'Security Verdict' },
  ]

  return (
    <div className="w-full rounded border border-[var(--q-border)] bg-[var(--q-surface-1)] p-4 select-none my-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--q-border)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--q-accent)]" />
          <span className="text-xs font-body font-semibold text-[var(--q-text-1)] uppercase tracking-wider">
            Interactive BB84 Protocol Stepper
          </span>
          <span className="text-[10px] font-body font-semibold px-1.5 py-0.5 rounded bg-[var(--q-surface-2)] text-[var(--q-text-3)] border border-[var(--q-border)]">
            PHASE <span className="font-mono tabular-nums">{currentStep}</span> OF 6
          </span>
        </div>

        <button
          onClick={randomizePulses}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-body font-medium border border-[var(--q-border)] bg-[var(--q-surface-2)] text-[var(--q-text-2)] hover:text-[var(--q-text-1)] hover:bg-[var(--q-surface-active)] transition-colors"
        >
          <RefreshCw size={11} /> Generate New Pulse Train
        </button>
      </div>

      {/* Stepper Progress Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5 mb-4">
        {STEPS_NAV.map(s => {
          const isActive = currentStep === s.num
          const isPassed = currentStep > s.num
          return (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-body border transition-all text-left ${
                isActive
                  ? 'bg-[var(--q-surface-active)] border-[var(--q-accent)] text-[var(--q-text-1)] font-bold'
                  : isPassed
                  ? 'bg-[var(--q-surface-2)] border-[var(--q-border)] text-[var(--q-text-2)]'
                  : 'bg-[var(--q-surface-0)] border-[var(--q-border-subtle)] text-[var(--q-text-4)]'
              }`}
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-mono tabular-nums ${isActive ? 'bg-[var(--q-accent)] text-[#131317]' : 'bg-[var(--q-surface-0)] text-[var(--q-text-3)]'}`}>
                {s.num}
              </span>
              <span className="truncate">{s.title}</span>
            </button>
          )
        })}
      </div>

      {/* Active Phase Explanation Box */}
      <div className="p-3 rounded bg-[var(--q-surface-2)] border border-[var(--q-border)] mb-4 text-xs">
        {currentStep === 1 && (
          <p className="text-[var(--q-text-2)]">
            <b>Phase 1:</b> Alice uses a hardware random number generator to select a secret random bit ($0$ or $1$) and a random polarization basis ($+$ Rectilinear or $\times$ Diagonal) for each pulse.
          </p>
        )}
        {currentStep === 2 && (
          <p className="text-[var(--q-text-2)]">
            <b>Phase 2:</b> Alice encodes each bit into an optical polarization angle:
            <span className="text-cyan-400 ml-1">Rectilinear: 0° for bit 0 (|0⟩), 90° for bit 1 (|1⟩)</span>.
            <span className="text-fuchsia-400 ml-1">Diagonal: 45° for bit 0 (|+⟩), 135° for bit 1 (|-⟩)</span>.
          </p>
        )}
        {currentStep === 3 && (
          <p className="text-[var(--q-text-2)]">
            <b>Phase 3:</b> Photons travel through the optical channel. When Eve is active, she intercepts and measures the photons. Due to the No-Cloning Theorem, she cannot clone unmeasured states; measuring in a different basis collapses the quantum state!
          </p>
        )}
        {currentStep === 4 && (
          <p className="text-[var(--q-text-2)]">
            <b>Phase 4:</b> Bob chooses a random basis ($+$ or $\times$) and measures the incoming photon. When his basis matches Alice’s, he deterministically reads her bit (unless Eve disturbed it).
          </p>
        )}
        {currentStep === 5 && (
          <p className="text-[var(--q-text-2)]">
            <b>Phase 5: Public Basis Sifting.</b> Alice and Bob publicly announce their basis choices (never their bits!). Mismatched bases are discarded. The remaining matching pulses form the <b>sifted key</b>.
          </p>
        )}
        {currentStep === 6 && (
          <p className="text-[var(--q-text-2)]">
            <b>Phase 6: Security Verdict & Error Rate.</b> Alice and Bob compare a test sample of their sifted bits to estimate the Quantum Bit Error Rate (QBER). If QBER &ge; 11.0%, the session is immediately aborted!
          </p>
        )}
      </div>

      {/* Interactive Pulse Stream Table */}
      <div className="overflow-x-auto rounded border border-[var(--q-border)] bg-[var(--q-surface-0)] mb-4">
        <table className="w-full text-xs font-mono text-left">
          <thead className="bg-[var(--q-surface-2)] border-b border-[var(--q-border)] text-[var(--q-text-3)] text-[10px] uppercase">
            <tr>
              <th className="p-2">Pulse #</th>
              <th className="p-2">Alice Bit</th>
              <th className="p-2">Alice Basis</th>
              {currentStep >= 2 && <th className="p-2">State Vector</th>}
              {currentStep >= 3 && <th className="p-2">Eve Intercept?</th>}
              {currentStep >= 4 && <th className="p-2">Bob Basis</th>}
              {currentStep >= 4 && <th className="p-2">Bob Meas.</th>}
              {currentStep >= 5 && <th className="p-2">Basis Match?</th>}
              {currentStep >= 6 && <th className="p-2">Sifted Bit</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--q-border-subtle)]">
            {pulses.map(p => {
              const match = p.aliceBasis === p.bobBasis
              const isDiscarded = currentStep >= 5 && !match
              const hasError = match && p.aliceBit !== p.bobBit

              return (
                <tr
                  key={p.id}
                  className={`transition-colors ${
                    isDiscarded ? 'opacity-35 line-through bg-black/20' : 'hover:bg-[var(--q-surface-active)]'
                  }`}
                >
                  <td className="p-2 text-[var(--q-text-3)]">#{p.id}</td>
                  <td className="p-2 font-bold text-[var(--q-text-1)]">{p.aliceBit}</td>
                  <td className="p-2 font-bold" style={{ color: p.aliceBasis === '+' ? '#00e5ff' : '#d946ef' }}>
                    {p.aliceBasis}
                  </td>
                  {currentStep >= 2 && (
                    <td className="p-2 font-bold" style={{ color: p.aliceBasis === '+' ? '#00e5ff' : '#d946ef' }}>
                      {p.state} ({p.angle}°)
                    </td>
                  )}
                  {currentStep >= 3 && (
                    <td className="p-2">
                      {p.eveAttack ? (
                        <span className="text-[var(--q-warn)] font-bold">YES (Tap)</span>
                      ) : (
                        <span className="text-[var(--q-text-4)]">None</span>
                      )}
                    </td>
                  )}
                  {currentStep >= 4 && (
                    <td className="p-2 font-bold" style={{ color: p.bobBasis === '+' ? '#00e5ff' : '#d946ef' }}>
                      {p.bobBasis}
                    </td>
                  )}
                  {currentStep >= 4 && (
                    <td className="p-2 font-bold text-[var(--q-text-1)]">
                      {p.bobBit}
                    </td>
                  )}
                  {currentStep >= 5 && (
                    <td className="p-2">
                      {match ? (
                        <span className="text-[var(--q-secure)] font-bold flex items-center gap-1">
                          <Check size={12} /> MATCH
                        </span>
                      ) : (
                        <span className="text-[var(--q-text-4)] flex items-center gap-1">
                          <X size={12} /> DISCARD
                        </span>
                      )}
                    </td>
                  )}
                  {currentStep >= 6 && (
                    <td className="p-2">
                      {match ? (
                        hasError ? (
                          <span className="text-[var(--q-danger)] font-bold">
                            {p.bobBit} (ERROR!)
                          </span>
                        ) : (
                          <span className="text-[var(--q-secure)] font-bold">
                            {p.bobBit} (OK)
                          </span>
                        )
                      ) : (
                        <span className="text-[var(--q-text-4)]">—</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Stepper Navigation Footer & Statistics */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--q-border)]">
        {currentStep === 6 ? (
          <div className="flex items-center gap-4 text-xs font-body">
            <span>Sifted Pulses: <b className="font-mono tabular-nums">{matchingPulses.length} / {pulses.length}</b></span>
            <span>Errors: <b className="font-mono tabular-nums">{errorPulses.length}</b></span>
            <span>QBER: <b className="font-mono tabular-nums" style={{ color: isSecure ? 'var(--q-secure)' : 'var(--q-danger)' }}>{qber.toFixed(1)}%</b></span>
            <span
              className="px-2 py-0.5 rounded font-body font-bold text-[11px] border"
              style={{
                backgroundColor: isSecure ? 'rgba(16, 185, 129, 0.1)' : 'rgba(224, 82, 82, 0.1)',
                borderColor: isSecure ? 'var(--q-secure)' : 'var(--q-danger)',
                color: isSecure ? 'var(--q-secure)' : 'var(--q-danger)',
              }}
            >
              {isSecure ? 'SECURE SESSION (< 11%)' : 'COMPROMISED SESSION (ABORTED)'}
            </span>
          </div>
        ) : (
          <div className="text-xs font-body text-[var(--q-text-3)]">
            Click 'Next Phase' to observe how the protocol advances.
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
              className="px-3 py-1 rounded text-xs font-body font-medium border border-[var(--q-border)] bg-[var(--q-surface-2)] text-[var(--q-text-2)] hover:text-[var(--q-text-1)]"
            >
              Previous
            </button>
          )}

          {currentStep < 6 ? (
            <button
              onClick={() => setCurrentStep(s => Math.min(6, s + 1))}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-body font-semibold bg-[var(--q-accent)] text-[#131317] hover:brightness-110 active:scale-95 transition-all"
            >
              Next Phase <ArrowRight size={12} />
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-body font-medium border border-[var(--q-border)] bg-[var(--q-surface-2)] text-[var(--q-text-2)] hover:text-[var(--q-text-1)]"
            >
              <RotateCcw size={11} /> Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
