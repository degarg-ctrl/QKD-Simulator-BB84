# Architecture and Design Decisions
Format: [YYYY-MM-DD] | Decision | Rationale | Alternatives Considered

[2026-03-12] | FastAPI over Flask/Django
Rationale: native async, Pydantic v2, OpenAPI docs, ideal for typed simulation API
Alternatives: Flask (too minimal), Django (too heavy)

[2026-03-12] | NumPy over Qiskit/Cirq
Rationale: BB84 is a classical probability simulation. No quantum library needed.
Alternatives: Qiskit (overkill), Cirq (Google-specific)

[2026-03-12] | HTML5 Canvas over WebGL/SVG for photon animation
Rationale: direct pixel control at 60fps, no WebGL complexity for 2D particles
Alternatives: WebGL (overkill), SVG (slow at 1000+ particles)

[2026-03-12] | Zustand over Redux
Rationale: flat simulation state, zero boilerplate, natural with hooks
Alternatives: Redux Toolkit (overkill), Context API (re-render issues)

[2026-03-12] | PHYSICS_CONTRACT.md as single source of truth
Rationale: prevents physics drift across modules built in separate sessions
Alternatives: inline comments only (insufficient)
