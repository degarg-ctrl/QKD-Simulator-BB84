import { motion } from 'framer-motion';

export default function PNSAttackSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Photon Number Splitting (PNS) Attack</h2>
        <p className="text-gray-300 leading-relaxed">
          The PNS attack exploits a fundamental limitation of practical QKD implementations: 
          weak coherent pulses (WCP) can contain multiple photons instead of exactly one.
        </p>
      </div>

      {/* The Problem */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">The Problem: Multi-Photon Pulses</h3>
        <div className="space-y-4 text-gray-300">
          <p>
            <strong className="text-cyan-400">Ideal QKD:</strong> Alice sends exactly one photon per bit. 
            Eve cannot copy it (no-cloning theorem) and any measurement disturbs the state.
          </p>
          <p>
            <strong className="text-cyan-400">Reality:</strong> Practical sources use weak coherent pulses (lasers). 
            These follow a Poisson distribution:
          </p>
          <div className="bg-gray-900/50 p-4 rounded font-mono text-sm">
            <div>P(n photons) = (μⁿ × e^(-μ)) / n!</div>
            <div className="text-gray-500 mt-2">where μ = mean photon number (typically 0.1-0.2)</div>
          </div>
          <p>
            Even with μ = 0.1, about 0.5% of pulses contain 2+ photons. This is Eve's opportunity.
          </p>
        </div>
      </div>

      {/* The Attack */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">How the Attack Works</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
              1
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Eve Detects Multi-Photon Pulses</h4>
              <p className="text-gray-300 text-sm">
                Eve uses a quantum non-demolition (QND) measurement to detect which pulses contain 
                multiple photons without disturbing their polarization.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
              2
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Eve Splits Off One Photon</h4>
              <p className="text-gray-300 text-sm">
                Using a beam splitter, Eve extracts one photon from the multi-photon pulse and 
                stores it in quantum memory. The remaining photon(s) continue to Bob.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
              3
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Bob Announces His Basis</h4>
              <p className="text-gray-300 text-sm">
                After measurement, Bob publicly announces which basis he used (rectilinear or diagonal). 
                This is standard BB84 protocol.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
              4
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Eve Measures Her Stored Photon</h4>
              <p className="text-gray-300 text-sm">
                Now knowing Bob's basis, Eve measures her stored photon in the same basis. 
                She learns the bit value without introducing any QBER!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why It's Dangerous */}
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-red-400 mb-4">Why This Is Dangerous</h3>
        <ul className="space-y-3 text-gray-300">
          <li className="flex gap-3">
            <span className="text-red-400">•</span>
            <span><strong>No QBER increase:</strong> Eve doesn't disturb the photon Bob receives</span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400">•</span>
            <span><strong>Undetectable:</strong> Alice and Bob see normal statistics</span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400">•</span>
            <span><strong>Partial key compromise:</strong> Eve learns ~0.5% of bits (with μ=0.1)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400">•</span>
            <span><strong>Scales with distance:</strong> Longer distances = more loss = higher μ needed = more multi-photon pulses</span>
          </li>
        </ul>
      </div>

      {/* The Solution: Decoy States */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">The Solution: Decoy State Protocol</h3>
        <div className="space-y-4 text-gray-300">
          <p>
            The decoy state protocol (2003) defeats PNS attacks by randomly varying the mean photon number μ.
          </p>
          
          <div className="bg-gray-900/50 p-4 rounded space-y-3">
            <div>
              <strong className="text-cyan-400">Signal States:</strong> Normal pulses with μ = 0.2
            </div>
            <div>
              <strong className="text-cyan-400">Decoy States:</strong> Weaker pulses with μ = 0.05
            </div>
            <div>
              <strong className="text-cyan-400">Vacuum States:</strong> Empty pulses with μ = 0
            </div>
          </div>

          <p>
            <strong className="text-white">How it works:</strong> If Eve performs PNS attack, she must treat 
            signal and decoy states differently (she only wants multi-photon pulses). This creates a statistical 
            signature that Alice and Bob can detect by comparing detection rates.
          </p>

          <p>
            <strong className="text-white">Result:</strong> Eve cannot distinguish signal from decoy states without 
            being detected. The PNS attack becomes detectable, restoring security.
          </p>
        </div>
      </div>

      {/* In the Simulator */}
      <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Try It in the Simulator</h3>
        <ol className="space-y-2 text-gray-300">
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">1.</span>
            <span>Select <strong>Experiment 7: PNS Attack</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">2.</span>
            <span>Enable <strong>Weak Coherent Pulse</strong> source model</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">3.</span>
            <span>Set mean photon number to 0.2 (realistic value)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">4.</span>
            <span>Run simulation and observe: QBER stays low but Eve learns bits!</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold">5.</span>
            <span>Enable <strong>Decoy States</strong> to see how it defeats the attack</span>
          </li>
        </ol>
      </div>

      {/* Mathematical Details */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Mathematical Details</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-cyan-400 font-semibold mb-2">Multi-Photon Probability</h4>
            <div className="bg-gray-900/50 p-3 rounded font-mono text-sm text-gray-300">
              P(n ≥ 2) = 1 - e^(-μ) - μe^(-μ)
              <div className="mt-2 text-gray-500">
                For μ = 0.1: P(n ≥ 2) ≈ 0.5%<br/>
                For μ = 0.2: P(n ≥ 2) ≈ 2%
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-cyan-400 font-semibold mb-2">Information Leakage</h4>
            <div className="bg-gray-900/50 p-3 rounded font-mono text-sm text-gray-300">
              I(Eve) ≈ P(n ≥ 2) × 1 bit
              <div className="mt-2 text-gray-500">
                Eve learns approximately 0.5-2% of the key
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
