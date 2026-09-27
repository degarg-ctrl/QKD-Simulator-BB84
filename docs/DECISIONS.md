# Architecture and Design Decisions
Format: [YYYY-MM-DD] | Decision | Rationale | Alternatives Considered

[2026-09-27] | Adopt graphite, copper, mineral teal and muted violet as the dark visual foundation
Rationale: The simulator needs a darker laboratory composition that avoids the prior generic blue/cyan treatment while retaining distinct, accessible meanings for source states, diagonal states, warnings and errors. Shared semantic CSS tokens and Canvas colors now use graphite surfaces, copper interaction accents, mineral teal for rectilinear/source states, muted violet for diagonal/Bob states, amber warnings and restrained crimson errors. Canonical BB84 state descriptors and native MathML helpers provide one accessible representation across later phases. Measured contrast against the principal surfaces ranges from 5.52:1 to 16.69:1 for tested text and status pairs.
Alternatives: Retain the blue/cyan palette (did not meet the requested visual direction); use a heavily neon or patterned theme (reduced instrument readability); duplicate state and equation markup in each page (would drift across Simulator, Results and Guide).

[2026-09-27] | Add an opt-in complete playback stream while retaining both legacy capped streams
Rationale: Above 500 pulses, the representative event sample and detected-only bit stream described different record populations. The frontend now requests one ordered full-run stream, keys all playback/table state by original pulse index, and batches only the visual representation. Existing API clients retain the prior response size because the full stream is opt-in; `event_stream` and `bit_stream` caps are unchanged.
Alternatives: Increase or remove the legacy caps globally (breaking payload expectations); synthesize missing rows in the frontend (scientifically invalid); keep substituting `bit_stream` at completion (caused the recorded identity jump).

[2026-09-27] | Use a tiered QBER sample: 50 bits for 100 <= N < 500, then 10% for N >= 500
Rationale: A uniform 10% rule produced only 10-49 sampled bits in the middle range, making QBER jump too sharply per observed error. A fixed 50-bit sample gives 2-percentage-point resolution and meets the percentage rule continuously at N=500. Runs below 100 sifted bits retain the existing low/very-low diagnostic previews and no official security decision.
Alternatives: Keep uniform 10% sampling (too coarse for N=100-499); use 100 sampled bits (would consume the entire key at N=100); calculate official QBER from every sifted bit (would not model BB84 sample disclosure and sacrifice).

[2026-09-26] | A simulation run owns an immutable submitted configuration and monotonic run ID
Rationale: React state updates are asynchronous, so an experiment cannot safely write sidebar state and then rely on a later callback to read it. Each launch now builds one complete configuration, snapshots its arrays and gates, submits that snapshot directly, and records it with the result. Reset and newer runs advance the run ID, so an older response cannot repopulate cleared or superseded state.
Alternatives: Delay execution with `setTimeout` (timing-dependent and retained stale hook closures); read editable sidebar parameters when rendering Results (can relabel an earlier run); accept every response in arrival order (allows stale results after reset or rapid reruns).

[2026-03-12] | FastAPI over Flask/Django
Rationale: native async, Pydantic v2, OpenAPI docs, ideal for typed simulation API
Alternatives: Flask (too minimal), Django (too heavy)

[2026-03-12] | NumPy over Qiskit/Cirq
Rationale: BB84 is a classical probability simulation. No quantum library needed.
Alternatives: Qiskit (overkill), Cirq (Google-specific)

[2026-03-12] | HTML5 Canvas over WebGL/SVG for photon animation
Rationale: direct pixel control with requestAnimationFrame, no WebGL complexity for 2D particles
Alternatives: WebGL (overkill), SVG (slow at 1000+ particles)

[2026-03-12] | Zustand over Redux
Rationale: flat simulation state, zero boilerplate, natural with hooks
Alternatives: Redux Toolkit (overkill), Context API (re-render issues)

[2026-03-12] | PHYSICS_CONTRACT.md as single source of truth
Rationale: prevents physics drift across modules built in separate sessions
Alternatives: inline comments only (insufficient)

[2026-03-12] | Python 3.14.2 used instead of 3.11
Rationale: 3.11 not available on system. 3.14 is fully compatible with all project dependencies. No 3.11-specific features used in this codebase. All physics and simulation logic is version-agnostic NumPy/SciPy.

[2026-03-12] | Alice state dict preserves alice_bit and alice_basis separately
Rationale: When Eve intercepts and re-emits, the photon's physical state (bit, basis) changes to Eve's re-emitted values. But QBER must compare Bob's measurement against Alice's ORIGINAL secret bit, not Eve's re-emitted bit. Storing alice_bit and alice_basis separately ensures QBER is physically accurate. Without this, Eve's full interception would show 0% QBER on basis matches instead of the correct 25%.

[2026-09-26] | Scroll-Synchronized Video Background with Lerped rAF Seeking & Procedural Canvas Overlay
Rationale: HTML5 `<video>` scrubbing requires seeking throttling and linear interpolation (lerp) to avoid browser seek-abort stalls. Rendering a dark radial vignette (#0e0e12) and procedural 2D probability wave canvas on top provides cinematic quantum visual depth while preserving foreground text contrast. Frame rate remains a target that requires device-specific measurement.
Alternatives: Raw `<video>` currentTime binding on scroll events (causes severe frame stutter); WebGL full shaders (high GPU power consumption for mobile/low-end devices).

[2026-09-26] | Single optical corridor is the active gate and playback architecture
Rationale: The September 15 canvas redesign retired the historical three-row `index % 3` visualization partition. All pulses, gates, and probes now use lane 0; gate position controls operation order and does not select a subset of traffic. This matches the visible single physical channel and avoids hidden physics based on a drawing partition.
Alternatives: Preserve three visual partitions (contradicts the current optical corridor); introduce multi-scenario state now (future work and outside current scope).

[2026-09-26] | OTP remains an educational XOR demonstration with backend eligibility
Rationale: The simulator implements QBER sampling and key extraction but does not execute error correction, privacy amplification, authentication, or a production key lifecycle. The OTP panel therefore uses the complete backend post-sampling key only when Alice and Bob agree exactly and modeled security checks permit use. This makes the demonstration faithful without overstating cryptographic security.
Alternatives: Reconstruct a key from the capped bit stream (incorrect); implement a complete post-processing protocol in the UI-overhaul task (too broad and requires a separate physics/security design).

