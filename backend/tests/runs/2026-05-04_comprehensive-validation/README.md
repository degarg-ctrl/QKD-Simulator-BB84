# Comprehensive Validation — Run README
**Run date:** 2026-05-04  
**Run folder:** `backend/tests/runs/2026-05-04_comprehensive-validation/`

## What Was Tested

8 test sections covering every major physics aspect of the BB84 QKD Simulator:

| Section | Scope | Trials |
|---|---|---|
| 1 | n_bits sweep (1K–10K) | 25 per n_bits |
| 2 | Distance sweep (0–150km) | 25 per distance |
| 3 | Noise sweep (0–12%) | 25 per noise level |
| 4 | Eve attack strategies (intercept, partial, burst) | 25 per combo |
| 5 | Realistic WCP + PNS + Decoy mode | 25 per combo (smoke: 5) |
| 6 | Gate functionality (H, X, Y, Z, S, T) | 25 per gate |
| 7 | Single photon mode | 200 per combo |
| 8 | Frontend/Backend API sync (live HTTP) | Single calls |

## How to Re-run

### Step 1 — Fast smoke tests (Section 5 smoke + Section 8)
```powershell
# From qkd-simulator/backend/
& ".\.venv\Scripts\python.exe" -m pytest tests/runs/2026-05-04_comprehensive-validation/suite/ -m fast -v --tb=short
```

### Step 2 — Full suite (all slow tests, ~8–15 min)
```powershell
& ".\.venv\Scripts\python.exe" -m pytest tests/runs/2026-05-04_comprehensive-validation/suite/ -v --tb=short
```

### Step 3 — Collect all measurements and generate reports
```powershell
& ".\.venv\Scripts\python.exe" tests/runs/2026-05-04_comprehensive-validation/suite/collect_measured_values.py
& ".\.venv\Scripts\python.exe" tests/runs/2026-05-04_comprehensive-validation/suite/generate_reports.py
```

### Step 4 — Frontend sync test (backend must be running first)
```powershell
# In one terminal: start the backend
& ".\.venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8000

# In another terminal:
& ".\.venv\Scripts\python.exe" -m pytest tests/runs/2026-05-04_comprehensive-validation/suite/test_frontend_sync.py -v
```

## Physics Contract Limits Tested

| Rule | Value |
|---|---|
| Full Eve QBER | 25% ± 3% |
| SKR = 0 when QBER | ≥ 11% |
| 50km photon survival | ~10% ± 3% |
| 100km photon survival | ~1% ± 2% |
| PNS attack QBER | < 5% |

## Output Files

| File | Contents |
|---|---|
| `TEST_RESULTS.md` | Averaged numeric results per combo, pass/fail per assert |
| `TEST_FINDINGS.md` | Deviations from theory, references, manual observations |
| `.results_cache.json` | Raw JSON data (auto-generated) |
