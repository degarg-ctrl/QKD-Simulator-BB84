# BB84 QKD Simulator â€” Physics Ground Truth
All simulation code must conform exactly to this document.
Any deviation is a bug, not a design choice.

## 1. Basis System
Two bases: Rectilinear (+) and Diagonal (x)
Alice and Bob each choose basis randomly, probability 0.5 each.
Basis match probability 0.5 â€” sifting retains ~50% of raw bits.

## 2. Polarization Encoding
Basis | Bit | State | Angle
+     |  0  | |0>   |   0 degrees
+     |  1  | |1>   |  90 degrees
x     |  0  | |+>   |  45 degrees
x     |  1  | |->   | 135 degrees

## 3. Measurement Rules
Correct basis: Bob measures Alice's bit perfectly.
Wrong basis: Bob gets random bit, equal probability 0 or 1.
Only error source in noiseless no-Eve scenario.

## 4. Channel Model
loss_dB   = ATTENUATION_COEFF * distance_km
P_survive = 10^(-loss_dB / 10)
P_detect  = P_survive * eta + P_dark * (1 - P_survive * eta)

## 5. Eve Intercept-Resend
Eve intercepts each photon with probability attack_prob.
Eve picks random basis, measures, re-emits in measured state.
Eve basis != Alice basis: 50% chance Bob gets wrong bit.
attack_prob = 1.0 â†’ QBER contribution = 0.25 exactly.
attack_prob = p   â†’ QBER contribution = 0.25 * p.
Eve QBER and channel noise QBER are cumulative.

## 6. QBER
Sample 10% of sifted bits. Sampled bits discarded from final key.
QBER = erroneous_bits / total_sampled_sifted_bits
QBER >= 0.11 â†’ SKR = 0, session aborted, threshold_breached = True

## 7. SKR
H(Q) = -Q*log2(Q) - (1-Q)*log2(1-Q)
R    = S * (1 - 2 * H(Q))
QBER >= 0.11: R = 0 unconditionally

## 8. Validation Benchmarks
No Eve, 0km, noise=0.00 â†’ QBER ~0%
No Eve, 0km, noise=0.05 â†’ QBER ~5%
Eve attack_prob=1.0     â†’ QBER ~25%
Eve attack_prob=0.5     â†’ QBER ~12.5%
distance=50km           â†’ P_survive ~10%
distance=100km          â†’ P_survive ~1%

## 9. Authoritative Constants
ATTENUATION_COEFF_DB_PER_KM = 0.2
DETECTOR_EFFICIENCY         = 0.85
DARK_COUNT_PROB             = 1e-5
QBER_SECURITY_THRESHOLD     = 0.11
SAMPLE_FRACTION_FOR_QBER    = 0.10

## 10. Quantum Gate Transformations
Applied to photon polarization states per lane in order.
Gates are applied AFTER channel transmission, BEFORE Bob measures.

H (Hadamard):
  |0> ? |+>  (0° ? 45°)
  |1> ? |->  (90° ? 135°)
  |+> ? |0>  (45° ? 0°)
  |-> ? |1>  (135° ? 90°)

X (Pauli-X / Bit-flip):
  |0> ? |1>  (0° ? 90°)
  |1> ? |0>  (90° ? 0°)
  |+> ? |+>  (45° ? 45°, invariant)
  |-> ? |->  (135° ? 135°, invariant)

Z (Pauli-Z / Phase-flip):
  |0> ? |0>  (0° unchanged)
  |1> ? |1>  (90° unchanged, global phase only)
  |+> ? |->  (45° ? 135°)
  |-> ? |+>  (135° ? 45°)

Y (Pauli-Y / Bit+Phase flip):
  |0> ? |1>  (0° ? 90°)
  |1> ? |0>  (90° ? 0°)
  |+> ? |->  (45° ? 135°)
  |-> ? |+>  (135° ? 45°)

S (Phase gate p/2):
  |0> ? |0>  (unchanged)
  |1> ? |1>  (phase only — visual: photon color tint +15°)
  |+> ? polarization_angle += 22.5°
  |-> ? polarization_angle -= 22.5°

T (Phase gate p/4):
  |0> ? |0>  (unchanged)
  |1> ? |1>  (phase only — visual: photon color tint +8°)
  |+> ? polarization_angle += 11.25°
  |-> ? polarization_angle -= 11.25°

Gate application rule:
  - Gates apply only to photons on the matching lane
  - Multiple gates on same lane apply left to right
  - Gate transformations update both 'bit', 'basis', 
    'state_label' and 'polarization_angle' fields
  - 'alice_bit' and 'alice_basis' are NEVER modified by gates

## 11. No-Cloning Theorem (Exp 6)
A quantum state cannot be perfectly duplicated.
Eve cloning attempt via CNOT entanglement:
  Input:  |psi>|0> — original photon + blank probe qubit
  Output: entangled state — neither copy equals |psi>
  QBER impact: adds ~25% error above channel baseline
  Visual: lane color shifts red after Cloning Probe position
          affected photon polarization_angle randomized
          Bob receives degraded state

## 12. Single Photon Mode
  n_bits = 1 triggers single photon transmission mode
  Full pipeline applies to exactly 1 photon
  QBER estimation skipped — insufficient sample size
  Result includes step-by-step photon journey log:
    - Alice encoding
    - Channel survival/loss
    - Eve interception (if active)
    - Bob measurement
    - Basis match result
