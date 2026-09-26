/**
 * src/components/guide/MalusLawSimulator.jsx
 *
 * Interactive polarizer angle simulator demonstrating Malus's Law and
 * quantum state projection probabilities: P = cos^2(theta_1 - theta_2).
 * Shows why matching bases give 100% transmission while mismatched bases (45 deg)
 * yield a 50% random measurement outcome.
 */

import { useState } from 'react'
import { Play, RotateCcw, Zap } from 'lucide-react'

export default function MalusLawSimulator() {
  const [theta1, setTheta1] = useState(0)   // Alice emitter angle
  const [theta2, setTheta2] = useState(45)  // Bob analyzer angle
  const [testTrials, setTestTrials] = useState(null)

  const deltaThetaRad = ((theta1 - theta2) * Math.PI) / 180
  const probPass = Math.pow(Math.cos(deltaThetaRad), 2)
  const probBlock = 1 - probPass

  const runSample = () => {
    const N = 20
    let passed = 0
    for (let i = 0; i < N; i++) {
      if (Math.random() < probPass) passed++
    }
    setTestTrials({
      total: N,
      passed,
      blocked: N - passed,
      empiricalRate: (passed / N) * 100,
    })
  }

  return (
    <div className="w-full rounded border border-[var(--q-border)] bg-[var(--q-surface-1)] p-4 select-none my-6">
      <div className="flex items-center justify-between border-b border-[var(--q-border)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--q-accent)]" />
          <span className="text-xs font-body font-semibold text-[var(--q-text-1)] uppercase tracking-wider">
            Malus's Law & Single-Photon Projection Simulator
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--q-surface-2)] text-[var(--q-text-3)] border border-[var(--q-border)]">
            P = cos²(θ₁ - θ₂)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Polarizer Schematic */}
        <div className="flex items-center justify-around p-4 rounded border border-[var(--q-border)] bg-[var(--q-surface-0)]">
          {/* Emitter Filter */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-body uppercase tracking-wider font-semibold text-[var(--q-text-3)]">Alice Filter (θ₁)</span>
            <div className="w-20 h-20 rounded-full border-2 border-[var(--q-alice)] flex items-center justify-center relative bg-[var(--q-surface-2)]">
              <div
                className="w-16 h-[2px] bg-[var(--q-alice)] transition-transform duration-100"
                style={{ transform: `rotate(-${theta1}deg)` }}
              />
              <span className="absolute bottom-1 text-[10px] font-mono font-bold text-[var(--q-alice)]">
                {theta1}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={180}
              step={5}
              value={theta1}
              onChange={(e) => setTheta1(Number(e.target.value))}
              className="w-24 accent-[var(--q-alice)]"
            />
          </div>

          <div className="flex flex-col items-center gap-1 text-center font-body">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--q-text-4)]">ANGULAR DELTA</span>
            <span className="text-base font-mono tabular-nums font-bold text-[var(--q-text-1)]">
              Δθ = {Math.abs(theta1 - theta2)}°
            </span>
            <span className="text-[10px] font-body text-[var(--q-text-3)]">
              {Math.abs(theta1 - theta2) === 0
                ? 'Identical Basis (P=100%)'
                : Math.abs(theta1 - theta2) === 45 || Math.abs(theta1 - theta2) === 135
                ? 'Incompatible Basis (P=50%)'
                : Math.abs(theta1 - theta2) === 90
                ? 'Orthogonal Basis (P=0%)'
                : 'Arbitrary Angle'}
            </span>
          </div>

          {/* Detector Filter */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-body uppercase tracking-wider font-semibold text-[var(--q-text-3)]">Bob Filter (θ₂)</span>
            <div className="w-20 h-20 rounded-full border-2 border-[#c084fc] flex items-center justify-center relative bg-[var(--q-surface-2)]">
              <div
                className="w-16 h-[2px] bg-[#c084fc] transition-transform duration-100"
                style={{ transform: `rotate(-${theta2}deg)` }}
              />
              <span className="absolute bottom-1 text-[10px] font-mono font-bold text-[#c084fc]">
                {theta2}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={180}
              step={5}
              value={theta2}
              onChange={(e) => setTheta2(Number(e.target.value))}
              className="w-24 accent-[#c084fc]"
            />
          </div>
        </div>

        {/* Probability & Single-Photon Stats */}
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded bg-[var(--q-surface-2)] border border-[var(--q-border)] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-body">
              <span className="text-[var(--q-text-3)]">Theoretical Transmission Probability:</span>
              <span className="font-bold font-mono tabular-nums text-[var(--q-secure)]">{(probPass * 100).toFixed(1)}%</span>
            </div>

            <div className="w-full h-2 rounded bg-[var(--q-surface-0)] border border-[var(--q-border-subtle)] overflow-hidden flex">
              <div
                className="h-full bg-[var(--q-secure)] transition-all duration-150"
                style={{ width: `${probPass * 100}%` }}
              />
              <div
                className="h-full bg-[var(--q-danger)] transition-all duration-150"
                style={{ width: `${probBlock * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-body text-[var(--q-text-4)]">
              <span>Pass: <span className="font-mono tabular-nums">{(probPass * 100).toFixed(1)}%</span></span>
              <span>Absorbed / Extinguished: <span className="font-mono tabular-nums">{(probBlock * 100).toFixed(1)}%</span></span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={runSample}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-body font-semibold bg-[var(--q-accent)] text-[#131317] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Zap size={13} fill="currentColor" /> Fire 20 Sample Photons
            </button>
            <button
              onClick={() => { setTheta1(0); setTheta2(0); setTestTrials(null) }}
              className="px-2.5 py-1.5 rounded text-xs border border-[var(--q-border)] bg-[var(--q-surface-2)] text-[var(--q-text-3)] hover:text-[var(--q-text-1)]"
              title="Reset to 0° alignment"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {testTrials && (
            <div className="p-2.5 rounded bg-[var(--q-surface-0)] border border-[var(--q-border)] text-xs font-body flex items-center justify-between">
              <span>Sampled N=<span className="font-mono tabular-nums">20</span>:</span>
              <span className="text-[var(--q-secure)]"><b className="font-mono tabular-nums">{testTrials.passed}</b> Clicked</span>
              <span className="text-[var(--q-danger)]"><b className="font-mono tabular-nums">{testTrials.blocked}</b> Blocked</span>
              <span>Empirical: <b className="font-mono tabular-nums">{testTrials.empiricalRate.toFixed(0)}%</b></span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
