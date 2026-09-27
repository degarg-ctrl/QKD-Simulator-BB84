import QuantumStateBadge from '../quantum/QuantumStateBadge'
import QuantumEquation from '../math/QuantumEquation'
import { BB84_STATE_LIST } from '../../lib/quantumStates'

const PALETTES = [
  { name: 'Graphite + copper', bg: '#141311', surface: '#211f1b', text: '#f3efe6', accent: '#d99a62', selected: true },
  { name: 'Ink + muted violet', bg: '#161419', surface: '#242029', text: '#f2edf5', accent: '#b4a0d5' },
  { name: 'Charcoal + mineral teal', bg: '#121716', surface: '#1d2523', text: '#eef3ef', accent: '#81b8a4' },
]

const STORY = ['Prepare', 'Transmit', 'Intercept', 'Measure', 'Inspect', 'Explore']

export default function FoundationPreview() {
  return (
    <details className="foundation-preview rounded-lg border">
      <summary>Visual foundations and symbol legend</summary>
      <div className="p-5 flex flex-col gap-6">
        <div className="grid md:grid-cols-3 gap-3">
          {PALETTES.map((palette) => (
            <div key={palette.name} className="rounded-md border p-3" style={{ background: palette.bg, borderColor: palette.selected ? palette.accent : '#3a3540' }}>
              <div className="h-10 rounded mb-3" style={{ background: palette.surface, border: `1px solid ${palette.accent}` }} />
              <div className="font-body text-sm font-semibold" style={{ color: palette.text }}>{palette.name}</div>
              <div className="text-xs mt-1" style={{ color: palette.accent }}>{palette.selected ? 'Selected foundation' : 'Reviewed alternative'}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="foundation-label">Landing storyboard</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {STORY.map((step, index) => <span className="story-chip" key={step}><b>{index + 1}</b>{step}</span>)}
          </div>
        </div>
        <div>
          <div className="foundation-label">Shared BB84 state language</div>
          <div className="flex flex-wrap gap-5 mt-3">
            {BB84_STATE_LIST.map((state) => <QuantumStateBadge key={state.key} state={state} showDetails />)}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <QuantumEquation name="qber" caption="Sampled QBER" compact />
          <QuantumEquation name="hadamard" caption="Hadamard unitary" compact />
        </div>
      </div>
    </details>
  )
}
