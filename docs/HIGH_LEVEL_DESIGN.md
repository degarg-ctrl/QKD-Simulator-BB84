# High Level Design — QKD BB84 Simulator
Version: 0.4.0 | Last Updated: 2026-06-24

## Architecture

[BROWSER]
    | HTTP POST /api/simulate
    v
[FastAPI :8000]
    |-- routers/simulation.py       HTTP route & pipeline orchestrator
    |-- core/alice.py               bits, bases, encoding
    |-- core/channel.py             attenuation, dark counts, efficiency
    |-- core/eve.py                 intercept-resend, partial, burst
    |-- core/wcp.py                 Weak Coherent Pulse Poisson model
    |-- core/pns.py                 Photon Number Splitting attack
    |-- core/decoy.py               Decoy state protocol
    |-- core/gates.py               H/X/Y/Z/S/T & CNOT cloning probes
    |-- core/bob.py                 measurement
    |-- core/protocol.py            sifting, QBER, key extraction
    |-- core/metrics.py             SKR, binary entropy, efficiency
    |-- core/constants.py           all physical constants
    |-- models/schemas.py           Pydantic v2 I/O
    | JSON response
    v
[React :5173]
    |-- src/api/simulatorAPI.js     single API client
    |-- src/store/simulationStore   Zustand state
    |-- src/hooks/useSimulation     API + state orchestration
    |-- src/hooks/usePhotonAnimation Canvas animation driver
    |-- src/pages/SimulatorPage     main layout
    |-- src/pages/GuidePage         beginner guide (handles theory & glossary)
    |-- src/pages/ResultsPage       post-simulation analysis & OTP demo
    |-- src/components/layout/      TopBar, Sidebar, BottomPanel
    |-- src/components/canvas/      QuantumCanvas, PhotonParticle
    |-- src/components/controls/    ConfigPanel
    |-- src/components/metrics/     MetricCard, QBERChart, SKRChart
    |-- src/components/visualizations/ BlochSphere 3D rendering

## API Contract
POST /api/simulate
Request:  n_bits, distance_km, noise_level, attack_prob, attack_strategy,
          gates, experiment_mode, alice_bits, alice_bases,
          wcp_enabled, mean_photon_number, decoy_enabled
Response: qber, skr, sifted_key_length, raw_key_length, efficiency,
          bit_stream (PhotonRecord[]), qber_vs_distance, skr_vs_distance,
          secure_threshold_breached, cloning_probe_active,
          wcp_enabled, wcp_stats, pns_stats, decoy_results,
          pns_compromised, effective_skr, qber_misleading,
          event_stream (PhotonRecord[]), transmission (accounting)

PhotonRecord (core fields): index, alice_bit, alice_basis, bob_basis,
              bob_bit, match, intercepted, lost, polarization_angle
PhotonRecord (event fields, v0.5.0): alice_polarization_angle,
              alice_state_label, fiber_survived, detector_detected,
              dark_count, noise_flipped, eve_basis, eve_bit,
              eve_basis_match, eve_resend_angle, wcp_photon_count,
              wcp_vacuum, wcp_single, wcp_multi, pns_split,
              pns_blocked, eve_has_copy, sifted

bit_stream:  legacy detected-only view (cap 500). NOT equal to N.
event_stream: representative sample of ALL outcomes (cap 500,
             deterministic stride + rare-category rescue).
transmission: full-simulation accounting computed from the complete
             arrays (generated, vacuum, fiber survived/lost, detector
             outcomes, dark counts, Eve/PNS events, sifted).

## Data Flow
1. User sets params in ConfigPanel
2. User clicks Run Simulation
3. useSimulation → simulatorAPI.runSimulation(params)
4. FastAPI runs BB84 pipeline → SimulationResponse
5. Zustand store updated
6. BottomPanel renders metrics and charts
7. usePhotonAnimation reads bit_stream from store
8. QuantumCanvas animates photons with polarization angles
9. BitStream table renders per-photon data
