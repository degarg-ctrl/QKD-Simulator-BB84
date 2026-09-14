# Requirements — Event Model & Transmission Accounting Tests

## Why this test run exists

The visualization overhaul (v0.5.0) extends the API with a per-pulse
event model (`event_stream`) and full-simulation transmission
accounting (`transmission`). The frontend animation now renders fiber
loss, detector loss, dark counts, Eve interception, and PNS
splitting — which is only scientifically defensible if every rendered
event comes from the backend simulation.

These tests verify that:

1. **Accounting identities hold** — the counts conserve
   (TRANSMISSION-001).
2. **Statistics match physics** — fiber attenuation, detector
   efficiency, dark counts (TRANSMISSION-002..004).
3. **Event categories are consistent** — mutually exclusive primary
   outcomes, no impossible combinations (TRANSMISSION-005).
4. **Eve/PNS semantics are physically grounded** — attacks only apply
   to pulses that reached Eve; serialized fields match simulated
   outcomes.
5. **Physics invariants survive** — 25%±3% QBER full intercept, PNS
   QBER < 5%, survival benchmarks, noise rate.
6. **Sampling is deterministic** — event_stream selection is a pure
   function of the event records.
