# TEST RESULTS — 2026-09-09 Event Model & Transmission Accounting

**Suite:** `tests/runs/2026-09-09_event-model-transmission/suite`
**Python:** 3.14.3 | **NumPy:** 2.4.3 | **Pydantic:** 2.12.5
**Command:** `& ".\.venv\Scripts\python.exe" -m pytest tests/runs/2026-09-09_event-model-transmission/suite -v --tb=short`

## Summary

| Metric | Value |
|---|---|
| Total tests | 38 |
| Passed | 37 |
| Skipped | 1 (statistical: no dark count fired at P=1e-5, n=5000) |
| Failed | 0 |
| Duration | 4.29 s |

## Measured values

### TRANSMISSION-001 — Accounting identities
- Ideal mode (n=500, d=20km): generated = vacuum + survived + lost ✓
- WCP+PNS (n=1000, μ=0.5, p=0.8): all 4 identities hold ✓
- WCP long distance (n=1000, d=100km): identities hold ✓

### TRANSMISSION-002 — Fiber attenuation (n=5000, 4σ)
| Distance | Expected P_survive | Observed | Result |
|---|---|---|---|
| 0 km | 1.000 | 1.000 | PASS |
| 25 km | 0.316 | 0.317 | PASS |
| 50 km | 0.100 | 0.099 | PASS |
| 100 km | 0.010 | 0.010 | PASS |

Benchmarks: 50km survival 0.099 ∈ [0.07, 0.13] ✓; 100km 0.010 ∈ [0.004, 0.017] ✓

### TRANSMISSION-003 — Detector efficiency
- Ideal mode (n=1000, d=30km): detector_loss=0, dark=0, real=fiber_survived ✓
- Realistic mode (n=5000, μ=0.5, d=0km): observed η = 0.8503 vs 0.85 (4σ) ✓

### TRANSMISSION-004 — Dark counts
- Frequency (n=10000, d=100km, μ=0.5): observed ≈ N_undetected × 1e-5 (4σ) ✓
- Event properties: dark ⇒ detector_detected=False, bob_bit ∈ {0,1} ✓
- (1 skip: no dark count fired in the n=5000 event-property run — expected at P=1e-5)

### TRANSMISSION-005 — Classification consistency
- Every event has exactly one primary outcome category (n=800, mixed WCP+PNS) ✓
- lost=True ⟺ vacuum ∨ fiber-lost ∨ PNS-blocked ✓
- sifted ⇒ basis match ∧ measured ✓
- Alice fields never mutated (full intercept, n=500): alice angle ∈ {0,45,90,135}° ✓

### Eve event semantics
- intercepted ⇒ fiber_survived (n=2000, d=60km, p=1.0) ✓
- eve_resend_angle == POLARIZATION_ANGLES[(eve_basis, eve_bit)] ✓
- Basis match ⇒ resend angle == Alice's original angle ✓
- Unintercepted ⇒ no Eve state fields ✓

### PNS event semantics
- split/blocked ⇒ fiber_survived ∧ ¬vacuum ✓
- split ⇒ wcp_multi ∧ photon_count ≥ 2 ∧ eve_has_copy ✓
- blocked ⇒ wcp_single ∧ photon_count == 1 ∧ ¬detected ∧ lost ✓
- Clean run (p=0): zero PNS/Eve events ✓

### Physics regressions
- Full intercept-resend QBER (3× n=3000): mean 0.25 ∈ 25%±3% ✓
- PNS QBER (n=5000, μ=0.5, p=0.8): < 0.05 ✓
- Noise flip rate (n=3000, level=0.3): ~0.30 ∈ [0.2, 0.4] ✓

### Event stream sampling
- n ≤ 500 → all indices ✓
- n=2000 → ≤ 504 indices (cap + rare rescue) ✓
- Deterministic: same states → same selection ✓
- Sorted, no duplicates ✓

### API integration (TestClient)
- Response contains event_stream + transmission ✓
- n=200: event_stream length 200, bit_stream == total_detections ✓
- n=5000: event_stream ≤ 504, transmission.generated == 5000, truncated flag ✓
- All new fields present in serialized records ✓

## Regression run (old suite)

`tests/runs/2026-05-04_comprehensive-validation/suite`:
**85 passed, 9 skipped** (149 s) — no regressions from the event-model change.
