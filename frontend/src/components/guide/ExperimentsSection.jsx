import { motion } from 'framer-motion';

export default function ExperimentsSection() {
  const experiments = [
    {
      id: 'exp1',
      name: 'Experiment 1: Basic BB84',
      description: 'Random bits with no eavesdropper. Learn the fundamentals of BB84 protocol.',
      objective: 'Understand how BB84 establishes a shared key when the channel is secure.',
      steps: [
        'Alice generates random bits and bases',
        'Bob measures with random bases',
        'Basis reconciliation over public channel',
        'Observe low QBER (~2% from noise)',
        'Successful key establishment'
      ],
      expectedResults: 'QBER < 5%, High SKR, Secure key established',
      whatToObserve: [
        'Sifted key length (about 50% of raw bits)',
        'QBER from channel noise only',
        'Efficiency metrics',
        'Bit stream visualization'
      ]
    },
    {
      id: 'exp3',
      name: 'Experiment 3: Eavesdropping Detection',
      description: 'Random bits with Eve intercepting. See how BB84 detects attacks.',
      objective: 'Demonstrate that eavesdropping introduces detectable errors.',
      steps: [
        'Set attack probability to 50%',
        'Eve uses intercept-resend strategy',
        'Run simulation',
        'Observe QBER spike to ~25%',
        'Security threshold breached - session aborted'
      ],
      expectedResults: 'QBER ~25%, Security breach detected, Key rejected',
      whatToObserve: [
        'QBER increases with attack probability',
        'At 100% interception: QBER = 25%',
        'Security threshold (11%) breached',
        'SKR drops to zero'
      ]
    },
    {
      id: 'exp5',
      name: 'Experiment 5: Quantum Gates',
      description: 'Place gates on quantum channel to transform photon states.',
      objective: 'Understand how quantum gates affect polarization and QBER.',
      steps: [
        'Drag gates from sidebar onto the quantum channel',
        'Try Hadamard (H) gate first',
        'Run simulation',
        'Observe increased QBER',
        'Experiment with different gate combinations'
      ],
      expectedResults: 'QBER varies based on gates placed, State transformations visible',
      whatToObserve: [
        'H gate switches bases → high QBER',
        'X gate flips bits in rectilinear basis',
        'Z gate affects diagonal basis',
        'Gate properties panel shows details'
      ]
    },
    {
      id: 'exp6',
      name: 'Experiment 6: No-Cloning Theorem',
      description: 'Demonstrates why quantum states cannot be copied.',
      objective: 'Visualize the fundamental limit that makes QKD secure.',
      steps: [
        'Place cloning probe on a lane',
        'Attempt to copy quantum states',
        'Observe corruption after probe',
        'See why perfect copying is impossible',
        'Understand security implications'
      ],
      expectedResults: 'States corrupted after cloning attempt, QBER increases',
      whatToObserve: [
        'Lane turns red after cloning probe',
        'Photon states become mixed',
        'Information is lost, not copied',
        'Fundamental quantum limitation'
      ]
    },
    {
      id: 'exp7',
      name: 'Experiment 7: PNS Attack',
      description: 'Photon Number Splitting attack on weak coherent pulses.',
      objective: 'See how multi-photon pulses create a security vulnerability.',
      steps: [
        'Enable Weak Coherent Pulse source',
        'Set mean photon number to 0.2',
        'Eve performs PNS attack',
        'Observe: Low QBER but Eve learns bits',
        'Enable decoy states to defeat attack'
      ],
      expectedResults: 'Without decoy: Undetected information leakage. With decoy: Attack detected',
      whatToObserve: [
        'Multi-photon pulse statistics',
        'Eve\'s information gain',
        'QBER remains low (attack is stealthy)',
        'Decoy states reveal the attack'
      ]
    },
    {
      id: 'exp8',
      name: 'Experiment 8: Decoy State Protocol',
      description: 'Advanced protocol that defeats PNS attacks.',
      objective: 'Learn how varying photon numbers provides security.',
      steps: [
        'Enable Weak Coherent Pulse source',
        'Enable Decoy State protocol',
        'Set signal and decoy intensities',
        'Run simulation',
        'Compare with/without decoy states'
      ],
      expectedResults: 'PNS attack becomes detectable, Security restored',
      whatToObserve: [
        'Signal vs decoy state statistics',
        'Detection rate analysis',
        'Eve cannot distinguish states',
        'Restored security guarantees'
      ]
    }
  ];

  return (
    <div className="space-y-8 font-body">
      <div>
        <h2 className="text-3xl font-serif font-semibold tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>Guided Experiments</h2>
        <p className="leading-relaxed text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
          Learn QKD concepts through hands-on experiments. Each experiment focuses on a specific aspect 
          of quantum key distribution and includes step-by-step instructions.
        </p>
      </div>

      <div className="grid gap-6">
        {experiments.map((exp, index) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="border rounded-lg p-6 font-body"
            style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}
          >
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-xl font-serif font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{exp.name}</h3>
              <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>{exp.description}</p>
            </div>

            {/* Objective */}
            <div className="mb-4 rounded p-4 border"
                 style={{ backgroundColor: 'rgba(0, 204, 255, 0.08)', borderColor: 'rgba(0, 204, 255, 0.25)' }}>
              <div className="text-cyan-400 text-xs font-semibold mb-1 font-body uppercase tracking-wider">OBJECTIVE</div>
              <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{exp.objective}</p>
            </div>

            {/* Steps */}
            <div className="mb-4">
              <div className="font-semibold text-sm mb-3 font-body" style={{ color: 'var(--text-primary)' }}>Steps:</div>
              <ol className="space-y-2">
                {exp.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                    <span className="text-cyan-400 font-bold font-mono tabular-nums">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Expected Results */}
            <div className="mb-4">
              <div className="font-semibold text-sm mb-2 font-body" style={{ color: 'var(--text-primary)' }}>Expected Results:</div>
              <p className="text-sm p-3 rounded border font-body"
                 style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
                {exp.expectedResults}
              </p>
            </div>

            {/* What to Observe */}
            <div>
              <div className="font-semibold text-sm mb-2 font-body" style={{ color: 'var(--text-primary)' }}>What to Observe:</div>
              <ul className="space-y-1">
                {exp.whatToObserve.map((item, idx) => (
                  <li key={idx} className="flex gap-2 text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                    <span className="text-cyan-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>

      {/* General Tips */}
      <div className="border rounded-lg p-6 font-body"
           style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-xl font-serif font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>General Tips</h3>
        <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">•</span>
            <span><strong>Start simple:</strong> Begin with Experiment 1 to understand basics</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">•</span>
            <span><strong>Use Inspector:</strong> Click "INSPECT" button to see individual photon journeys</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">•</span>
            <span><strong>Compare results:</strong> Run same experiment with different parameters</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">•</span>
            <span><strong>Check metrics:</strong> Watch QBER, SKR, and efficiency values</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">•</span>
            <span><strong>Save experiments:</strong> Use SAVE button to preserve interesting configurations</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
