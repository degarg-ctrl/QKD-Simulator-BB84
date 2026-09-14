# Test Run: 2026-09-14 P1 Audit Fixes (H1–H7)

## What is tested

Regression coverage for the Priority-1 findings from the backend audit.
P0 (C1–C3) is handled in the separate `2026-09-14_qber-small-sample`
run and is out of scope here.

| ID | Area | Fix under test |
|----|------|----------------|
| H1 | Vacuum gain / dark counts | A registered click on a vacuum (`lost`) slot now counts toward `Y_0`; PNS-blocked slots still never count. |
| H2 | Decoy long-distance sensitivity | Characterisation of statistical-power loss at 100 km; decision criterion **not** weakened. |
| H3 | Cloning probe disturbance | CNOT model: rectilinear invariant, diagonal maximally mixed → ~25% QBER (was ~50%). |
| H4 | Chart vs simulator QBER | `metrics.theoretical_qber()` is the single authoritative model used by the chart. |
| H5 | Event-stream cap | `len(event_stream) <= 500` absolute (was up to 504). |
| H6 | Noise state consistency | A noise bit-flip updates `bit`, `state_label`, `polarization_angle` together; basis unchanged. |
| H7 | RNG replay | One `Generator` per request via `create_rng(seed)`; `seed` request param enables deterministic replay. |

## How to run

```powershell
cd qkd-simulator/backend
& ".\.venv\Scripts\python.exe" -m pytest tests/runs/2026-09-14_p1-audit-fixes/suite -v --tb=short

# Fast subset (excludes the long-distance characterisation)
& ".\.venv\Scripts\python.exe" -m pytest tests/runs/2026-09-14_p1-audit-fixes/suite -m "not slow" -v
```

> **Status: executed — 82 passed / 0 failed (4.09 s).** See
> `TEST_RESULTS.md` for the command and observed values, and
> `TEST_FINDINGS.md` for the defect/design record.

## Context

Authoritative physics is `docs/PHYSICS_CONTRACT.md` (updated for
§6.1, §11, §14, §16, §17 as part of these fixes). The backend is the
source of truth; the frontend consumes backend values and must not
invent scientifically meaningful state.

Historical Campaign 1 results (766 runs) are preserved and were **not**
re-run. The immediately preceding active suite,
`2026-09-09_event-model-transmission`, remains on disk unchanged.
