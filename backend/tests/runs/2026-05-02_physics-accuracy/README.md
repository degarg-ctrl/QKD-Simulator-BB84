# Test Run: 2026-05-02 — Physics Accuracy Testing Suite

## What was tested
Full BB84 QKD Simulator physics accuracy validation covering 113 test cases across:

| Task | File | Tests |
|---|---|---|
| Task 2 — Physics Benchmarks | `test_physics_benchmarks.py` | QBER, SKR, attenuation, entropy |
| Task 3 — Gate Transformations | `test_gates.py` | H/X/Y/Z/S/T state transforms, round-trips |
| Task 4 — WCP / PNS / Decoy | `test_wcp_pns_decoy.py` | Poisson model, PNS attack, decoy protocol |
| Task 5 — Property-Based | `test_property_based.py` | Hypothesis invariants (200 examples each) |
| Task 6 — Parameter Sweep | `test_parameter_sweep.py` | 20+ QBER/attenuation sweeps |

## How to re-run

```powershell
# From qkd-simulator/backend/
& ".\.venv\Scripts\python.exe" -m pytest tests/suite/ -v --tb=short

# Fast tests only (< 1 min)
& ".\.venv\Scripts\python.exe" -m pytest tests/suite/ -m fast -v

# Slow tests only (full precision)
& ".\.venv\Scripts\python.exe" -m pytest tests/suite/ -m slow -v
```

## How to regenerate reports

```powershell
# Re-run the measurement collector (appends to TEST_RESULTS.md / TEST_FINDINGS.md in THIS folder)
& ".\.venv\Scripts\python.exe" tests/suite/collect_measured_values.py
```

## Files in this folder

| File | Description |
|---|---|
| `TEST_RESULTS.md` | All test results with measured numeric values |
| `TEST_FINDINGS.md` | Physics analysis, deviations, recommendations |
| `.results_cache.json` | Raw JSON results cache from pytest session |
| `specs/requirements.md` | Original test requirements that drove this suite |
| `specs/design.md` | Technical design document for the test suite |
| `specs/tasks.md` | Task checklist (tracking completion) |

## Key results summary

- **113 tests total — all PASSED**
- Full Eve QBER: 0.258 ± 0.008 (expected 0.250) ✅
- PNS attack QBER: < 0.02 — undetectable by threshold ✅
- 50 km survival: 0.084 (expected ~0.10) ✅
- 100 km survival: 0.008 (expected ~0.01) ✅
- Gate round-trips (H, X, Z): error < 1e-9° ✅
- Binary entropy symmetry: max error < 1e-10 ✅
- SKR = 0 for all QBER ≥ 0.11 ✅

## Known deviations (physics-correct)

1. Gates Y/Z raise QBER > 0.5 when applied globally — correct circuit behavior
2. Decoy normalized-gain formula has false-positive at 0 km — known limitation
3. Burst attack QBER > 0.5 at extreme params — threshold_breached=True, correct
