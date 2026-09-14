# Design — Event Model & Transmission Accounting Tests

## Test architecture

- `conftest.py` provides `run_pipeline()` — mirrors the exact router
  pipeline order (Alice → WCP → Channel → Eve → PNS → Bob) and returns
  measured states, event records, accounting, and stream indices.
  Using the real core modules (not mocks) means regressions in the
  core physics are caught here too.
- `test_transmission_accounting.py` — TRANSMISSION-001..005 plus
  stream sampling and API integration (via fastapi TestClient).
- `test_eve_pns_events.py` — Eve/PNS event semantics and physics
  regressions.

## Statistical method

Binomial observables are checked with a 4-sigma tolerance:
  |observed - expected| <= 4 * sqrt(p(1-p)/n)

This keeps the false-failure rate negligible while remaining tight
enough to catch real drift. Benchmarks (50km ~10%, 100km ~1%) use
pre-computed windows matching the contract.

## Markers

- `fast` — quick sanity (< a few seconds)
- `slow` — statistical precision (n≥3000, multiple trials)
- `sync` — requires the full FastAPI app (TestClient in-process)
