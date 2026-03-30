import { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';

const BlochSphere = lazy(() => import('../visualizations/BlochSphere'));

export default function GatesSection() {
  const gates = [
    {
      id: 'H',
      name: 'Hadamard Gate',
      symbol: 'H',
      color: '#6366f1',
      description: 'Creates quantum superposition by rotating the state between computational and diagonal bases.',
      effect: 'Transforms |0⟩ → |+⟩ and |1⟩ → |-⟩, creating equal superposition states.',
      useCase: 'Essential for basis switching in QKD. When placed before measurement, it scrambles basis alignment.',
      transforms: [
        '|0⟩ → (|0⟩ + |1⟩)/√2 = |+⟩',
        '|1⟩ → (|0⟩ - |1⟩)/√2 = |-⟩',
        '|+⟩ → |0⟩',
        '|-⟩ → |1⟩'
      ]
    },
    {
      id: 'X',
      name: 'Pauli-X Gate',
      symbol: 'X',
      color: '#f59e0b',
      description: 'Quantum NOT gate that flips the computational basis states.',
      effect: 'Flips |0⟩ ↔ |1⟩ while leaving diagonal basis states unchanged.',
      useCase: 'Simulates bit flip errors in the quantum channel.',
      transforms: [
        '|0⟩ → |1⟩',
        '|1⟩ → |0⟩',
        '|+⟩ → |+⟩ (unchanged)',
        '|-⟩ → |-⟩ (unchanged)'
      ]
    },
    {
      id: 'Y',
      name: 'Pauli-Y Gate',
      symbol: 'Y',
      color: '#ec4899',
      description: 'Combines bit flip and phase flip operations.',
      effect: 'Flips both the bit value and applies a phase shift.',
      useCase: 'Models complex quantum errors affecting both amplitude and phase.',
      transforms: [
        '|0⟩ → i|1⟩',
        '|1⟩ → -i|0⟩',
        '|+⟩ → |-⟩',
        '|-⟩ → |+⟩'
      ]
    },
    {
      id: 'Z',
      name: 'Pauli-Z Gate',
      symbol: 'Z',
      color: '#14b8a6',
      description: 'Phase flip gate that affects diagonal basis states.',
      effect: 'Leaves |0⟩ and |1⟩ unchanged but flips |+⟩ ↔ |-⟩.',
      useCase: 'Simulates phase errors without affecting computational basis.',
      transforms: [
        '|0⟩ → |0⟩ (unchanged)',
        '|1⟩ → -|1⟩ (global phase)',
        '|+⟩ → |-⟩',
        '|-⟩ → |+⟩'
      ]
    },
    {
      id: 'S',
      name: 'S Gate (Phase)',
      symbol: 'S',
      color: '#8b5cf6',
      description: 'Phase rotation by π/2 (90 degrees).',
      effect: 'Applies a quarter-turn phase rotation around the Z-axis.',
      useCase: 'Fine-grained phase control for advanced quantum operations.',
      transforms: [
        '|0⟩ → |0⟩',
        '|1⟩ → i|1⟩',
        'Rotates diagonal states by 22.5°'
      ]
    },
    {
      id: 'T',
      name: 'T Gate (π/8)',
      symbol: 'T',
      color: '#06b6d4',
      description: 'Phase rotation by π/4 (45 degrees).',
      effect: 'Applies an eighth-turn phase rotation around the Z-axis.',
      useCase: 'Precision phase adjustments for quantum algorithms.',
      transforms: [
        '|0⟩ → |0⟩',
        '|1⟩ → e^(iπ/4)|1⟩',
        'Rotates diagonal states by 11.25°'
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Quantum Gates</h2>
        <p className="text-gray-300 leading-relaxed">
          Quantum gates are operations that transform quantum states. In this simulator, you can place gates
          on the quantum channel to observe how they affect photon polarization states.
        </p>
      </div>

      <div className="grid gap-6">
        {gates.map((gate, index) => (
          <motion.div
            key={gate.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-6"
          >
            <div className="flex items-start gap-6">
              {/* 3D Visualization */}
              <div className="flex-shrink-0">
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <Suspense fallback={
                    <div className="w-40 h-40 flex items-center justify-center text-gray-500 text-xs">
                      Loading...
                    </div>
                  }>
                    <BlochSphere gateType={gate.id} animate={true} size={160} />
                  </Suspense>
                </div>
              </div>

              {/* Gate Info */}
              <div className="flex-1 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded flex items-center justify-center font-mono font-bold text-white text-xl"
                    style={{ backgroundColor: gate.color }}
                  >
                    {gate.symbol}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{gate.name}</h3>
                    <p className="text-gray-400 text-sm">Quantum Gate Operation</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 leading-relaxed">
                  {gate.description}
                </p>

                {/* Effect */}
                <div>
                  <div className="text-cyan-400 text-sm font-semibold mb-2">EFFECT</div>
                  <p className="text-gray-400 text-sm">{gate.effect}</p>
                </div>

                {/* Transformations */}
                <div>
                  <div className="text-cyan-400 text-sm font-semibold mb-2">STATE TRANSFORMATIONS</div>
                  <div className="space-y-1">
                    {gate.transforms.map((transform, idx) => (
                      <div key={idx} className="text-gray-300 text-sm font-mono flex items-center gap-2">
                        <span className="text-cyan-500">→</span>
                        <span>{transform}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Use Case */}
                <div>
                  <div className="text-cyan-400 text-sm font-semibold mb-2">USE IN QKD</div>
                  <p className="text-gray-400 text-sm">{gate.useCase}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* How to Use */}
      <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">How to Use Gates</h3>
        <ol className="space-y-2 text-gray-300">
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">1.</span>
            <span>Drag a gate from the sidebar onto a quantum channel lane</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">2.</span>
            <span>Gates snap to specific positions (15 slots per lane)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">3.</span>
            <span>Run the simulation to see how gates affect photon states</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">4.</span>
            <span>Observe changes in QBER and key security metrics</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">5.</span>
            <span>Right-click gates in the properties panel to delete them</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
