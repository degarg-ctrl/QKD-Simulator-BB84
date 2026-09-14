# 2026-09-14 — QBER Small-Sample Fix (Audit Defect C1)

## What was tested
Audit defect **C1**: `BB84Protocol.estimate_qber()` computed
`sample_size = floor(0.10 * sifted_count)`. For `sifted_count < 10` this
produced a zero-size sample and returned `qber = 0.0` with
`threshold_breached = False` — a scientifically misleading "error-free"
reading for a key whose QBER was never measured.

This run verifies the corrected semantics:
- insufficient sample → `qber = None`, `qber_estimated = False`
  (never a fake `0.0`),
- sufficient sample → normal QBER with `qber_estimated = True`,
- propagation through SKR, key extraction, the API schema and the router,
- exp2/exp4 presets expose an adequate sample size.

## Minimum-sample policy
- `QBER_MIN_SAMPLE_SIZE = 10` sampled sifted bits
- `QBER_MIN_SIFTED_COUNT = ceil(10 / 0.10) = 100` sifted bits
- A sifted key shorter than 100 bits cannot yield a 10-bit sample → QBER is
  **not estimated** and no bits are sacrificed.

## How to re-run
```powershell
& "qkd-simulator\backend\.venv\Scripts\python.exe" -m pytest qkd-simulator/backend/tests/runs/2026-09-14_qber-small-sample/suite/ -v
```

## Result
19 passed / 0 failed in 13.25 s. See `TEST_RESULTS.md` and `TEST_FINDINGS.md`.

Note: this run post-dates the change. Campaign 1 results were produced by
the earlier (pre-fix) implementation and remain **historical evidence**;
they are not restated as if this fix existed during Campaign 1.
