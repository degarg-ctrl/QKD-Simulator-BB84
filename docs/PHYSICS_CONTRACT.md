# BB84 QKD Simulator — Physics Ground Truth
All simulation code must conform exactly to this document.
Any deviation is a bug, not a design choice.

## 1. Basis System
Two bases: Rectilinear (+) and Diagonal (x)
Alice and Bob each choose basis randomly, probability 0.5 each.
Basis match probability 0.5 — sifting retains ~50% of raw bits.

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
attack_prob = 1.0 → QBER contribution = 0.25 exactly.
attack_prob = p   → QBER contribution = 0.25 * p.
Eve QBER and channel noise QBER are cumulative.

## 6. QBER
Sample 10% of sifted bits. Sampled bits discarded from final key.
QBER = erroneous_bits / total_sampled_sifted_bits
QBER >= 0.11 → SKR = 0, session aborted, threshold_breached = True

## 7. SKR
H(Q) = -Q*log2(Q) - (1-Q)*log2(1-Q)
R    = S * (1 - 2 * H(Q))
QBER >= 0.11: R = 0 unconditionally

## 8. Validation Benchmarks
No Eve, 0km, noise=0.00 → QBER ~0%
No Eve, 0km, noise=0.05 → QBER ~5%
Eve attack_prob=1.0     → QBER ~25%
Eve attack_prob=0.5     → QBER ~12.5%
distance=50km           → P_survive ~10%
distance=100km          → P_survive ~1%

## 9. Authoritative Constants
ATTENUATION_COEFF_DB_PER_KM = 0.2
DETECTOR_EFFICIENCY         = 0.85
DARK_COUNT_PROB             = 1e-5
QBER_SECURITY_THRESHOLD     = 0.11
SAMPLE_FRACTION_FOR_QBER    = 0.10
