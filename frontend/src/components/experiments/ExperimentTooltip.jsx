/**
 * ExperimentTooltip.jsx
 * 
 * Professional tooltip for experiment items in sidebar.
 * Shows experiment details with clean layout.
 */

export default function ExperimentTooltip({ experiment }) {
  if (!experiment) return null

  const experimentInfo = {
    exp1: {
      name: 'Basic BB84',
      description: 'Standard BB84 protocol without any attacks or modifications.',
      objective: 'Understand the basic quantum key distribution process',
      steps: [
        'Alice sends random bits in random bases',
        'Bob measures in random bases',
        'Basis reconciliation occurs',
        'Final key is established'
      ],
      expected: 'Low QBER (~0-5%), secure key established'
    },
    exp3: {
      name: 'Eavesdropping Detection',
      description: 'Eve intercepts and measures photons, introducing detectable errors.',
      objective: 'Observe how eavesdropping increases QBER',
      steps: [
        'Set attack probability > 0',
        'Run simulation',
        'Check QBER increase',
        'Observe security breach detection'
      ],
      expected: 'QBER increases with attack probability, breach detected'
    },
    exp5: {
      name: 'Distance Impact',
      description: 'Test how fiber distance affects photon loss and key rate.',
      objective: 'Understand distance limitations in QKD',
      steps: [
        'Vary distance parameter',
        'Observe photon loss',
        'Check key rate reduction',
        'Find maximum viable distance'
      ],
      expected: 'Higher distance → more loss → lower key rate'
    },
    exp6: {
      name: 'Basis Mismatch',
      description: 'Explore the effect of basis choice on key generation efficiency.',
      objective: 'See how basis reconciliation affects final key length',
      steps: [
        'Run with different bit counts',
        'Observe discarded bits',
        'Calculate efficiency (~50%)',
        'Understand basis reconciliation'
      ],
      expected: '~50% of bits discarded due to basis mismatch'
    },
    exp7: {
      name: 'PNS Attack',
      description: 'Photon Number Splitting attack exploits multi-photon pulses.',
      objective: 'Demonstrate vulnerability to PNS attacks',
      steps: [
        'Enable Realistic mode',
        'Set attack probability',
        'Run simulation',
        'Observe undetected eavesdropping'
      ],
      expected: 'Eve gains information without increasing QBER (dangerous!)',
      requiresRealistic: true
    },
    exp8: {
      name: 'Decoy States',
      description: 'Decoy state protocol defends against PNS attacks.',
      objective: 'See how decoy states detect PNS attacks',
      steps: [
        'Enable Realistic mode',
        'Enable Decoy States',
        'Set attack probability',
        'Run simulation'
      ],
      expected: 'PNS attack detected, security restored',
      requiresRealistic: true
    }
  }

  const info = experimentInfo[experiment.id]
  if (!info) return null

  return (
    <div className="bg-gray-900/98 backdrop-blur-md border border-cyan-500/30 rounded-lg shadow-2xl w-80 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-900/30 to-transparent border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded flex items-center justify-center font-mono font-bold text-white text-xs shadow-lg"
            style={{ backgroundColor: experiment.color }}
          >
            {experiment.label}
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">{info.name}</h3>
            {info.requiresRealistic && (
              <span className="text-xs text-orange-400 font-mono">Realistic Mode Only</span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Description */}
        <p className="text-gray-300 text-sm leading-relaxed">
          {info.description}
        </p>

        {/* Objective */}
        <div>
          <div className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            Objective
          </div>
          <p className="text-gray-400 text-sm">
            {info.objective}
          </p>
        </div>

        {/* Steps */}
        <div>
          <div className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            Steps
          </div>
          <div className="space-y-1.5">
            {info.steps.map((step, idx) => (
              <div key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                <span className="text-cyan-500 font-mono text-xs mt-0.5">{idx + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expected Result */}
        <div>
          <div className="text-cyan-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            Expected Result
          </div>
          <p className="text-gray-400 text-sm">
            {info.expected}
          </p>
        </div>
      </div>
    </div>
  )
}
