export default function EntityTooltip({ entity }) {
  if (!entity) return null;

  const entityInfo = {
    clone: {
      name: 'Cloning Probe',
      icon: '⊗',
      description: 'Demonstrates the No-Cloning Theorem by attempting to copy a quantum state.',
      mechanism: 'CNOT entanglement between photon and probe qubit. The original state collapses — proving perfect cloning is impossible.',
      effect: 'QBER spikes immediately as Bob receives damaged photons',
      useIn: 'Experiment 6',
      color: '#ef4444'
    },
    cnot: {
      name: 'CNOT Tap',
      icon: '⊕',
      description: 'Controlled-NOT entanglement probe that Eve uses to extract information.',
      mechanism: 'Entangles the photon (control) with a probe qubit (target). Measurement disturbs both qubits.',
      effect: 'Eve gains partial information but introduces detectable errors',
      useIn: 'Experiment 6',
      color: '#f97316'
    },
  };

  const info = entityInfo[entity.id];
  if (!info) return null;

  return (
    <div className="rounded-lg shadow-2xl w-72 overflow-hidden border font-body"
         style={{ backgroundColor: 'var(--tooltip-bg, var(--panel-bg))', borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b"
           style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded flex items-center justify-center font-mono font-bold text-white text-lg"
            style={{ backgroundColor: info.color }}
          >
            {info.icon}
          </div>
          <h3 className="font-semibold text-base font-body" style={{ color: 'var(--text-primary)' }}>{info.name}</h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {info.description}
        </p>

        <div>
          <div className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            Mechanism
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
            {info.mechanism}
          </p>
        </div>

        <div>
          <div className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            Effect on Protocol
          </div>
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded p-2">
            ⚠ {info.effect}
          </div>
        </div>

        <div className="text-xs font-body" style={{ color: 'var(--text-subtle)' }}>
          Used in: <span className="font-semibold">{info.useIn}</span>
        </div>
      </div>
    </div>
  );
}

