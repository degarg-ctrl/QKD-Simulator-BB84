# Requirements — 2026-09-14 QBER Small-Sample (Audit C1)

## Why this test was run
An independent audit identified defect **C1**: the QBER estimator returned
`0.0` for sifted keys whose error rate was never actually measured, because
`sample_size = floor(0.10 * sifted_count)` collapses to 0 for
`sifted_count < 10`. This is scientifically misleading: an unmeasured key
must not be presented as error-free, and full interception at small N must
not masquerade as a clean channel.

## Required behaviour (acceptance)
1. Insufficient sample → QBER is explicitly **not estimated**
   (`qber = None`, `qber_estimated = False`); never a fake `0.0`.
2. Sufficient sample → normal QBER with `qber_estimated = True`.
3. The state propagates through the backend calculation, the Pydantic/API
   schema, `/api/simulate`, the frontend result handling, QBER display,
   threshold-breach logic and SKR computation.
4. `None` is never accidentally turned into `0`.
5. The minimum sample is an explicit, documented, scientifically defensible
   constant (not accidental `floor()` behaviour), and reuses any existing
   in-repo minimum policy if one exists.
6. Experiments intended to demonstrate QBER/interception (exp2, exp4) use a
   sample size large enough for the intended pedagogical result.
7. Existing valid QBER behaviour is preserved for sufficient samples.
8. Historical Campaign 1 evidence is preserved and not retroactively
   restated.

## Out of scope
C2/C3/H1–H7 and other audit items — deferred to separate tasks.
