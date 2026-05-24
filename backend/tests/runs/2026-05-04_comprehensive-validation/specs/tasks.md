# Task Checklist — Comprehensive Validation

## Setup
- [x] Create run folder `2026-05-04_comprehensive-validation/`
- [x] Create `specs/requirements.md`
- [x] Create `specs/design.md`
- [x] Create `specs/tasks.md` (this file)

## Suite Files
- [x] `suite/conftest.py`
- [x] `suite/test_photon_count.py`
- [x] `suite/test_distance.py`
- [x] `suite/test_noise.py`
- [x] `suite/test_eve_attacks.py`
- [x] `suite/test_realistic_mode.py`
- [x] `suite/test_gates.py`
- [x] `suite/test_single_photon.py`
- [x] `suite/test_frontend_sync.py`
- [x] `suite/collect_measured_values.py`
- [x] `suite/generate_reports.py`

## Execution
- [x] Run fast tests only (smoke check)
- [x] Run full suite
- [ ] Run collect_measured_values.py (generates .results_cache.json)
- [ ] Run generate_reports.py (generates TEST_RESULTS.md, TEST_FINDINGS.md)
- [ ] Start backend, run test_frontend_sync.py separately

## Documentation
- [x] Write `README.md`
- [x] Update `docs/TEST_LOG.md`
- [x] Update `docs/CHANGELOG.md`
- [x] Log any physics deviations in `docs/ERROR_LOG.md`
