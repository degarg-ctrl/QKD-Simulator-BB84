# Tasks — P1 Audit Fixes (H1–H7)

## Reconnaissance
- [x] Inspect audit-relevant modules, router, schemas, existing suites
- [x] Confirm PHYSICS_CONTRACT.md sections for H1/H3/H4/H5

## Implementation
- [x] H7 `core/rng.py` (`create_rng`, `resolve_rng`) + thread rng through
      alice, bob, channel, eve, pns, protocol, gates
- [x] H7 `models/schemas.py` add `seed`; `routers/simulation.py` single rng
- [x] H1 `core/decoy.py` `compute_gains` vacuum dark-count semantics
- [x] H2 `core/decoy.py` long-distance limitation documentation
- [x] H3 `core/gates.py` `apply_cloning_probe` CNOT model (25%)
- [x] H4 `core/metrics.py` `theoretical_qber` + chart uses it
- [x] H5 `core/events.py` absolute event-stream cap (500)
- [x] H6 `core/channel.py` noise flip keeps label/angle canonical
- [x] `docs/PHYSICS_CONTRACT.md` §6.1, §11, §14, §16, §17

## Tests authored (NOT executed)
- [x] `suite/conftest.py` pipeline runner + client fixture
- [x] `test_h1_vacuum_gain.py`
- [x] `test_h2_decoy_long_distance.py`
- [x] `test_h3_cloning_probe.py`
- [x] `test_h4_chart_qber.py`
- [x] `test_h5_event_cap.py`
- [x] `test_h6_noise_state_consistency.py`
- [x] `test_h7_rng_reproducibility.py`

## Documentation / config
- [x] Run-folder `README.md` + `specs/`
- [x] `backend/pytest.ini` testpaths → this run
- [x] `docs/CHANGELOG.md` entries
- [x] `docs/ERROR_LOG.md` entries for the corrected defects

## Pending (requires review / a supervised run)
- [ ] Execute the suite and record `TEST_RESULTS.md`
- [ ] Record analysis in `TEST_FINDINGS.md`
- [ ] Restore `pytest.ini` testpaths if the reviewer prefers
      `2026-09-09_event-model-transmission` as the default active run
