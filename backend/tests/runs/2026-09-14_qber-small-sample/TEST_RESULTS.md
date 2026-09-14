# TEST_RESULTS — 2026-09-14 QBER Small-Sample (Audit C1)

Command:
```
"qkd-simulator\backend\.venv\Scripts\python.exe" -m pytest qkd-simulator/backend/tests/runs/2026-09-14_qber-small-sample/suite/ -v --tb=short
```

Result: **19 passed / 0 failed** (13.25 s)

## Tests executed (targeted)
| Test | Case | Result |
|------|------|--------|
| `test_min_sample_policy_is_explicit` | explicit minimum constants | PASS |
| `test_insufficient_sample_not_estimated[0]` | sifted_count = 0 | PASS |
| `test_insufficient_sample_not_estimated[1]` | sifted_count = 1 | PASS |
| `test_insufficient_sample_not_estimated[2]` | sifted_count < minimum | PASS |
| `test_insufficient_sample_not_estimated[9]` | sifted_count < minimum | PASS |
| `test_insufficient_sample_not_estimated[50]` | sifted_count < minimum | PASS |
| `test_insufficient_sample_not_estimated[99]` | sifted_count = minimum-1 | PASS |
| `test_insufficient_sample_threshold_not_falsely_reported` | 5 wrong bits, no estimate | PASS |
| `test_insufficient_sample_extract_key_aborts` | key extraction aborts | PASS |
| `test_at_minimum_sample_estimated` | sifted_count = minimum (100) | PASS |
| `test_large_sample_estimated_normal` | normal sample (1000) | PASS |
| `test_high_error_sample_breaches_threshold` | valid QBER >= 11% breaches | PASS |
| `test_compute_skr_none_is_zero_not_measured_zero` | SKR(None) = 0.0 | PASS |
| `test_compute_skr_normal_still_works` | SKR regression | PASS |
| `test_full_intercept_resend_small_N_not_estimated` | full Eve, N=8 | PASS |
| `test_full_intercept_resend_adequate_N_estimated` | full Eve, N=2000 | PASS |
| `test_clean_adequate_N_estimated_and_secure` | clean, N=2000 | PASS |
| `test_api_qber_estimated_flag_consistent` | qber_estimated == (qber is not None) | PASS |
| `test_exp2_exp4_sample_size_adequate` | exp2/exp4 N >= minimum | PASS |

## Concrete observed values (live API smoke test)
| Case | qber | qber_estimated | skr | breached | sifted |
|------|------|----------------|-----|----------|--------|
| small-N full Eve (N=8) | `null` | `false` | 0.0 | false | 5 |
| adequate-N full Eve (N=2000) | 0.234694 | `true` | 0.0 | true | 988 |
| clean 10km (N=2000) | 0.0 | `true` | 0.3215 | false | 643 |
| exp4 manual (N=300) | 0.071429 | `true` | 0.121042 | false | 141 |

## Regression re-runs (post-fix)
| Suite | Result |
|-------|--------|
| 2026-05-02_physics-accuracy | 113 passed / 0 failed |
| 2026-05-04_comprehensive-validation | 85 passed / 9 skipped |
| 2026-09-09_event-model-transmission | 70 passed / 1 skipped |
| frontend vitest | 38 passed |
| frontend build (vite) | PASS |
