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
    <div className="bg-gray-900/98 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-2xl w-72 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-red-900/30 to-transparent border-b border-red-500/20">
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded flex items-center justify-center font-mono font-bold text-white shadow-lg text-lg"
            style={{ backgroundColor: info.color }}
          >
            {info.icon}
          </div>
          <h3 className="text-white font-semibold text-base">{info.name}</h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        <p className="text-gray-300 text-sm leading-relaxed">
          {info.description}
        </p>

        <div>
          <div className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            Mechanism
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
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

        <div className="text-gray-500 text-xs font-mono">
          Used in: {info.useIn}
        </div>
      </div>
    </div>
  );
}
