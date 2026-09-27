import { getBB84State, UNKNOWN_QUANTUM_STATE } from '../../lib/quantumStates'

export default function QuantumStateBadge({
  basis, bit, state: suppliedState, size = 'md', showKet = true,
  showDetails = false, className = '',
}) {
  const state = suppliedState || getBB84State(basis, bit) || UNKNOWN_QUANTUM_STATE
  const px = size === 'sm' ? 30 : size === 'lg' ? 52 : 40
  const isDiagonal = state.basis === 'x'
  const color = isDiagonal ? 'var(--q-basis-diag)' : 'var(--q-basis-rect)'
  const angle = state.angle == null ? 0 : state.angle

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      role="img"
      aria-label={state.description}
      title={state.description}
    >
      <span
        className="relative inline-flex items-center justify-center rounded-full shrink-0"
        style={{
          width: px, height: px,
          background: 'var(--q-surface-active)',
          border: `1px solid ${color}`,
          boxShadow: `inset 0 0 0 3px color-mix(in srgb, ${color} 10%, transparent)`,
        }}
        aria-hidden="true"
      >
        {state.angle == null ? (
          <span className="font-mono text-xs" style={{ color }}>?</span>
        ) : (
          <span
            className="absolute rounded-full"
            style={{
              width: Math.round(px * 0.62), height: 2,
              backgroundColor: color,
              transform: `rotate(${-angle}deg)`,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        )}
        <span
          className="absolute rounded-full"
          style={{ width: 5, height: 5, backgroundColor: color }}
        />
      </span>
      {(showKet || showDetails) && (
        <span className="inline-flex flex-col leading-tight">
          {showKet && <span className="font-mono text-sm text-[var(--q-text-1)]">{state.ket}</span>}
          {showDetails && (
            <span className="text-[10px] font-body text-[var(--q-text-3)]">
              {state.basisLabel} · {state.angle == null ? 'unknown' : `${state.angle}°`}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
