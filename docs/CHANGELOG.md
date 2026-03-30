# Changelog
Format: [YYYY-MM-DD HH:MM] | Branch | Type | Description

[2026-03-29 21:31] | feature/v0.3.1-sprint13 | feat(sprint-13) |
  - Guided exercises with 5 interactive tutorials
  - Step-by-step verification system
  - Exercise progress tracking
  - Hint system for each step
  - New components: GuidedExercises, ExerciseStep
  - Consolidated documentation into docs/sprints/

[2026-03-29 21:26] | feature/v0.3.1-sprint12 | feat(sprint-12) |
  - Save experiment configurations with name and description
  - Load saved experiments from localStorage
  - Export experiments as JSON files
  - Import experiments from JSON files
  - Delete saved experiments
  - Display experiment list with metadata
  - New components: SaveExperimentModal, LoadExperimentModal

[2026-03-29 21:22] | feature/v0.3.1-sprint11 | feat(sprint-11) |
  - Gate state vector display showing |ψ⟩ = α|0⟩ + β|1⟩ after each gate
  - Right-click context menu for gates (delete, copy, view matrix)
  - Gate properties panel in right sidebar with matrix representation
  - Real-time quantum state visualization with complex amplitudes
  - Probability calculations P(0) and P(1) for each gate
  - Gate descriptions for H, X, Y, Z, S, T gates
  - Integrated with simulationStore.js (gate state management)
  - Ready for QuantumCanvas and SimulatorPage integration

  - New components: GateStateVector, GateContextMenu, GatePropertiesPanel

[2026-03-23 05:00] | feature/v0.3-source-model | feat(source-model) |
  - "Ideal vs Realistic" source model toggle
  - Realistic WCP source with Mean Photon (mu) slider
  - PNS attack analysis & security verdict
  - Decoy State protocol & detection results
  - Experiments 7 & 8 active

[2026-03-22 18:15] | feature/sprint-5-animation-ui | feat(sprint-5) |
  - A1: Enhanced Bob arrival — 3 rings, match/mismatch colors.
  - A2: Pause/Resume animation control added to TopBar.
  - A3: Single photon mode toggle in ConfigPanel.
  - A4: QBER/SKR chart labels clarified — Theoretical vs Simulated.

[2026-03-21 19:00] | fix/v0.1-final-audit | chore |
  Final audit complete. Dead code removed, magic numbers
  verified, physics regression passed, frontend build clean.

[2026-03-21 18:45] | main | RELEASE v0.1 | 
  BB84 QKD Simulator v0.1 released to main.

  Features shipped:
  - Physics-accurate BB84 simulation engine
  - POST /api/simulate endpoint
  - Photon animation with real-time polarization visualization  
  - Eve interception with red pulse effect
  - ConfigPanel with physics tooltips
  - QBER/SKR metric cards and charts with threshold line
  - TopBar, Sidebar, BottomPanel IDE layout
  - Complete BB84 teaching guide — 5 sections
  - QBER exactly 25% at full Eve interception (verified)
  - Security threshold abort at QBER ≥ 11% (verified)

[2026-03-21 18:15] | release/v0.1 | release | v0.1 release candidate cut from develop.

[2026-03-21 16:55] | develop | merge | guide-page merged — comprehensive beginner's guide with interactive BB84 protocol steps, security analysis, tutorial, and glossary. All verified on port 5174.

[2026-03-12 23:55] | feature/frontend-canvas | feat(frontend-canvas) | PhotonParticle.js complete — travel lifecycle, polarization encoding, Eve effect, arrival flash verified
[2026-03-13 00:05] | feature/frontend-canvas | feat(frontend-canvas) | usePhotonAnimation.js hook complete — full animation loop verified, photons travelling Alice→Bob with polarization visualization
[2026-03-13 00:10] | develop              | merge | frontend-canvas merged — PhotonParticle, usePhotonAnimation, QuantumCanvas all verified. Full photon animation running at 60fps with polarization encoding.
[2026-03-21 14:50] | feature/frontend-ui | feat(frontend-ui) | ConfigPanel complete — 5 parameter controls with physics tooltips, security threshold warning, Zustand integration
[2026-03-21 15:45] | feature/frontend-ui | feat(frontend-ui) | MetricCard, QBERChart, SKRChart complete — metrics panel verified with color coding and threshold visualization
[2026-03-21 16:30] | feature/frontend-ui | feat(frontend-ui) | TopBar, Sidebar, BottomPanel complete — full simulator layout assembled and verified
[2026-03-21 16:45] | develop              | merge | frontend-ui merged — complete simulator UI assembled. TopBar, Sidebar, BottomPanel, ConfigPanel, MetricCards, Charts all verified.

