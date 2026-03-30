import { Suspense, lazy } from 'react';

// Lazy load 3D component for performance
const BlochSphere = lazy(() => import('../visualizations/BlochSphere'));

export default function GateTooltip({ gate }) {
  if (!gate) return null;

  const gateInfo = {
    H: {
      name: 'Hadamard Gate',
      description: 'Creates quantum superposition by rotating the state.',
      effect: 'Switches between rectilinear and diagonal bases',
      transforms: ['|0⟩ → |+⟩', '|1⟩ → |-⟩', '|+⟩ → |0⟩', '|-⟩ → |1⟩']
    },
    X: {
      name: 'Pauli-X Gate',
      description: 'Quantum NOT gate that flips the bit value.',
      effect: 'Flips |0⟩ ↔ |1⟩ in rectilinear basis',
      transforms: ['|0⟩ → |1⟩', '|1⟩ → |0⟩', '|+⟩ unchanged', '|-⟩ unchanged']
    },
    Y: {
      name: 'Pauli-Y Gate',
      description: 'Combines bit flip and phase flip operations.',
      effect: 'Flips both bit value and phase',
      transforms: ['|0⟩ → i|1⟩', '|1⟩ → -i|0⟩', '|+⟩ → |-⟩', '|-⟩ → |+⟩']
    },
    Z: {
      name: 'Pauli-Z Gate',
      description: 'Applies phase flip to the quantum state.',
      effect: 'Flips diagonal basis states',
      transforms: ['|0⟩ unchanged', '|1⟩ phase flip', '|+⟩ → |-⟩', '|-⟩ → |+⟩']
    },
    S: {
      name: 'S Gate (Phase)',
      description: 'Rotates phase by 90 degrees (π/2).',
      effect: 'Quarter turn rotation around Z axis',
      transforms: ['|0⟩ unchanged', '|1⟩ → i|1⟩', 'Rotates diagonal states']
    },
    T: {
      name: 'T Gate (π/8)',
      description: 'Rotates phase by 45 degrees (π/4).',
      effect: 'Eighth turn rotation around Z axis',
      transforms: ['|0⟩ unchanged', '|1⟩ → e^(iπ/4)|1⟩', 'Fine phase control']
    },
  };

  const info = gateInfo[gate.id];
  if (!info) return null;

  return (
    <div className="bg-gray-900/98 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-2xl w-72 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-900/30 to-transparent border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded flex items-center justify-center font-mono font-bold text-white shadow-lg"
            style={{ backgroundColor: gate.color }}
          >
            {gate.symbol}
          </div>
          <h3 className="text-white font-semibold text-base">{info.name}</h3>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* 3D Bloch Sphere */}
        <div className="flex justify-center bg-gray-800/30 rounded-lg p-2">
          <Suspense fallback={
            <div className="w-48 h-48 flex items-center justify-center text-gray-500 text-xs">
              Loading 3D...
            </div>
          }>
            <BlochSphere gateType={gate.id} animate={true} size={192} />
          </Suspense>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm leading-relaxed">
          {info.description}
        </p>

        {/* Effect */}
        <div>
          <div className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            Effect
          </div>
          <p className="text-gray-400 text-sm">
            {info.effect}
          </p>
        </div>

        {/* Transformations */}
        <div>
          <div className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            State Transformations
          </div>
          <div className="space-y-1.5">
            {info.transforms.map((transform, idx) => (
              <div key={idx} className="text-gray-300 text-sm font-mono flex items-center gap-2">
                <span className="text-cyan-500">→</span>
                <span>{transform}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
