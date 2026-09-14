# Design — 2026-09-14 QBER Small-Sample (Audit C1)

## Representation
`estimate_qber()` now returns two additions:
- `qber`: `float | None` — `None` when not estimated
- `qber_estimated`: `bool`

Insufficient-sample branch (`sifted_count < QBER_MIN_SIFTED_COUNT`) returns
`qber=None`, `qber_estimated=False`, `sample_size=0`, and **sacrifices no
bits** (`remaining_*` = all sifted bits).

## Minimum-sample policy
- `QBER_MIN_SAMPLE_SIZE = 10` (sampled sifted bits) — explicit constant in
  `core/constants.py`.
- `QBER_MIN_SIFTED_COUNT = ceil(10 / SAMPLE_FRACTION_FOR_QBER) = 100`.

Rationale: a `<10`-bit sample cannot express a QBER at the resolution used
elsewhere in the simulator, and the previous behaviour silently produced an
empty sample. No pre-existing independent QBER minimum was found in the
repository; the decoy module's `PNS_DETECTION_MIN_DECOY_N = 30` is a
separate estimator's policy and is intentionally not reused.

## Propagation
- `core/metrics.compute_skr(qber=None)` → `0.0` (cannot certify), no crash.
- `core/protocol.extract_key()` aborts when `qber_estimated` is False.
- `core/pns.compute_pns_security()` guards `qber_misleading` against `None`.
- `models/schemas.SimulationResponse`: `qber: float | None = None`,
  `qber_estimated: bool = False`.
- `routers/simulation.py`: `qber=(round(v,6) if v is not None else None)`,
  `qber_estimated=<flag>` — no coercion.
- Frontend: store getter returns `null` (not `0`); ResultsPage, BottomPanel,
  QBERChart, GuidedExercises branch on `qber_estimated`; null renders as
  "Not estimated"/"—"/"UNDETERMINED".

## Experiments
exp2/exp4 default `n_bits` 8 → 300 (`max_photons` 20 → 300) so ~150 sifted
bits ≥ 100 minimum. Backend schema cap 20 → 300; frontend table/modal
aligned.

## Test strategy
Synthetic `sift_result` builders give exact control over `sifted_count` and
error count for the boundary cases (0, 1, 2, 9, 50, 99, 100, 1000), plus
full-pipeline API cases at small and adequate N, and an exp2/exp4 preset
adequacy check.

## Historical harness handling
The 2026-05-02 and 2026-05-04 conftests previously stored `qber` as a
`float`; they are adapted to carry `None`, exclude unestimated trials from
averages, and represent an all-unestimated trial mean as `NaN`. Physics
assertions are unchanged.
