# Test Run: 2026-09-09 Event Model & Transmission Accounting

## What is tested

The v0.5.0 event-model extension of the BB84 simulator backend:

1. **Event records** — every serialized `PhotonRecord` reflects actual
   simulated outcomes (channel/Eve/PNS/WCP/detector/sifting fields).
2. **Transmission accounting identities** — the full-simulation counts
   satisfy the conservation invariants.
3. **Fiber attenuation statistics** — observed survival fraction vs
   `P_survive = 10^(-0.2*d/10)`.
4. **Detector efficiency** — ideal (eta=1, dark=0) vs realistic
   (eta=0.85, dark=1e-5) modes.
5. **Dark count behavior** — registered clicks without real photons.
6. **Event classification consistency** — mutually exclusive outcome
   categories (fiber-lost / vacuum / PNS-blocked / detector-loss /
   real detection / dark count).
7. **Eve/PNS event semantics** — attacks only apply to pulses that
   physically reached Eve (`fiber_survived=True`); post-Eve resend
   state serialized from the backend.
8. **event_stream sampling** — deterministic stride, cap 500, rare
   category augmentation.
9. **Physics regressions** — QBER 25%±3% full intercept-resend,
   PNS QBER < 5%, 50/100 km survival benchmarks, decoy detection
   still functioning post-change.

## How to run

```powershell
cd qkd-simulator/backend
& ".\.venv\Scripts\python.exe" -m pytest tests/runs/2026-09-09_event-model-transmission/suite -v --tb=short

# Fast subset only
& ".\.venv\Scripts\python.exe" -m pytest tests/runs/2026-09-09_event-model-transmission/suite -m fast -v
```

pytest.ini `testpaths` currently points at this suite.

## Context

Implements the event model + transmission accounting phases of the
visualization-overhaul plan. The backend is the source of truth; the
frontend animation consumes `event_stream` + `transmission` and must
never invent scientifically meaningful state.
