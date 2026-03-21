# High Level Design — QKD BB84 Simulator
Version: 0.1 | Last Updated: 2026-03-12

## Architecture

[BROWSER]
    | HTTP POST /api/simulate
    v
[FastAPI :8000]
    |-- routers/simulation.py       HTTP only
    |-- core/alice.py               bits, bases, encoding
    |-- core/channel.py             attenuation, dark counts, efficiency
    |-- core/eve.py                 intercept-resend, partial, burst
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
    |-- src/components/layout/      TopBar, Sidebar, BottomPanel
    |-- src/components/canvas/      QuantumCanvas, PhotonParticle
    |-- src/components/controls/    ConfigPanel
    |-- src/components/metrics/     MetricCard, QBERChart, SKRChart
## API Contract
POST /api/simulate
Request:  n_bits, distance_km, noise_level, attack_prob, attack_strategy
Response: qber, skr, sifted_key_length, raw_key_length, efficiency,
          bit_stream (PhotonRecord[]), qber_vs_distance, skr_vs_distance,
          secure_threshold_breached

PhotonRecord: index, alice_bit, alice_basis, bob_basis, bob_bit,
              match, intercepted, lost, polarization_angle

## Data Flow
1. User sets params in ConfigPanel
2. User clicks Run
3. useSimulation → simulatorAPI.runSimulation(params)
4. FastAPI runs BB84 pipeline → SimulationResponse
5. Zustand store updated
6. BottomPanel renders metrics and charts
7. usePhotonAnimation reads bit_stream from store
8. QuantumCanvas animates photons with polarization angles
9. BitStream table renders per-photon data
