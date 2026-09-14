# TEST_RESULTS — 2026-09-14 P1 Audit Fixes (H1–H7)

Command:
```
"qkd-simulator\backend\.venv\Scripts\python.exe" -m pytest tests/runs/2026-09-14_p1-audit-fixes/suite -q --tb=short
```

Result: **82 passed / 0 failed** (4.09 s)

Environment: Python 3.14.3, pytest 9.0.2, numpy Generator (`default_rng`).

## Per-file summary
| File | Tests | Result |
|------|-------|--------|
| `test_h1_vacuum_gain.py` | 8 | PASS |
| `test_h2_decoy_long_distance.py` | 5 (1 `slow`) | PASS |
| `test_h3_cloning_probe.py` | 7 | PASS |
| `test_h4_chart_qber.py` | 33 | PASS |
| `test_h5_event_cap.py` | 16 | PASS |
| `test_h6_noise_state_consistency.py` | 4 | PASS |
| `test_h7_rng_reproducibility.py` | 10 | PASS |

## Concrete observed values (seeded; live module / API smoke)
| Fix | Case | Observed |
|-----|------|----------|
| H1 | 100 km, N=10000, WCP+decoy | `vacuum_gain=0.000000`, `signal_gain=0.002270`, `decoy_gain=0.002005` (Y0 below the ~0.01-click detection floor at this N; accounting pinned deterministically by unit tests) |
| H3 | Clone probe on all 3 lanes, N=6000 | QBER `0.2414` (n_sifted=3078) — ~25%, not ~50% |
| H3 | Clone probe on 1 lane, N=6000 | QBER `0.0864` (n_sifted=3078) — ~1/3 of 25% |
| H4 | noise=0.10, p=1.00, ideal, N=8000 | empirical `0.3065` vs model `0.3000` (n_sifted=4007) |
| H4 | noise=0.05, p=0.50, ideal, N=8000 | empirical `0.1622` vs model `0.1625` (n_sifted=3927) |
| H5 | API N=10000, PNS p=0.8, 50 km | `status=200`, `event_stream_len=479` (<= 500), `truncated=True` |
| H7 | API seed=42 twice | responses byte-identical (`True`), digest `a508dcb7fd08a098` |
| H7 | API seed=42 vs seed=43 | `event_stream` differs (`True`) |

## Notes
- The `slow` H2 characterisation (`test_long_distance_detection_is_rare`, 6 ×
  N=10000 at 100 km) passed within its bound (partial/near-chance detection,
  criterion not weakened).
- No historical run was re-executed; Campaign 1 (766 runs) and the preceding
  `2026-09-09_event-model-transmission` suite are untouched.
