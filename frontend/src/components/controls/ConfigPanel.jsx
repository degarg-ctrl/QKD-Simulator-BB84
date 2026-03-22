/**
 * src/components/controls/ConfigPanel.jsx
 *
 * Simulation parameter controls panel.
 * All controls write directly to Zustand store via setParams.
 * No local state — single source of truth is the store.
 *
 * Controls:
 * 1. N Bits slider        100–10000,  step 100
 * 2. Distance slider      0–150km,    step 1
 * 3. Noise Level slider   0–10%,      step 0.1%
 * 4. Attack Probability   0–100%,     step 1%
 * 5. Attack Strategy      radio/select: intercept_resend | partial | burst
 *
 * Each control has:
 * - Label with current value displayed
 * - Slider or selector input
 * - Tooltip (?) icon that shows physics explanation on hover
 */

import { useState } from 'react'
import { QuestionTooltip } from '../ui/TooltipPortal'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'

// Tooltip content — physics explanations for each parameter
const TOOLTIPS = {
  n_bits: `Number of photons Alice sends. More photons = more 
    accurate statistics but slower simulation. Minimum 100 for 
    meaningful QBER estimation. BB84 requires enough bits to 
    sacrifice a sample for error checking.`,

  distance_km: `Fiber optic cable length between Alice and Bob. 
    Longer distance = more photon loss (Beer-Lambert law). 
    At 50km, only ~10% of photons survive. At 100km, only ~1%. 
    This directly limits the Secret Key Rate.`,

  noise_level: `Background noise probability per photon slot. 
    Models thermal noise, detector imperfections, and 
    environmental interference. Even without Eve, noise 
    contributes to QBER. Values above 5% significantly 
    degrade key quality.`,

  attack_prob: `Probability Eve intercepts each photon. 
    At 100%, Eve intercepts all photons introducing ~25% QBER 
    (intercept-resend attack). At 0%, Eve is inactive. 
    BB84 security threshold: if QBER exceeds 11%, 
    the session is aborted.`,

  attack_strategy: `How Eve attacks the channel:
    • Intercept-Resend: Eve measures each photon randomly and 
      re-emits — introduces 25% QBER at full interception.
    • Partial: Eve intercepts a random fraction of photons.
    • Burst: Eve intercepts a contiguous block of photons 
      (simulates a targeted attack window).`
}



function SliderControl({ label, value, min, max, step, onChange, 
                         displayValue, tooltip }) {
  return (
    <div className="flex flex-col gap-1.5" id={`control-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-gray-400 
                           uppercase tracking-wider">
            {label}
          </span>
          <QuestionTooltip content={tooltip} />
        </div>
        <span className="text-xs font-mono text-indigo-400 
                         font-semibold">
          {displayValue}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1 bg-gray-800 rounded-full appearance-none
                     cursor-pointer accent-indigo-500
                     [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-indigo-400
                     [&::-webkit-slider-thumb]:appearance-none"
        />
      </div>
    </div>
  )
}

export default function ConfigPanel({ className = '' }) {
  const { params, setParams } = useSimulationStore()

  const strategies = [
    { value: 'intercept_resend', label: 'Intercept-Resend' },
    { value: 'partial',          label: 'Partial' },
    { value: 'burst',            label: 'Burst' },
  ]

  return (
    <div className={`flex flex-col gap-5 p-4 bg-[#11111a] 
                     border border-gray-800 rounded-lg ${className}`}>
      
      {/* Panel header */}
      <div className="flex items-center gap-2 pb-2 
                      border-b border-gray-800">
        <div className="w-2 h-2 rounded-full bg-indigo-500" />
        <span className="text-xs font-mono text-gray-400 
                         uppercase tracking-widest">
          Parameters
        </span>
      </div>

      {/* N Bits */}
      <SliderControl
        label="Photons"
        value={params.n_bits}
        min={100}
        max={10000}
        step={100}
        onChange={val => setParams({ n_bits: val })}
        displayValue={params.n_bits.toLocaleString()}
        tooltip={TOOLTIPS.n_bits}
      />

      {/* Single photon mode */}
      <div className="flex items-center justify-between 
                      py-2 border-t border-gray-800">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-gray-400 
                           uppercase tracking-wider">
            Single Photon
          </span>
          <QuestionTooltip content="Send exactly 1 photon to observe 
            the complete BB84 journey step by step. QBER estimation 
            is skipped in single photon mode." />
        </div>
        <button
          onClick={() => setParams({ 
            n_bits: params.n_bits === 1 ? 1000 : 1 
          })}
          className={`px-2 py-1 rounded text-xs font-mono
                     border transition-colors
                     ${params.n_bits === 1
                       ? 'bg-indigo-900/50 border-indigo-500 text-indigo-400'
                       : 'border-gray-800 text-gray-500 hover:text-gray-300'
                     }`}
        >
          {params.n_bits === 1 ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Distance */}
      <SliderControl
        label="Distance"
        value={params.distance_km}
        min={0}
        max={150}
        step={1}
        onChange={val => setParams({ distance_km: val })}
        displayValue={`${params.distance_km} km`}
        tooltip={TOOLTIPS.distance_km}
      />

      {/* Noise Level */}
      <SliderControl
        label="Noise"
        value={Math.round(params.noise_level * 1000) / 10}
        min={0}
        max={10}
        step={0.1}
        onChange={val => setParams({ noise_level: val / 100 })}
        displayValue={`${(params.noise_level * 100).toFixed(1)}%`}
        tooltip={TOOLTIPS.noise_level}
      />

      {/* Attack Probability */}
      <SliderControl
        label="Eve Attack"
        value={Math.round(params.attack_prob * 100)}
        min={0}
        max={100}
        step={1}
        onChange={val => setParams({ attack_prob: val / 100 })}
        displayValue={`${(params.attack_prob * 100).toFixed(0)}%`}
        tooltip={TOOLTIPS.attack_prob}
      />

      {/* Attack Strategy */}
      <div className="flex flex-col gap-1.5" id="control-strategy">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-gray-400 
                           uppercase tracking-wider">
            Strategy
          </span>
          <QuestionTooltip content={TOOLTIPS.attack_strategy} />
        </div>
        <div className="flex flex-col gap-1">
          {strategies.map(s => (
            <button
              key={s.value}
              id={`strategy-${s.value}`}
              onClick={() => setParams({ attack_strategy: s.value })}
              className={`px-3 py-1.5 rounded text-xs font-mono 
                         text-left transition-colors
                         ${params.attack_strategy === s.value
                           ? 'bg-indigo-900/50 border border-indigo-500/50 text-indigo-400'
                           : 'bg-gray-900/50 border border-gray-800 text-gray-500 hover:text-gray-300'
                         }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Security threshold warning */}
      <AnimatePresence>
        {params.attack_prob >= 0.44 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2 bg-red-950/50 border border-red-800/50 
                       rounded text-xs text-red-400 font-mono overflow-hidden"
            id="security-warning"
          >
            ⚠ Attack level may breach 11% QBER threshold
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
