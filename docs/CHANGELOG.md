# Changelog
Format: [YYYY-MM-DD HH:MM] | Branch | Type | Description

[2026-03-23 01:00] | main | RELEASE v0.2 |
BB84 QKD Simulator v0.2 released to main.

New in v0.2:
- Collapsible Toolbox sidebar with Gates and Probes
- Quantum gates H,X,Y,Z,S,T — drag-drop onto lanes
- 6 experiment modes with modal configuration
- User-defined photon input (Exp 2 and 4)
- No-cloning theorem demonstration (Exp 6)
- Three-view navigation — Simulator, Guide, Results
- Results page — simulated vs theoretical comparison
- Guide formulas — QBER, H(Q), SKR, Beer-Lambert
- Enhanced Bob arrival animation — triple ring
- Pause/Resume animation control
- Single photon mode
- Canvas scaling fix — Bob always visible
- Photon dissipation past Bob

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
[2026-03-21 19:00] | fix/v0.1-final-audit | chore |
  Final audit complete. Dead code removed, magic numbers
  verified, physics regression passed, frontend build clean.
[2026-03-22 01:15] | feature/sprint-5-animation-ui | feat(sprint-5) |
  Sidebar rebuilt — collapsible, 4 sections (Entities/Gates/
  Probes/Experiments). ConfigPanel collapsible. Foundation
  for v0.2 gate drag-drop system.
[2026-03-12 23:05] | develop              | merge | Backend complete. All 6 core modules and API router verified. QBER=0.25 on full Eve confirmed. Ready for frontend Sprint 3.
[2026-03-12 23:10] | feature/frontend-scaffold | feat(frontend-scaffold) | simulationStore.js complete — Zustand store with params, results, animation state, 10 actions, 4 derived getters
[2026-03-12 23:25] | feature/frontend-scaffold | feat(frontend-scaffold) | simulatorAPI.js complete — runSimulation, checkHealth, validateParams verified with live backend call
[2026-03-12 23:30] | feature/frontend-scaffold | feat(frontend-scaffold) | useSimulation.js hook complete — API orchestration, loading states, error handling verified
[2026-03-12 23:35] | develop              | merge | frontend-scaffold merged — data layer complete. Store, API client, hook verified end to end.
[2026-03-12 23:45] | feature/frontend-canvas | feat(frontend-canvas) | QuantumCanvas.jsx complete — static scene renders with lanes, Alice/Bob/Eve nodes, responsive scaling
[2026-03-12 23:55] | feature/frontend-canvas | feat(frontend-canvas) | PhotonParticle.js complete — travel lifecycle, polarization encoding, Eve effect, arrival flash verified
[2026-03-13 00:05] | feature/frontend-canvas | feat(frontend-canvas) | usePhotonAnimation.js hook complete — full animation loop verified, photons travelling Alice→Bob with polarization visualization
[2026-03-13 00:10] | develop              | merge | frontend-canvas merged — PhotonParticle, usePhotonAnimation, QuantumCanvas all verified. Full photon animation running at 60fps with polarization encoding.
[2026-03-21 14:50] | feature/frontend-ui | feat(frontend-ui) | ConfigPanel complete — 5 parameter controls with physics tooltips, security threshold warning, Zustand integration
[2026-03-21 15:45] | feature/frontend-ui | feat(frontend-ui) | MetricCard, QBERChart, SKRChart complete — metrics panel verified with color coding and threshold visualization
[2026-03-21 16:30] | feature/frontend-ui | feat(frontend-ui) | TopBar, Sidebar, BottomPanel complete — full simulator layout assembled and verified
[2026-03-21 16:45] | develop              | merge | frontend-ui merged — complete simulator UI assembled. TopBar, Sidebar, BottomPanel, ConfigPanel, MetricCards, Charts all verified.
[2026-03-22 18:15] | feature/sprint-5-animation-ui | feat(sprint-5) |
  A1: Enhanced Bob arrival — 3 rings, match/mismatch colors.
  A2: Pause/Resume animation control added to TopBar.
  A3: Single photon mode toggle in ConfigPanel.
  A4: QBER/SKR chart labels clarified — Theoretical vs Simulated.
[2026-03-22 20:45] | develop | merge | Sprint 5 complete and merged.
  Features: collapsible sidebar with gates/probes/experiments,
  enhanced Bob arrival animation, pause/resume control,
  single photon mode, QBER/SKR label clarity,
  gates.py stub ready for Sprint 6.
[2026-03-22 21:10] | feature/sprint-6-gates-backend | feat(sprint-6) |
  gates.py fully implemented — H,X,Y,Z,S,T transformations.
  All 11 gate physics tests pass. alice_bit/basis preserved.
  Gates wired into simulation router after Eve, before Bob.
  Backward compatible — empty gates array works correctly.
[2026-03-22 21:20] | feature/sprint-6-gates-backend | feat(sprint-6) |
  Frontend gate system: drag-drop onto lanes, canvas rendering,
  right-click removal, gates sent to backend, QBER elevation confirmed.
[2026-03-22 21:24] | develop | merge | Sprint 6 complete.
  H,X,Y,Z,S,T gates physics verified (11/11 tests pass).
  Frontend drag-drop onto canvas lanes working.
  Gates sent to backend, QBER elevation confirmed.
  Right-click gate removal implemented.
[2026-03-22 21:54] | feature/ui-polish | feat(ui-polish) |
  U1: Bob visible — canvas scaling fixed.
  U2: Tooltip smart positioning — no clipping.
  U3: Entities removed from sidebar — Toolbox only.
  U4: Photons dissipate past Bob — Option A.
  U5: Collapsed sidebar — clean 32px badge strip.
  U6: Chart explanation note added.
[2026-03-22 22:09] | feature/ui-polish | feat(ui-polish) |
  U7-U10: Three-view navigation system complete.
  ResultsPage with simulated vs theoretical comparison,
  charts with reference dots, security verdict,
  filterable bit stream table.
[2026-03-22 23:05] | feature/ui-polish | fix |
  Guide page scroll restored — overflow-y-auto.
  TopBar Option C — SIM/RESULTS grouped pill,
  GUIDE standalone with divider separator.
[2026-03-22 23:10] | develop | merge | ui-polish fully merged.
  All 10 UI changes complete plus chart fix, 
  guide scroll, TopBar Option C layout.
[2026-03-23 00:18] | feature/sprint-7-experiments | feat(sprint-7) |
  Backend experiment framework complete.
  SimulationRequest: experiment_mode, alice_bits, alice_bases.
  Alice.encode_user_input() method added.
  Router handles exp2/exp4 user-defined photons.
  experiments.py presets for all 6 experiments.
  GET /api/experiments endpoint live.
[2026-03-23 00:27] | feature/sprint-7-experiments | feat(sprint-7) |
  PhotonInputTable for Exp 2 and 4.
  ExperimentModal with per-experiment config.
  Sidebar wired to open modals on click.
[2026-03-23 00:36] | develop | merge | Sprint 7 complete.
  Backend: experiment modes, user input Alice,
  6 experiment presets, /api/experiments endpoint.
  Frontend: ExperimentModal, PhotonInputTable,
  Sidebar wired, Exp 1-6 modals verified.
  Exp 6: No-cloning probe backend physics,
  lane corruption visualization, QBER elevation.
[2026-03-23 00:52] | feature/sprint-8-polish | feat(sprint-8) |
  Guide formulas section: QBER, H(Q), SKR, Beer-Lambert.
  Full derivation, worked examples, 4 inline graphs.
  Version bumped to 0.2. Code splitting configured.
