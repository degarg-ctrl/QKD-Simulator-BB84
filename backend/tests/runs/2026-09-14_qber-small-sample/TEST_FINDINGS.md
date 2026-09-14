# TEST_FINDINGS — 2026-09-14 QBER Small-Sample (Audit C1)

## Defect confirmed and corrected
The pre-fix `estimate_qber()` produced `sample_size = 0` for
`sifted_count < 10` and returned `qber = 0.0`. Full intercept-resend at
small N therefore reported a zero QBER despite complete interception.

Post-fix, an insufficient sample is explicitly **not estimated**
(`qber = None`, `qber_estimated = False`), and this state survives
serialization without being coerced to `0.0`.

## Design decisions
1. **Minimum policy.** `QBER_MIN_SAMPLE_SIZE = 10` sampled sifted bits
   (`QBER_MIN_SIFTED_COUNT = 100` sifted bits). A 10-bit sample is the
   smallest for which a binomial error fraction is meaningfully
   expressible at the 1.0 QBER granularity used throughout the simulator;
   the value is made an explicit, documented constant rather than relying
   on the accidental `floor()` behaviour. There was no pre-existing
   independent minimum for QBER (the decoy module has its own, unrelated
   `PNS_DETECTION_MIN_DECOY_N = 30`, which applies to a different
   estimator and was left untouched).
2. **No coercion.** `compute_skr(None)` returns `0.0` (security cannot be
   certified) but the response preserves `qber = None` and sets
   `qber_estimated = False`. `extract_key()` aborts for an unestimated
   QBER. `compute_pns_security()` guards `qber_misleading` against `None`.
3. **exp2/exp4.** Both are manual user-input experiments. A minimum
   sifted key of 100 requires ~200 photons at ~50% sifting; the legacy
   default of 8 (and even a 100-photon default) could not reliably reach
   the minimum. Default raised to **300 photons** (cap 300), giving
   ~150 sifted bits — comfortably above the threshold while remaining a
   tractable manual-entry / payload size. Backend schema, `experiments.py`
   and the frontend table/modal were updated consistently.

## Physics
No physics equation was changed. QBER, SKR, binary entropy, the 11%
threshold and the intercept-resend 25% law are unchanged for sufficient
samples (verified: full Eve N=2000 → QBER 0.2347, clean → 0.0).

## Historical-evidence handling
Campaign 1 and the recorded post-Campaign-1 validation were produced by
the earlier implementation and are preserved verbatim as historical
evidence. They are not restated as if this fix had existed then.

## Regression harness adaptation
The historical harnesses (2026-05-02, 2026-05-04) stored `qber` as a plain
`float` and crashed on `float(None)` for the small-N / single-photon paths
that now legitimately return an unestimated QBER. The harnesses were
adapted to carry `qber=None` faithfully (never coerced to 0), average only
estimated trials (unestimated trials excluded, not treated as 0), and the
`test_qber_bounds_property` now asserts on the estimated branch only. This
is a harness representation fix, not a change to any test's physics
intent. Post-adaptation the suites reproduce their historical pass counts
(85/9-skip and 113/0).
