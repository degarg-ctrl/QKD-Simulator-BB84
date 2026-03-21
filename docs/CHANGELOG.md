# Changelog
Format: [YYYY-MM-DD HH:MM] | Branch | Type | Description

[2026-03-12 19:15] | main              | chore | Repository initialized
[2026-03-12 19:16] | main              | chore | Branching strategy created
[2026-03-12 19:17] | docs              | docs  | Documentation folder created with 7 files
[2026-03-12 19:35] | feature/backend-core | chore(deps) | Backend venv created with Python 3.14. All dependencies installed and verified (FastAPI 0.135.1, Pydantic 2.12.5, Uvicorn 0.41.0). Versions frozen in requirements.lock.
[2026-03-12 19:42] | feature/frontend-scaffold | chore(deps) | Frontend scaffolded with Vite React. All dependencies installed and verified. Versions saved in npm-versions.txt.
[2026-03-12 19:50] | feature/frontend-scaffold | feat | All frontend component files scaffolded. Dev server verified at localhost:5173.
[2026-03-12 19:55] | feature/backend-api | feat | constants.py, schemas.py, main.py, simulation router created. Health check verified at localhost:8000.
[2026-03-12 19:57] | feature/backend-core | docs | mirrored PHYSICS_CONTRACT.md into backend/core/
[2026-03-12 20:05] | feature/backend-core | feat(backend-core) | alice.py complete — generate_bits, choose_bases, encode_states verified
[2026-03-12 20:18] | feature/backend-core | feat(backend-core) | channel.py complete — attenuation, detector efficiency, dark counts verified at 0km/50km/100km
[2026-03-12 20:30] | feature/backend-core | feat(backend-core) | eve.py complete — intercept-resend, partial, burst verified. 25% QBER physics confirmed.
[2026-03-12 20:45] | feature/backend-core | feat(backend-core) | bob.py complete — measurement rules verified, 100% accuracy on basis match confirmed
[2026-03-12 21:00] | feature/backend-core | feat(backend-core) | protocol.py complete — sifting, QBER estimation, key extraction verified. Refactored Alice/Eve for bit preservation.
[2026-03-12 21:15] | feature/backend-core | feat(backend-core) | metrics.py complete — binary entropy, SKR, efficiency, chart data verified
[2026-03-12 22:30] | feature/backend-api | feat(backend-api) | simulation router complete — full BB84 pipeline wired to POST /api/simulate, all 3 HTTP tests verified
[2026-03-12 22:35] | develop              | merge | feature/backend-api merged. Full backend API live and verified.
[2026-03-12 23:05] | develop              | merge | Backend complete. All 6 core modules and API router verified. QBER=0.25 on full Eve confirmed. Ready for frontend Sprint 3.
[2026-03-12 23:10] | feature/frontend-scaffold | feat(frontend-scaffold) | simulationStore.js complete — Zustand store with params, results, animation state, 10 actions, 4 derived getters
[2026-03-12 23:25] | feature/frontend-scaffold | feat(frontend-scaffold) | simulatorAPI.js complete — runSimulation, checkHealth, validateParams verified with live backend call
[2026-03-12 23:30] | feature/frontend-scaffold | feat(frontend-scaffold) | useSimulation.js hook complete — API orchestration, loading states, error handling verified
[2026-03-12 23:35] | develop              | merge | frontend-scaffold merged — data layer complete. Store, API client, hook verified end to end.
[2026-03-12 23:45] | feature/frontend-canvas | feat(frontend-canvas) | QuantumCanvas.jsx complete — static scene renders with lanes, Alice/Bob/Eve nodes, responsive scaling
[2026-03-12 23:55] | feature/frontend-canvas | feat(frontend-canvas) | PhotonParticle.js complete — travel lifecycle, polarization encoding, Eve effect, arrival flash verified
[2026-03-13 00:05] | feature/frontend-canvas | feat(frontend-canvas) | usePhotonAnimation.js hook complete — full animation loop verified, photons travelling Alice→Bob with polarization visualization
[2026-03-13 00:10] | develop              | merge | frontend-canvas merged — PhotonParticle, usePhotonAnimation, QuantumCanvas all verified. Full photon animation running at 60fps with polarization encoding.