[2026-03-12 23:45] | feature/frontend-canvas | feat(frontend-canvas) | QuantumCanvas.jsx complete — static scene renders with lanes, Alice/Bob/Eve nodes, responsive scaling
[2026-03-12 23:35] | develop              | merge | frontend-scaffold merged — data layer complete. Store, API client, hook verified end to end.
[2026-03-12 23:30] | feature/frontend-scaffold | feat(frontend-scaffold) | useSimulation.js hook complete — API orchestration, loading states, error handling verified
[2026-03-12 23:25] | feature/frontend-scaffold | feat(frontend-scaffold) | simulatorAPI.js complete — runSimulation, checkHealth, validateParams verified with live backend call
[2026-03-12 23:10] | feature/frontend-scaffold | feat(frontend-scaffold) | simulationStore.js complete — Zustand store with params, results, animation state, 10 actions, 4 derived getters
[2026-03-12 23:05] | develop              | merge | Backend complete. All 6 core modules and API router verified. QBER=0.25 on full Eve confirmed. Ready for frontend Sprint 3.
[2026-03-12 22:35] | develop              | merge | feature/backend-api merged. Full backend API live and verified.
[2026-03-12 22:30] | feature/backend-api | feat(backend-api) | simulation router complete — full BB84 pipeline wired to POST /api/simulate, all 3 HTTP tests verified
[2026-03-12 21:15] | feature/backend-core | feat(backend-core) | metrics.py complete — binary entropy, SKR, efficiency, chart data verified
[2026-03-12 21:00] | feature/backend-core | feat(backend-core) | protocol.py complete — sifting, QBER estimation, key extraction verified. Refactored Alice/Eve for bit preservation.
[2026-03-12 20:45] | feature/backend-core | feat(backend-core) | bob.py complete — measurement rules verified, 100% accuracy on basis match confirmed
[2026-03-12 20:30] | feature/backend-core | feat(backend-core) | eve.py complete — intercept-resend, partial, burst verified. 25% QBER physics confirmed.
[2026-03-12 20:18] | feature/backend-core | feat(backend-core) | channel.py complete — attenuation, detector efficiency, dark counts verified at 0km/50km/100km
[2026-03-12 20:05] | feature/backend-core | feat(backend-core) | alice.py complete — generate_bits, choose_bases, encode_states verified
[2026-03-12 19:57] | feature/backend-core | docs | mirrored PHYSICS_CONTRACT.md into backend/core/
[2026-03-12 19:55] | feature/backend-api | feat | constants.py, schemas.py, main.py, simulation router created. Health check verified at localhost:8000.
[2026-03-12 19:50] | feature/frontend-scaffold | feat | All frontend component files scaffolded. Dev server verified at localhost:5173.
[2026-03-12 19:42] | feature/frontend-scaffold | chore(deps) | Frontend scaffolded with Vite React. All dependencies installed and verified. Versions saved in npm-versions.txt.
[2026-03-12 19:35] | feature/backend-core | chore(deps) | Backend venv created with Python 3.14. All dependencies installed and verified (FastAPI 0.135.1, Pydantic 2.12.5, Uvicorn 0.41.0). Versions frozen in requirements.lock.
[2026-03-12 19:17] | docs              | docs  | Documentation folder created with 7 files
[2026-03-12 19:16] | main              | chore | Branching strategy created
[2026-03-12 19:15] | main              | chore | Repository initialized
