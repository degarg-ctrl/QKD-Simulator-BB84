/**
 * src/components/controls/ConfigPanel.jsx
 *
 * Simulation parameter controls panel.
 * All controls write directly to Zustand store via setParams.
 * No local state — single source of truth is the store.
 */

import ParameterTooltip from '../ui/ParameterTooltip'
import SmartTooltipWrapper from '../ui/SmartTooltipWrapper'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'
import EditableValue from '../ui/EditableValue'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/Accordion'
import { SegmentedControl } from '../ui/SegmentedControl'
import { ChevronDown } from 'lucide-react'
import Slider from '../ui/Slider'

// Structured parameter info for ParameterTooltip
const PARAM_INFO = {
  n_bits: {
    title: 'Photon Count',
    description: 'Number of photons Alice sends through the quantum channel. Select 1 for single-photon observation, or up to 10,000 for statistical convergence.',
    range: '1 — 10,000 photons',
    defaultValue: '1,000',
    impact: 'Higher counts produce accurate QBER statistics. Lower counts enable step-by-step observation.'
  },
  source_model: {
    title: 'Source Model',
    description: 'Determines the photon source type for the simulation.',
    range: 'Ideal / Realistic',
    defaultValue: 'Ideal',
    impact: 'Ideal uses perfect single photons (standard BB84). Realistic uses a WCP laser source with Poisson distribution — enables PNS attack experiments.'
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
    <div className="flex flex-col gap-2" id={`control-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-body font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
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
          color="var(--q-accent-cyan, #38bdf8)"
        />
      </div>
      <div className="py-1">
        <Slider
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  )
}

function PhotonCountControl({ value, onChange, paramKey }) {
  // Map value across 3 equal-width visual tiers [0 - 300]:
  // Tier 1 (0% to 33.33%, p: 0-100): 1 to 10 (step 1)
  // Tier 2 (33.33% to 66.67%, p: 100-200): 10 to 100 (step 10)
  // Tier 3 (66.67% to 100%, p: 200-300): 100 to 10,000 (step 100)
  const photonsToPos = (n) => {
    if (n <= 10) {
      return Math.max(0, Math.min(100, Math.round(((n - 1) / 9) * 100)))
    }
    if (n <= 100) {
      return Math.min(200, Math.round(100 + ((n - 10) / 90) * 100))
    }
    return Math.min(300, Math.round(200 + ((n - 100) / 9900) * 100))
  }

  const posToPhotons = (pos) => {
    if (pos <= 100) {
      return Math.max(1, Math.min(10, Math.round(1 + (pos / 100) * 9)))
    }
    if (pos <= 200) {
      const raw = 10 + ((pos - 100) / 100) * 90
      return Math.round(raw / 10) * 10
    }
    const raw = 100 + ((pos - 200) / 100) * 9900
    return Math.round(raw / 100) * 100
  }

  const currentPos = photonsToPos(value)

  return (
    <div className="flex flex-col gap-2" id="control-photons">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-body font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Photons
          </span>
          <ParameterQuestion paramKey={paramKey} />
        </div>
        <EditableValue
          value={value.toLocaleString()}
          numericValue={value}
          min={1}
          max={10000}
          step={value <= 10 ? 1 : value <= 100 ? 10 : 100}
          onChange={onChange}
          color="var(--q-accent-cyan, #38bdf8)"
        />
      </div>

      <div className="py-1">
        <Slider
          min={0}
          max={300}
          step={1}
          value={currentPos}
          onChange={pos => onChange(posToPhotons(pos))}
          divisions={[33.33, 66.67]}
        />
      </div>
      <div className="relative text-[11px] font-mono text-[var(--text-muted)] h-4 select-none">
        <span className="absolute left-0">1</span>
        <span className="absolute left-[33.33%] -translate-x-1/2">10</span>
        <span className="absolute left-[66.67%] -translate-x-1/2">100</span>
        <span className="absolute right-0">10,000</span>
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
    <div
      className={`flex flex-col gap-3 p-3 rounded select-none ${className}`}
      style={{
        backgroundColor: 'var(--q-surface-1, #1a1a1e)',
        border: '1px solid var(--q-border, #34343d)'
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between pb-2 border-b"
        style={{ borderColor: 'var(--q-border-subtle, #282830)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--q-accent-cyan, #38bdf8)' }} />
          <span className="text-xs font-body text-[var(--q-text-bright,#f1f5f9)] uppercase tracking-wider font-semibold">
            Parameters
          </span>
        </div>
        <span className="text-[11px] font-body text-[var(--q-text-dim,#64748b)] font-medium">
          BB84 Protocol
        </span>
      </div>

      {/* 4-Group Radix Accordion */}
      <Accordion
        type="multiple"
        defaultValue={['source', 'channel', 'adversary', 'visualization']}
        className="flex flex-col gap-1.5"
      >
        {/* ── 1. SOURCE PARAMETERS ── */}
        <AccordionItem value="source">
          <AccordionTrigger>Source Parameters</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pt-2">
            {/* Source Model */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-body font-semibold text-[var(--q-text-2)] uppercase tracking-wider">
                    Source Model
                  </span>
                  <ParameterQuestion paramKey="source_model" />
                </div>
                <span className="text-xs font-body font-medium text-[var(--q-text-3)]">
                  {sourceModel === 'ideal' ? 'Ideal Source' : 'WCP Laser'}
                </span>
              </div>
              <SegmentedControl
                size="md"
                options={[
                  { value: 'ideal', label: 'Ideal' },
                  { value: 'realistic', label: 'Realistic' }
                ]}
                value={sourceModel}
                onChange={setSourceModel}
                className="w-full"
              />
              <div className="p-2.5 rounded-md bg-[var(--q-surface-0)] border border-[var(--border-color)]/70 text-xs font-body text-[var(--q-text-2)] leading-relaxed">
                {sourceModel === 'ideal'
                  ? 'Standard BB84 · Pure single-photon state preparation'
                  : `WCP Laser Source · Poisson distribution (μ = ${params.mean_photon_number.toFixed(2)})`}
              </div>
            </div>

            {/* Photons (Unified 3-Tier Mode: 1-10, 10-100, 100-10,000) */}
            <PhotonCountControl
              value={params.n_bits}
              onChange={val => setParams({ n_bits: val })}
              paramKey="n_bits"
            />

            {/* Realistic Source Settings (WCP & Decoy) */}
            {sourceModel === 'realistic' && (
              <div className="flex flex-col gap-3 pt-2 border-t border-[var(--border-color)]/50">
                <SliderControl
                  label="Mean Photons (μ)"
                  value={params.mean_photon_number}
                  min={0.05}
                  max={0.5}
                  step={0.05}
                  onChange={val => setParams({ mean_photon_number: val })}
                  displayValue={params.mean_photon_number.toFixed(2)}
                />
                <div className="flex items-center justify-between py-1">
                  <span className="text-xs font-body font-semibold text-[var(--q-text-2)] uppercase tracking-wider">
                    Decoy States
                  </span>
                  <button
                    onClick={() => setParams({ decoy_enabled: !params.decoy_enabled })}
                    className={`px-2.5 py-1 rounded text-xs font-body font-semibold border transition-colors ${
                      params.decoy_enabled
                        ? 'bg-white/10 border-white/30 text-white font-bold'
                        : 'border-[var(--border-color)] text-[var(--q-text-3)] hover:text-[var(--q-text-1)]'
                    }`}
                  >
                    {params.decoy_enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ── 2. CHANNEL PARAMETERS ── */}
        <AccordionItem value="channel">
          <AccordionTrigger>Channel Parameters</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pt-2">
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
          </AccordionContent>
        </AccordionItem>

        {/* ── 3. ADVERSARY (EVE) ── */}
        <AccordionItem value="adversary">
          <AccordionTrigger>Adversary (Eve)</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pt-2">
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
              <div className="flex items-center justify-between">
                <span className="text-xs font-body font-semibold text-[var(--q-text-2)] uppercase tracking-wider">
                  Strategy
                </span>
                <ParameterQuestion paramKey="attack_strategy" />
              </div>
              <div className="relative">
                <select
                  value={params.attack_strategy}
                  onChange={e => setParams({ attack_strategy: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-body font-medium rounded-lg bg-[var(--q-surface-0)] border border-[var(--border-color)] text-[var(--q-text-1)] focus:outline-none focus:border-white/40 cursor-pointer appearance-none"
                >
                  {strategies.map(s => (
                    <option key={s.value} value={s.value} className="bg-[var(--panel-bg)] text-[var(--text-primary)]">
                      {s.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[var(--text-muted)]">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Security Warning */}
            <AnimatePresence>
              {params.attack_prob >= 0.44 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-2 bg-red-950/50 border border-red-800/50 rounded text-xs text-red-400 font-body font-medium overflow-hidden"
                >
                  ⚠ Attack level may breach 11% QBER threshold
                </motion.div>
              )}
            </AnimatePresence>
          </AccordionContent>
        </AccordionItem>

        {/* ── 4. VISUALIZATION & DETECTION ── */}
        <AccordionItem value="visualization">
          <AccordionTrigger>Visualization & Detection</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2.5 pt-2">
            {/* Sync Mode */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-body font-semibold text-[var(--q-text-2)] uppercase tracking-wider">
                  Sync Mode
                </span>
                <ParameterQuestion paramKey="sync_mode" />
              </div>
              <button
                onClick={() => setSyncMode(!syncMode)}
                className={`px-2.5 py-1 rounded text-xs font-body font-semibold border transition-colors ${
                  syncMode
                    ? 'bg-white/10 border-white/30 text-white font-bold'
                    : 'border-[var(--border-color)] text-[var(--q-text-3)] hover:text-[var(--q-text-1)]'
                }`}
              >
                {syncMode ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="text-xs font-body text-[var(--q-text-3)]">
              Links photon flight animations directly to the Inspector table.
            </div>

            {/* Detection parameters overview */}
            <div className="pt-2 border-t border-[var(--border-color)]/40 flex flex-col gap-1.5 text-xs font-body text-[var(--q-text-3)]">
              <div className="flex justify-between">
                <span>Detector:</span>
                <span className="text-[var(--q-text-2)] font-mono tabular-nums">
                  {sourceModel === 'realistic' ? 'SPAD (η=0.85)' : 'Ideal (η=1.0)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dark Count:</span>
                <span className="text-[var(--q-text-2)] font-mono tabular-nums">
                  {sourceModel === 'realistic' ? '1.0 × 10⁻⁵' : '0'}
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

