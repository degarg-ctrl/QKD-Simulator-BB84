# Tasks — 2026-09-14 QBER Small-Sample (Audit C1)

- [x] Inspect C1-relevant files (protocol, metrics, pns, schemas, router,
      experiments, frontend QBER consumers, decoy for an existing minimum).
- [x] Define explicit minimum-sample policy in `core/constants.py`.
- [x] Fix `estimate_qber()` → `qber=None` / `qber_estimated=False` when
      insufficient; no fake 0.0; no bits sacrificed.
- [x] Propagate `qber_estimated` through schemas + router (no None→0).
- [x] Fix SKR / threshold-breach / key-extraction logic for unestimated QBER.
- [x] Update frontend to handle `qber=None` / `qber_estimated=False`.
- [x] Raise exp2/exp4 sample sizes to a defensible N (300).
- [x] Add targeted C1 tests (19).
- [x] Run targeted tests (19 PASS).
- [x] Adapt historical harnesses for None; run 2026-05-02 (113 PASS) and
      2026-05-04 (85 PASS / 9 SKIP).
- [x] Run 2026-09-09 event-model suite (70 PASS / 1 SKIP).
- [x] Run frontend vitest (38 PASS).
- [x] Run frontend build (PASS).
- [x] API smoke test `/api/health` + `/api/simulate` (live backend).
- [x] Update documentation (PHYSICS_CONTRACT, CODEBASE_RULES, README,
      CHANGELOG, TEST_LOG, ERROR_LOG, run-folder docs).
- [x] Inspect final diff.
