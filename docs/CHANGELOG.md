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
