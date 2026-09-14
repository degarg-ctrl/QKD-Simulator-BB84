# TEST_FINDINGS — 2026-09-14 P1 Audit Fixes (H1–H7)

## Defects confirmed and corrected
| ID | Defect (pre-fix) | Correction | Pinned by |
|----|------------------|-----------|-----------|
| H1 | A detected click on a vacuum (`lost`) slot was excluded from `Y_0` (vacuum gain forced toward 0). | `compute_gains()` counts a registered click as `bool(detected) and not pns_blocked` (dropped the extra `and not lost`). Dark-count model unchanged. | 8 unit tests incl. forced-dark vacuum and PNS-blocked exclusion |
| H2 | Decoy detection almost blind at long distance for feasible N. | **Characterised, not "fixed".** Exact-binomial rule (`PNS_DETECTION_ALPHA=0.01`, Bonferroni over decoy+signal) kept intact; power loss documented. | analytic separation tests + 1 slow empirical bound |
| H3 | `apply_cloning_probe()` randomised every affected photon over all 4 BB84 states → ~50% QBER. | CNOT model: `+` states invariant; `x` states maximally mixed → net ~25%. | 4 unit + 3 statistical tests |
| H4 | Chart used an additive QBER approximation that ignored the cross-term. | `metrics.theoretical_qber()` = `q_signal*(1-df)+0.5*df`, `q_signal=pn+p/4-(p/2)pn`, clamped [0,0.5]; chart consumes it. | 33 tests incl. exact chart↔formula and empirical-vs-model |
| H5 | `event_stream` could reach 504 (> cap) when rare categories were force-included. | Rare-category capacity reserved first; `stride_budget=max(1,cap-reserved)` → `len <= 500` absolute. | 16 tests incl. exact-500 and API |
| H6 | A noise bit-flip changed `bit` but left stale `state_label`/`polarization_angle`. | On flip, label and angle are recomputed from `(basis, bit)` via `STATE_LABELS`/`POLARIZATION_ANGLES`; basis unchanged. | 4 tests incl. canonical consistency over ~1200 flips |
| H7 | Mixed `np.random.*` global state and `default_rng()` blocked seeded replay. | One `Generator` per request via `create_rng(request.seed)`, threaded through alice/bob/channel/eve/pns/protocol/gates; optional `seed` request field. | 10 tests incl. API byte-identical replay |

## Design decisions
1. **H1** — a vacuum pulse that nevertheless registers (dark count) is a real
   detector event and is exactly what `Y_0` is meant to measure; excluding it
   conflated "no photon" with "no click". PNS-blocked slots remain excluded.
2. **H2** — the correct response to a statistical-power limit is to document
   it, not to lower the significance level and spend false-positive budget.
   `PNS_DETECTION_MIN_DECOY_N = 30` and `PNS_DETECTION_ALPHA = 0.01` unchanged.
3. **H3** — simplified two-state CNOT demonstration of the no-cloning theorem,
   **not** an optimal universal (1→2) cloner. No claim of a standard attack.
4. **H4** — one authoritative QBER model defined in `metrics.py` and mirrored
   in `PHYSICS_CONTRACT.md`; the frontend must not invent physics. The
   simulator's sifted error equals the model exactly (dark mixture aside),
   verified empirically.
5. **H5** — a hard `EVENT_STREAM_CAP = 500` absolute bound; the cap is about
   payload size, and rare categories are guaranteed representation within it.
6. **H7** — pseudo-random replay only, explicitly documented as **not**
   cryptographic and **not** a QRNG. `seed=None` yields a fresh stochastic run.

## Test-authoring correction during this session
The first H3 run failed one unit test (`test_diagonal_state_becomes_mixed_diagonal`):
the test assumed lane == photon index, but a photon's lane is `index % 3`
(`core/gates.py`), so probing lane 1 hit a rectilinear photon. The test was
corrected to probe lane 2 (the diagonal `'x'` photon). This was a test bug, not
a physics/implementation defect; the implementation was already correct.

## Physics
No physics equation was changed except where the audit documented it. The BB84
sift/QBER/SKR/threshold law and the intercept-resend 25% law are unchanged.
`PHYSICS_CONTRACT.md` §6.1, §11, §14, §16, §17 were updated to state the H1,
H3, H4, H5, H6, H7 semantics authoritatively.

## Historical-evidence handling
Campaign 1 (766 runs) and the preceding `2026-09-09_event-model-transmission`
results are preserved verbatim and were not re-run. Inactive historical suites
(`2026-05-02`, `2026-05-04`) that depend on `np.random.seed` + `Alice()` global
state were **not** re-executed here; they would need adaptation to the seeded
`Generator` API before any future run.
