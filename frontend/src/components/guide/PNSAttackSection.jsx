import { motion } from 'framer-motion';

export default function PNSAttackSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold font-serif mb-4" style={{ color: 'var(--text-primary)' }}>Photon Number Splitting (PNS) Attack</h2>
        <p className="leading-relaxed text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
          The PNS attack exploits a fundamental limitation of practical QKD implementations: 
          weak coherent pulses (WCP) can contain multiple photons instead of exactly one.
        </p>
      </div>

      {/* The Problem */}
      <div className="border rounded-lg p-6"
           style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-xl font-serif font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>The Problem: Multi-Photon Pulses</h3>
        <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p>
            <strong className="text-cyan-400">Ideal QKD:</strong> Alice sends exactly one photon per bit. 
            Eve cannot copy it (no-cloning theorem) and any measurement disturbs the state.
          </p>
          <p>
            <strong className="text-cyan-400">Reality:</strong> Practical sources use weak coherent pulses (lasers). 
            These follow a Poisson distribution:
          </p>
          <div className="p-4 rounded font-mono text-sm border"
               style={{ backgroundColor: 'var(--code-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>
            <div>P(n photons) = (μⁿ × e^(-μ)) / n!</div>
            <div className="mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>where μ = mean photon number (typically 0.1-0.2)</div>
          </div>
          <p>
            Even with μ = 0.1, about 0.5% of pulses contain 2+ photons. This is Eve's opportunity.
          </p>
        </div>
      </div>

      {/* The Attack */}
      <div className="border rounded-lg p-6"
           style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-xl font-serif font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>How the Attack Works</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold font-mono">
              1
            </div>
            <div>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Eve Detects Multi-Photon Pulses</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Eve uses a quantum non-demolition (QND) measurement to detect which pulses contain 
                multiple photons without disturbing their polarization.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold font-mono">
              2
            </div>
            <div>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Eve Splits Off One Photon</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Using a beam splitter, Eve extracts one photon from the multi-photon pulse and 
                stores it in quantum memory. The remaining photon(s) continue to Bob.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold font-mono">
              3
            </div>
            <div>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Bob Announces His Basis</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                After measurement, Bob publicly announces which basis he used (rectilinear or diagonal). 
                This is standard BB84 protocol.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold font-mono">
              4
            </div>
            <div>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Eve Measures Her Stored Photon</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Now knowing Bob's basis, Eve measures her stored photon in the same basis. 
                She learns the bit value without introducing any QBER!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why It's Dangerous */}
      <div className="border rounded-lg p-6"
           style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <h3 className="text-xl font-serif font-semibold text-red-400 mb-4">Why This Is Dangerous</h3>
        <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex gap-3">
            <span className="text-red-400 font-bold">•</span>
            <span><strong>No QBER increase:</strong> Eve doesn't disturb the photon Bob receives</span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 font-bold">•</span>
            <span><strong>Undetectable:</strong> Alice and Bob see normal statistics</span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 font-bold">•</span>
            <span><strong>Partial key compromise:</strong> Eve learns ~0.5% of bits (with μ=0.1)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-red-400 font-bold">•</span>
            <span><strong>Scales with distance:</strong> Longer distances = more loss = higher μ needed = more multi-photon pulses</span>
          </li>
        </ul>
      </div>

      {/* The Solution: Decoy States */}
      <div className="border rounded-lg p-6"
           style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-xl font-serif font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>The Solution: Decoy State Protocol</h3>
        <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <p>
            The decoy state protocol (2003) defeats PNS attacks by randomly varying the mean photon number μ.
          </p>
          
          <div className="p-4 rounded space-y-3 border"
               style={{ backgroundColor: 'var(--code-bg)', borderColor: 'var(--card-border)' }}>
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
            <strong style={{ color: 'var(--text-primary)' }}>How it works:</strong> If Eve performs PNS attack, she must treat 
            signal and decoy states differently (she only wants multi-photon pulses). This creates a statistical 
            signature that Alice and Bob can detect by comparing detection rates.
          </p>

          <p>
            <strong style={{ color: 'var(--text-primary)' }}>Result:</strong> Eve cannot distinguish signal from decoy states without 
            being detected. The PNS attack becomes detectable, restoring security.
          </p>
        </div>
      </div>

      {/* In the Simulator */}
      <div className="border rounded-lg p-6"
           style={{ backgroundColor: 'rgba(0, 204, 255, 0.08)', borderColor: 'rgba(0, 204, 255, 0.25)' }}>
        <h3 className="text-lg font-serif font-semibold text-cyan-400 mb-3">Try It in the Simulator</h3>
        <ol className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold font-mono">1.</span>
            <span>Select <strong>Experiment 7: PNS Attack</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold font-mono">2.</span>
            <span>Enable <strong>Weak Coherent Pulse</strong> source model</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold font-mono">3.</span>
            <span>Set mean photon number to 0.2 (realistic value)</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold font-mono">4.</span>
            <span>Run simulation and observe: QBER stays low but Eve learns bits!</span>
          </li>
          <li className="flex gap-3">
            <span className="text-cyan-400 font-bold font-mono">5.</span>
            <span>Enable <strong>Decoy States</strong> to see how it defeats the attack</span>
          </li>
        </ol>
      </div>

      {/* Mathematical Details */}
      <div className="border rounded-lg p-6"
           style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-xl font-serif font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Mathematical Details</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-cyan-400 font-semibold mb-2 font-body text-sm uppercase tracking-wider">Multi-Photon Probability</h4>
            <div className="p-3 rounded font-mono text-sm border"
                 style={{ backgroundColor: 'var(--code-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>
              P(n ≥ 2) = 1 - e^(-μ) - μe^(-μ)
              <div className="mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
                For μ = 0.1: P(n ≥ 2) ≈ 0.5%<br/>
                For μ = 0.2: P(n ≥ 2) ≈ 2%
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-cyan-400 font-semibold mb-2 font-body text-sm uppercase tracking-wider">Information Leakage</h4>
            <div className="p-3 rounded font-mono text-sm border"
                 style={{ backgroundColor: 'var(--code-bg)', borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>
              I(Eve) ≈ P(n ≥ 2) × 1 bit
              <div className="mt-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
                Eve learns approximately 0.5-2% of the key
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
