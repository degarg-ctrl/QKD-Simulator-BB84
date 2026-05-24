# Test Requirements — Comprehensive Validation
**Run:** 2026-05-04_comprehensive-validation  
**Date:** 2026-05-04  
**Author:** QKD Simulator Team

## Why This Test Was Run

This test suite was designed to answer a single overarching question:
> **"Is the QKD Simulator producing correct physics, and are the values it displays to the user accurate?"**

The existing 2026-05-02 test suite verified physics invariants (Beer-Lambert, QBER threshold, binary entropy). This suite goes further: it produces empirical measurements across a **wide parameter space** with 20–200 readings per combination, then compares results against theoretical BB84 values and published literature.

## Requirements

### R1 — Photon Count Convergence
The simulator must produce progressively more stable QBER estimates as n_bits increases from 1000 to 10000. Variance of QBER must decrease monotonically.

### R2 — Distance Attenuation
- Survival fraction at 50 km must be 10% ± 3% (Beer-Lambert, α=0.2 dB/km)
- Survival fraction at 100 km must be 1% ± 2%
- Sifted key length must be monotonically non-increasing with distance

### R3 — Noise Linearity
QBER must track noise_level linearly in the range [0, 0.10]. Deviation > 0.03 from noise_level is a failure.

### R4 — Eve Attack Correctness
- intercept_resend at 100% → QBER ≈ 0.25 ± 0.03 (BB84 security proof)
- intercept_resend at 50% → QBER ≈ 0.125 ± 0.03
- All strategies: QBER must be monotonically increasing with attack_prob

### R5 — Realistic Source Model
- PNS attack must NOT introduce QBER above 0.05 (undetectable by threshold)
- Decoy state response must contain non-empty `decoy_results` dict
- Higher μ must produce higher `multi_photon_fraction` in wcp_stats

### R6 — Gate Functionality
- Each gate (H, X, Y, Z, S, T) must not crash the API
- H gate must produce measurable change in QBER vs baseline (basis randomisation)
- Bit-flip gates (X) must produce detectable change in bit distribution

### R7 — Single Photon Mode
- API must always return 200 OK with n_bits=1
- bit_stream must have exactly 0 or 1 entries
- At 100 km, lost rate must be > 80% across 200 trials (Beer-Lambert)

### R8 — Frontend/Backend Sync
- `qber` from API must match manually computed QBER from bit_stream
- `sifted_key_length` must match count of matching-basis photons in bit_stream
- `secure_threshold_breached` must equal (qber >= 0.11)
- `skr` must be 0 when `secure_threshold_breached=True`
