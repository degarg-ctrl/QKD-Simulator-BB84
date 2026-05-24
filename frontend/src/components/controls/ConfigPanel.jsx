/**
 * src/components/controls/ConfigPanel.jsx
 *
 * Simulation parameter controls panel.
 * All controls write directly to Zustand store via setParams.
 * No local state — single source of truth is the store.
 */

import { useState } from 'react'
import ParameterTooltip from '../ui/ParameterTooltip'
import SmartTooltipWrapper from '../ui/SmartTooltipWrapper'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'
import EditableValue from '../ui/EditableValue'

// Structured parameter info for ParameterTooltip
const PARAM_INFO = {
  n_bits: {
    title: 'Photon Count',
    description: 'Number of photons Alice sends through the quantum channel. More photons produce more accurate QBER statistics.',
    range: '100 — 10,000',
    defaultValue: '1,000',
    impact: 'Higher counts improve statistical accuracy but increase simulation time. Minimum 100 for meaningful QBER estimation.'
  },
  source_model: {
    title: 'Source Model',
    description: 'Determines the photon source type for the simulation.',
    range: 'Ideal / Realistic',
    defaultValue: 'Ideal',
    impact: 'Ideal uses perfect single photons (standard BB84). Realistic uses a WCP laser source with Poisson distribution — enables PNS attack experiments.'
  },
  single_photon: {
    title: 'Single Photon Mode',
    description: 'Send exactly 1 photon to observe its full journey through the quantum channel.',
    impact: 'Useful for step-by-step visualization and understanding individual photon behavior.'
  },
  sync_mode: {
    title: 'Sync Mode',
    description: 'Links the photon animation to the Inspector panel.',
    impact: 'When enabled, clicking a photon in the Inspector will animate that specific photon on the canvas.'
  },
  distance_km: {
    title: 'Channel Distance',
    description: 'Fiber optic cable length between Alice and Bob. Longer distance = more photon loss via Beer-Lambert attenuation.',
    range: '0 — 150 km',
    defaultValue: '50 km',
    impact: 'At 50km ~10% survive, at 100km ~1% survive. Directly limits the Secret Key Rate.'
  },
  noise_level: {
    title: 'Noise Level',
    description: 'Background noise probability per photon slot. Models thermal noise, detector dark counts, and environmental interference.',
    range: '0% — 10%',
    defaultValue: '2%',
    impact: 'Even without Eve, noise contributes to QBER. Values above 5% significantly degrade key quality.'
  },
  attack_prob: {
    title: 'Eve Attack Probability',
    description: 'Probability that Eve intercepts each photon in the quantum channel.',
    range: '0% — 100%',
    defaultValue: '0%',
    impact: 'At 100%, Eve intercepts all photons — introducing exactly 25% QBER. BB84 aborts if QBER exceeds 11%.'
  },
  attack_strategy: {
    title: 'Attack Strategy',
    description: 'How Eve attacks the quantum channel.',
    impact: 'Intercept-Resend: 25% QBER at full interception. Partial: random fraction. Burst: contiguous block. PNS: splits multi-photon pulses (realistic only).'
  },
}

// ParameterQuestion — hover-activated (?) icon with ParameterTooltip
function ParameterQuestion({ paramKey }) {
  const info = PARAM_INFO[paramKey]
  if (!info) return null

  return (
    <SmartTooltipWrapper
      tooltipContent={
        <ParameterTooltip
          title={info.title}
          description={info.description}
          range={info.range}
          defaultValue={info.defaultValue}
          impact={info.impact}
        />
      }
      placement="bottom"
      maxHeight={400}
    >
      <button
        className="w-4 h-4 rounded-full border border-gray-600
                   text-gray-500 hover:text-gray-300
                   hover:border-gray-400 text-xs flex items-center
                   justify-center transition-colors ml-1
                   flex-shrink-0"
      >
        ?
      </button>
    </SmartTooltipWrapper>
  )
}

function SliderControl({ label, value, min, max, step,
                         onChange, displayValue, 
                         paramKey, suffix = '' }) {
  return (
    <div className="flex flex-col gap-1.5" id={`control-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-[var(--text-muted)] 
                           uppercase tracking-wider">
            {label}
          </span>
          <ParameterQuestion paramKey={paramKey} />
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
    { value: 'partial', label: 'Partial Intercept' },
    { value: 'burst', label: 'Burst Attack' },
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
          <ParameterQuestion paramKey="source_model" />
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
        paramKey="n_bits"
      />

      {/* Single Photon Mode */}
      <div className="flex items-center justify-between 
                      py-2 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-[var(--text-muted)] 
                           uppercase tracking-wider">
            Single Photon
          </span>
          <ParameterQuestion paramKey="single_photon" />
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
          <ParameterQuestion paramKey="sync_mode" />
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
        paramKey="distance_km"
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
        paramKey="noise_level"
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
        paramKey="attack_prob"
        suffix="%"
      />

      {/* Strategy */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-[var(--text-muted)] 
                           uppercase tracking-wider">
            Strategy
          </span>
          <ParameterQuestion paramKey="attack_strategy" />
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
