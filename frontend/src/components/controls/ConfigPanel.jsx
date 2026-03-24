/**
 * src/components/controls/ConfigPanel.jsx
 *
 * Simulation parameter controls panel.
 * All controls write directly to Zustand store via setParams.
 * No local state — single source of truth is the store.
 */

import { useState } from 'react'
import { QuestionTooltip } from '../ui/TooltipPortal'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'
import EditableValue from '../ui/EditableValue'

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

function SliderControl({ label, value, min, max, step,
                         onChange, displayValue, 
                         tooltip, suffix = '' }) {
  return (
    <div className="flex flex-col gap-1.5" id={`control-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-[var(--text-muted)] 
                           uppercase tracking-wider">
            {label}
          </span>
          <QuestionTooltip content={tooltip} />
        </div>
        <EditableValue
          value={displayValue}
          numericValue={value}
          min={min}
          max={max}
          step={step}
          onChange={onChange}
          suffix={suffix}
          color="#00aacc"
        />
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-1 bg-[var(--panel-dark)]/20 rounded-full appearance-none
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
  const { params, setParams, syncMode, setSyncMode, sourceModel, setSourceModel } = useSimulationStore()

  const strategies = [
    { value: 'intercept_resend', label: 'Intercept-Resend' },
    { value: 'partial_intercept', label: 'Partial Intercept' },
    { value: 'burst_attack', label: 'Burst Attack' },
    ...(sourceModel === 'realistic' ? [
      { value: 'pns', label: 'PNS Attack' }
    ] : []),
  ]

  return (
    <div className={`flex flex-col gap-5 p-4 rounded-lg ${className}`}
         style={{
           backgroundColor: 'var(--panel-bg)',
           border: '1px solid var(--border-color)'
         }}>
      
      {/* Panel header */}
      <div className="flex items-center gap-2 pb-2 
                      border-b border-[var(--border-color)]">
        <div className="w-2 h-2 rounded-full bg-indigo-500" />
        <span className="text-xs font-mono text-[var(--text-muted)] 
                         uppercase tracking-widest">
          Parameters
        </span>
      </div>

      {/* Source Model Toggle */}
      <div className="flex flex-col gap-2 pb-3
                      border-b border-[var(--border-color)]">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-[var(--text-muted)]
                           uppercase tracking-wider">
            Source Model
          </span>
          <QuestionTooltip content="Ideal: perfect single photons, standard BB84 analysis. Realistic: laser source with Poisson distribution." />
        </div>
        <div className="flex gap-1 p-0.5 rounded"
             style={{ backgroundColor: 'var(--panel-dark)',
                      border: '1px solid var(--border-color)' }}>
          {['ideal', 'realistic'].map(model => (
            <button
              key={model}
              onClick={() => setSourceModel(model)}
              className="flex-1 py-1.5 text-xs font-mono
                         rounded capitalize transition-colors"
              style={{
                backgroundColor: sourceModel === model
                  ? model === 'ideal' ? '#00aacc30' : '#ccaa0030'
                  : 'transparent',
                color: sourceModel === model
                  ? model === 'ideal' ? '#00aacc' : '#ccaa00'
                  : 'var(--text-muted)',
                border: sourceModel === model
                  ? `1px solid ${model === 'ideal' ? '#00aacc60' : '#ccaa0060'}`
                  : '1px solid transparent'
              }}
            >
              {model === 'ideal' ? '⚛ Ideal' : '🔬 Realistic'}
            </button>
          ))}
        </div>
        {sourceModel === 'ideal' && (
          <div className="text-xs font-mono text-[var(--text-subtle)]">
            Perfect single photons · Standard BB84
          </div>
        )}
        {sourceModel === 'realistic' && (
          <div className="text-xs font-mono text-[var(--text-subtle)]">
            WCP laser source · μ = {params.mean_photon_number}
          </div>
        )}
      </div>

      {/* Photons */}
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

      {/* Single Photon Mode */}
      <div className="flex items-center justify-between 
                      py-2 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-[var(--text-muted)] 
                           uppercase tracking-wider">
            Single Photon
          </span>
          <QuestionTooltip content="Send exactly 1 photon to observe the journey." />
        </div>
        <button
          onClick={() => setParams({ n_bits: params.n_bits === 1 ? 1000 : 1 })}
          className={`px-2 py-1 rounded text-xs font-mono border transition-colors
                     ${params.n_bits === 1
                       ? 'bg-indigo-900/50 border-indigo-500 text-indigo-400'
                       : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                     }`}
        >
          {params.n_bits === 1 ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Sync Mode */}
      <div className="flex items-center justify-between
                      py-2 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-[var(--text-muted)]
                           uppercase tracking-wider">
            Sync Mode
          </span>
          <QuestionTooltip content="Link animation to Inspector." />
        </div>
        <button
          onClick={() => setSyncMode(!syncMode)}
          className={`px-2 py-1 rounded text-xs font-mono border transition-colors
                     ${syncMode
                       ? 'bg-indigo-900/50 border-quantum-blue text-quantum-blue'
                       : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                     }`}
        >
          {syncMode ? 'ON' : 'OFF'}
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
        suffix="km"
      />

      {/* Noise */}
      <SliderControl
        label="Noise"
        value={Math.round(params.noise_level * 1000) / 10}
        min={0}
        max={10}
        step={0.1}
        onChange={val => setParams({ noise_level: val / 100 })}
        displayValue={`${(params.noise_level * 100).toFixed(1)}%`}
        tooltip={TOOLTIPS.noise_level}
        suffix="%"
      />

      {/* Eve Attack */}
      <SliderControl
        label="Eve Attack"
        value={Math.round(params.attack_prob * 100)}
        min={0}
        max={100}
        step={1}
        onChange={val => setParams({ attack_prob: val / 100 })}
        displayValue={`${(params.attack_prob * 100).toFixed(0)}%`}
        tooltip={TOOLTIPS.attack_prob}
        suffix="%"
      />

      {/* Strategy */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-[var(--text-muted)] 
                           uppercase tracking-wider">
            Strategy
          </span>
          <QuestionTooltip content={TOOLTIPS.attack_strategy} />
        </div>
        <div className="flex flex-col gap-1">
          {strategies.map(s => (
            <button
              key={s.value}
              onClick={() => setParams({ attack_strategy: s.value })}
              className={`px-3 py-1.5 rounded text-xs font-mono text-left transition-colors
                         ${params.attack_strategy === s.value
                           ? 'bg-indigo-900/50 border border-indigo-500/50 text-indigo-400'
                           : 'bg-[var(--panel-dark)]/10 border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                         }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* WCP Controls */}
      {sourceModel === 'realistic' && (
        <div className="flex flex-col gap-4 pt-2 border-t border-[var(--border-color)]">
          <div className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
            Realistic Source Settings
          </div>
          <SliderControl
            label="Mean Photons (μ)"
            value={params.mean_photon_number}
            min={0.05}
            max={0.5}
            step={0.05}
            onChange={val => setParams({ mean_photon_number: val })}
            displayValue={params.mean_photon_number.toFixed(2)}
            tooltip="Mean photon number per pulse (μ)."
          />
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
              Decoy States
            </span>
            <button
              onClick={() => setParams({ decoy_enabled: !params.decoy_enabled })}
              className={`px-2 py-1 rounded text-xs font-mono border transition-colors
                         ${params.decoy_enabled
                           ? 'bg-indigo-900/50 border-quantum-blue text-quantum-blue'
                           : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                         }`}
            >
              {params.decoy_enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Security Warning */}
      <AnimatePresence>
        {params.attack_prob >= 0.44 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2 bg-red-950/50 border border-red-800/50 rounded text-xs text-red-400 font-mono overflow-hidden"
          >
            ⚠ Attack level may breach 11% QBER threshold
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
