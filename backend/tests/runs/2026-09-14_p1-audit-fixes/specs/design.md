# Design — P1 Audit Fixes (H1–H7)

## Test architecture
- `suite/conftest.py`
  - Prepends `backend/` and the suite dir to `sys.path`.
  - `run_pipeline(...)` mirrors `routers/simulation.py` order exactly
    (Alice → WCP → Channel → Eve → PNS → gates → Bob) and draws all
    randomness from one `create_rng(seed)`.
  - `sifted_qber(states)` returns `(QBER, n_sifted)` over
    basis-matched `measured` slots.
  - Fixtures: `pipeline` (the runner) and session-scoped `client`
    (FastAPI `TestClient` on `main:app`).

## Code changes exercised
| Fix | Module | Change |
|-----|--------|--------|
| H1 | `core/decoy.py` | `compute_gains`: `detected and not pns_blocked` (dropped `and not lost`). |
| H2 | `core/decoy.py` | Module-level documentation of long-distance power loss; criterion untouched. |
| H3 | `core/gates.py` | `apply_cloning_probe`: CNOT model, 25%. |
| H4 | `core/metrics.py` | `theoretical_qber(...)`; `generate_chart_data` uses it with detector params. |
| H5 | `core/events.py` | `select_event_stream_indices`: reserve capacity, stride budget, absolute cap. |
| H6 | `core/channel.py` | Noise flip keeps `state_label` / `polarization_angle` canonical. |
| H7 | `core/rng.py` + modules | `create_rng` / `resolve_rng`; single generator threaded through. |

Router: `routers/simulation.py` builds one `rng = create_rng(request.seed)`
and passes it to every stage; `models/schemas.py` adds `seed: int|None`.

## Test files → requirements
- `test_h1_vacuum_gain.py` — synthetic click accounting; `dark_count_prob=1.0`
  forces vacuum clicks; `Y_0 == Q_vac`.
- `test_h2_decoy_long_distance.py` — analytic shift/sigma characterisation
  (deterministic); criterion constants unchanged; slow 6-seed empirical bound.
- `test_h3_cloning_probe.py` — CNOT unit invariance/mixing; all-lane ~25%,
  single-lane ~8.3%, guard `< 0.40`.
- `test_h4_chart_qber.py` — parametrised `theoretical_qber` values; chart
  equals formula incl. dark fraction at d=0; empirical vs model.
- `test_h5_event_cap.py` — cap over many N with tail-placed rare events;
  custom cap; API `event_stream <= 500`.
- `test_h6_noise_state_consistency.py` — `noise=1.0` full-flip canonicality;
  partial-noise stream; no-flip baseline.
- `test_h7_rng_reproducibility.py` — RNG module; internal same/different seed;
  API same/different/unseeded and full WCP+PNS+gates replay.

## Determinism policy
Every statistical assertion that could be flaky uses a fixed `seed` and
a wide tolerance. The one empirical long-distance test is marked
`slow` and asserts a coarse bound, not an exact count.

## Out of scope
P0 C1–C3 (`2026-09-14_qber-small-sample`). Frontend consumption changes.
Campaign 1 re-runs.
