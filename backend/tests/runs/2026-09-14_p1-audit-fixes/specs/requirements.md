# Requirements — P1 Audit Fixes (H1–H7)

Source: backend audit findings. Physics authority:
`docs/PHYSICS_CONTRACT.md`. Backend is the source of truth.

Rules observed while implementing:
- Inspect the repository before modifying; do not assume a documented
  fix is present in code.
- Do not change physics to make a test pass.
- Preserve public API compatibility.
- Preserve historical Campaign 1 results; do not re-run Campaign 1.
- Do not weaken detection criteria to raise pass rates.
- Stop and report if a fix conflicts with the physics contract.

## H1 — Vacuum gain / dark counts
The gain accumulator must count a *registered* detector click on a
vacuum slot. Requirement: `Y_0 = Q_vac` may be > 0 in realistic
detector mode (dark counts), while a PNS-blocked slot never counts.
The dark-count model itself is unchanged.

## H2 — Decoy sensitivity at long distance
Detection power at 100 km, N=10000, p_block≈0.4 is intrinsically low
because the absolute decoy-gain shift shrinks with `P_survive`. The
criterion (`α = 0.01`, family binomial tests) must **not** be weakened.
Requirement: characterise the limit, and assert the separation
(`shift / sigma`) is worse at 100 km than at 10 km.

## H3 — Cloning probe
Must implement the PHYSICS_CONTRACT §11 CNOT model: rectilinear states
invariant, diagonal states maximally mixed. Requirement: all-lane probe
QBER ≈ 25%, single-lane ≈ 25%/3, and never ≈ 50%.

## H4 — Authoritative QBER
`Q = pn + p/4 − (p/2)·pn`, clamped to 0.5, mixed with dark counts:
`Q_final = Q·(1 − dark_fraction) + 0.5·dark_fraction`. The chart and the
simulator must use the same function. Since `Eve.intercept` applies the
attack only to reached photons, the rate *among reached* photons is
`p/4` and the mixing is with `pn`; the chart (all photons) uses the
same multiplicative form.

## H5 — Event-stream cap
`len(select_event_stream_indices(...)) <= cap` always (cap = 500).
Rescue of rare categories must happen *within* the cap, not on top.

## H6 — Noise state consistency
A noise flip changes the bit within the current basis; `state_label`
and `polarization_angle` must remain canonical for
`(basis, bit)` via `STATE_LABELS` / `POLARIZATION_ANGLES`.

## H7 — Deterministic replay
One `numpy.random.Generator` per simulation. `create_rng(seed)` is the
only entry point; `resolve_rng` supplies a fresh generator when none is
injected. An optional `seed` on `SimulationRequest` replays a run
exactly; `None` stays stochastic. Pseudo-random only — not a CSPRNG or
QRNG. Historical suites that used `np.random.seed` are inactive and
unchanged.
