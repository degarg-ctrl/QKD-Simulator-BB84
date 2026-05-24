# TEST FINDINGS — Comprehensive Validation
**Run date:** 2026-05-04  

## Theoretical Comparison

| Scenario | Theory | Measured | Deviation | Source |
|---|---|---|---|---|
| No Eve, no noise, 0km | < 2% | 0.00% | 0.00% | BB84 (Bennett & Brassard 1984) |
| 100% intercept_resend | 25% | 25.68% | 0.68% | BB84 security proof |
| 50% intercept_resend | 12.5% | 12.18% | 0.32% | Linear scaling |
| 50km survival | ~10% | 8.45% | 1.55% | Beer-Lambert α=0.2 dB/km |
| 100km survival | ~1% | 0.82% | 0.18% | Beer-Lambert α=0.2 dB/km |
| PNS attack QBER | < 5% | 0.00% | ✅ PASS | Lo & Preskill 2007 |

## Observations

*(Generated automatically — add manual observations below)*

### Section 1 — n_bits Convergence
- QBER variance should decrease as n_bits increases. Check std_qber column in TEST_RESULTS.

### Section 2 — Distance Attenuation
- Check that survival_fraction at 150km approaches ~0.001 (near complete loss).

### Section 3 — Noise Linearity
- QBER should track noise_level almost exactly up to 10%. Any deviation > 0.03 is a finding.

### Section 4 — Eve Strategies
- Partial and Burst attacks at 100% should approach ~25% QBER if they use full interception.
  Lower values indicate they are probabilistic (expected behavior).

### Section 5 — Realistic Mode
- PNS attack QBER must remain < 5% to satisfy PHYSICS_CONTRACT.

### Section 6 — Gates
- H gate expected to raise QBER significantly (basis randomisation).
- Z gate expected to have minimal QBER change vs baseline.
- X gate expected to shift bob_bit mean toward 0.5 (bit flip).

### Section 7 — Single Photon
- Loss rate at 100km should exceed 80% per Beer-Lambert.
- At 0km, most photons should arrive (85% by detector efficiency).

## References
- Bennett, C.H. & Brassard, G. (1984). Quantum cryptography: Public key distribution and coin tossing.
- Shor, P. & Preskill, J. (2000). Simple proof of security of the BB84 quantum key distribution protocol.
- Lo, H.K. & Preskill, J. (2007). Security of quantum key distribution using weak coherent states with nonrandom phases.