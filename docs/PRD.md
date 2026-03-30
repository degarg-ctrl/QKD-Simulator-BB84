# Product Requirements Document — QKD BB84 Simulator
Version: 0.1 | Status: Active | Last Updated: 2026-03-12

## 1. Objective
A production-grade, visually rich BB84 QKD simulator for academic research
and classroom teaching.

## 2. Core Features

F1 — BB84 Protocol Simulation (Backend)
- Alice: random bits, random bases, state encoding
- Channel: fiber attenuation, detector efficiency, dark counts
- Eve: intercept-resend, partial, burst attack strategies
- Bob: random basis measurement
- Sifting, QBER estimation, key extraction, SKR computation
- All physics conform to PHYSICS_CONTRACT.md

F2 — Photon Animation (Canvas)
- Photons as glowing particles traveling Alice → Channel → Bob
- Blue (#6366f1) = rectilinear (+), Purple (#a855f7) = diagonal (×)
- Polarization line at exact angle: 0°/90°/45°/135°
- Angle updates in real time during travel
- Eve interception: particle splits, red glow, angle shift on re-emit
- Channel loss: photon fades to 0 opacity mid-channel
- Detector miss: photon dims at Bob without flash
- 60fps via requestAnimationFrame only

F3 — Configuration Controls
- Distance: 0–150km
- Noise level: 0–10%
- Attack probability: 0–1
- Attack strategy: intercept_resend / partial / burst
- N bits: 100–10000
- Every control has a tooltip with physical explanation

F4 — Metrics and Charts
- Live cards: QBER, SKR, Sifted Key Length, Efficiency
- QBER vs Distance chart
- SKR vs Distance chart
- QBER vs Attack Strength chart
- Bit stream table: per-photon alice_bit, alice_basis, bob_basis, bob_bit, match
- Audit log tab

F5 — User Guide Page
- What is QKD
- BB84 steps with animation
- Security analysis and QBER threshold
- How to use the simulator
- Glossary with expandable definitions

F6 — Component Tooltips
Every sidebar entity and gate: hover tooltip explaining what it is,
what it does in BB84, what happens when active in simulation.

## 3. Non-Functional Requirements
- Page load under 3 seconds
- Simulation response under 2 seconds for n_bits <= 5000
- No physics violations at any parameter combination
- Works on Chrome, Firefox, Safari latest

## 4. Out of Scope (v0.1)
- Real quantum hardware integration
- User authentication or saved sessions
- Multi-party QKD protocols

## 5. Success Criteria
- QBER ≈ 25% with Eve attack_prob=1.0, no noise
- QBER ≈ 0% with no Eve, no noise, 0km
- SKR = 0 when QBER >= 11%
- Photon animation stable at 60fps
- All Section 8 benchmarks in PHYSICS_CONTRACT.md pass
