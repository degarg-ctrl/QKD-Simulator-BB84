# Genspark PPT Prompt — BB84 QKD Simulator Academic Presentation

> **Instructions**: Copy everything below the line and paste it directly into Genspark to generate the PowerPoint.

---

Create a professional academic PowerPoint presentation with the following specifications:

THEME:
- Dark background (#0a0a0f or deep navy)
- Accent colors: Indigo (#6366f1) and Cyan (#22c55e)
- Font: Clean monospace or sans-serif
- Style: Technical, academic, quantum computing aesthetic
- Each slide has a subtle grid pattern in background

SLIDE 1 — TITLE SLIDE
Title: BB84 Quantum Key Distribution Simulator
Subtitle: A Physics-Accurate Interactive Simulation Platform for Research and Teaching
Include: quantum circuit/photon visual, university context, version v0.2.0
Speaker notes: "Welcome to the presentation of our BB84 Quantum Key Distribution Simulator. This is a production-grade, physics-accurate web application that models the entire BB84 protocol — from Alice's photon encoding through Eve's eavesdropping to Bob's measurement. Version 0.2.0 includes 6 experiment modes, 6 quantum gates, and a no-cloning theorem demonstration. Built with Python FastAPI backend and React frontend."

SLIDE 2 — THE QUANTUM THREAT
Title: Why Quantum Cryptography Matters
Content:
- Classical encryption (RSA, ECC) relies on mathematical hardness — factoring large numbers
- Shor's algorithm running on quantum computers breaks RSA in polynomial time
- "Harvest now, decrypt later" — adversaries may already be recording encrypted traffic for future quantum decryption
- QKD offers information-theoretic security — guaranteed by laws of physics, not computational hardness
- Forward secrecy: quantum states are destroyed upon measurement — no retroactive decryption possible
Visual: comparison diagram — Classical crypto (padlock with math symbols) vs QKD (photon with physics symbols)
Speaker notes: "Modern public-key cryptography relies on the computational hardness of factoring large numbers. Shor's algorithm, running on a quantum computer, can break RSA-2048 and ECC-256 in polynomial time. NIST has warned about the harvest-now-decrypt-later threat. Quantum Key Distribution offers a fundamentally different security guarantee: information-theoretic security grounded in the laws of quantum mechanics, not computational assumptions. Even if an adversary records all classical communication, they cannot reconstruct the key without the quantum states."

SLIDE 3 — THE PROBLEM STATEMENT
Title: The Research Gap
Content:
- Textbook descriptions: Static diagrams, no interactivity, students cannot observe statistical emergence of QBER
- Hardware testbeds: Require $50K+ physical equipment, limited to specialized research labs
- Quantum SDKs (Qiskit, Cirq): Focus on circuit-level computation, not communication protocols — BB84 is a classical probability simulation
- No accessible platform combines: realistic physics modeling + adversarial attack simulation + interactive visualization + structured experiment modes
- Our solution: a production-grade classical simulation of BB84 that faithfully models quantum behavior without quantum hardware
Visual: gap diagram showing existing tools (Textbooks, Hardware, Qiskit) vs our simulator bridging the gap
Speaker notes: "Most educational resources for BB84 fall into three categories: static textbook descriptions that lack interactivity, expensive hardware testbeds that cost over 50 thousand dollars, and quantum SDKs like Qiskit that focus on circuit-level computation rather than communication protocols. Our simulator fills this gap — it's a production-grade, visually rich BB84 simulator that runs entirely on classical hardware while faithfully modeling every stage of the quantum key distribution process. Students can manipulate distance, noise, and Eve's attack strength in real time."

SLIDE 4 — BB84 PROTOCOL OVERVIEW
Title: The BB84 Protocol — Bennett & Brassard 1984
Content:
- First quantum key distribution protocol, proposed in 1984
- Uses 4 polarization states across 2 mutually unbiased bases
- Security guaranteed by Heisenberg Uncertainty Principle: measuring a quantum state disturbs it irreversibly
- 6-step protocol flow:
  1. Alice generates random bits
  2. Alice encodes bits as polarized photons
  3. Photons transmitted through quantum channel
  4. Bob measures in randomly chosen basis
  5. Basis sifting — keep only matching-basis photons
  6. QBER estimation and key extraction
Visual: 6-step protocol flow diagram with arrows connecting Alice → Channel → Bob → Sifting → Key
Speaker notes: "BB84 was the first quantum key distribution protocol, proposed by Charles Bennett and Gilles Brassard in 1984. It uses four polarization states across two mutually unbiased bases — rectilinear and diagonal. The security is guaranteed by the Heisenberg Uncertainty Principle: any measurement of a quantum state irreversibly disturbs it. The protocol has six steps: Alice generates random bits, encodes them as polarized photons, transmits through the quantum channel, Bob measures in a randomly chosen basis, they compare bases publicly and keep only matching ones, then estimate the quantum bit error rate to verify security."

SLIDE 5 — POLARIZATION ENCODING
Title: BB84 Quantum State Encoding
Content:
Show this exact table:
  Basis        | Bit | State | Angle  | Color Code
  Rectilinear (+) |  0  | |0⟩   |   0°   | Blue (#6366f1)
  Rectilinear (+) |  1  | |1⟩   |  90°   | Blue (#6366f1)
  Diagonal (×)    |  0  | |+⟩   |  45°   | Purple (#a855f7)
  Diagonal (×)    |  1  | |−⟩   | 135°   | Purple (#a855f7)

Key rules:
- Correct basis measurement → deterministic correct bit (100% accuracy)
- Wrong basis measurement → random bit (50/50 — fundamental quantum property)
- This randomness is NOT measurement imprecision — it is a law of physics
- Superposition: |+⟩ = (1/√2)|0⟩ + (1/√2)|1⟩ — measuring in wrong basis collapses to random outcome
Visual: 4 photon circles with polarization lines at 0°, 90°, 45°, and 135°, color coded blue and purple
Speaker notes: "BB84 uses exactly four polarization states defined across two bases. In the rectilinear basis, bit 0 is encoded as horizontal polarization at 0 degrees, and bit 1 as vertical at 90 degrees. In the diagonal basis, bit 0 is encoded at 45 degrees and bit 1 at 135 degrees. The critical quantum mechanical property is that measuring a photon prepared in one basis using the other basis yields a completely random result. For example, measuring the state ket-plus in the rectilinear basis gives 0 or 1 with exactly 50% probability each. This is not a limitation of measurement precision — it is a fundamental property of quantum mechanics."

SLIDE 6 — SYSTEM ARCHITECTURE
Title: Simulator Architecture
Content:
Show the full pipeline:
Alice → QuantumChannel → Eve → Gates → Bob → Protocol → Metrics

Backend (Python 3.14 + FastAPI + NumPy):
  - alice.py: generate_bits(), choose_bases(), encode_states()
  - channel.py: Beer-Lambert attenuation, detector efficiency (η=0.85), dark counts (P_dark=1e-5)
  - eve.py: intercept-resend, partial, burst attack strategies
  - bob.py: random basis measurement with quantum rules
  - protocol.py: sifting, QBER estimation, key extraction
  - metrics.py: SKR, binary entropy, chart data generation
  - gates.py: H, X, Y, Z, S, T transformations + cloning probe

Frontend (React 18 + Vite 5 + Tailwind CSS):
  - HTML5 Canvas photon animation at 60fps
  - Zustand state management
  - Recharts for QBER/SKR visualization
  - Framer Motion for UI animations

API: POST /api/simulate → full simulation response with bit stream, metrics, chart data
Visual: system architecture diagram with module boxes and data flow arrows
Speaker notes: "The simulator uses a clean separation of concerns. The backend is built with Python 3.14, FastAPI, and NumPy — no quantum libraries needed because BB84 is fundamentally a classical probability simulation. Seven core physics modules handle different stages of the protocol. The frontend uses React 18 with Vite 5, HTML5 Canvas for 60fps photon animation, Zustand for state management, and Recharts for metric visualization. The API contract is a single POST endpoint that returns the complete simulation result including per-photon bit stream data, security metrics, and theoretical chart curves."

SLIDE 7 — KEY PHYSICS FORMULAS
Title: Mathematical Foundation
Content — show all 5 formulas with definitions:

1. QBER = E / N
   E = erroneous bits in sample, N = total sampled sifted bits
   (10% of sifted key used as sample)

2. H(Q) = −Q·log₂(Q) − (1−Q)·log₂(1−Q)
   Binary entropy — measures uncertainty/information leakage
   H(0) = 0, H(0.5) = 1, H(0.11) = 0.5

3. R = S · (1 − 2·H(Q))
   Secret Key Rate — secure bits per raw bit sent
   S ≈ 0.5 (BB84 sifting efficiency)
   R = 0 when QBER ≥ 11%

4. P_survive = 10^(−0.2·d / 10)
   Beer-Lambert law — photon survival over fiber distance d km
   α = 0.2 dB/km (standard single-mode fiber at 1550nm)
   At 50 km: P_survive = 10%

5. P_detect = P_survive · η + P_dark · (1 − P_survive · η)
   η = 0.85 (InGaAs SPAD detector efficiency)
   P_dark = 10⁻⁵ (dark count probability per slot)

Visual: formula cards with clean mathematical typography and color coding
Speaker notes: "These five formulas form the mathematical foundation of the simulator. QBER is simply the ratio of errors to total sampled bits. Binary entropy measures the information an eavesdropper could have gained. The Secret Key Rate formula accounts for both error correction and privacy amplification costs — the factor of 2 in 2·H(Q) covers both. When QBER reaches 11%, H(Q) equals 0.5, and the SKR formula yields zero — the protocol must abort. The Beer-Lambert law models exponential photon loss in optical fiber, with standard telecom fiber losing 0.2 dB per kilometer. The composite detection probability includes both real photon detection and spurious dark counts."

SLIDE 8 — EVE'S ATTACK AND DETECTION
Title: Eavesdropping Detection — The 25% QBER Proof
Content:
Mathematical proof (probability tree):
Step 1: Eve intercepts photon, chooses random basis
  - P(Eve's basis = Alice's basis) = 0.5 → Eve gets correct bit, Bob unaffected
  - P(Eve's basis ≠ Alice's basis) = 0.5 → Eve gets random bit

Step 2: When Eve has wrong basis:
  - She re-emits photon in wrong state
  - Bob (matching Alice's basis) measures Eve's corrupted photon
  - P(Bob gets wrong bit) = 0.5

Combined: QBER = P(wrong basis) × P(error | wrong basis)
          QBER = 0.5 × 0.5 = 0.25 = 25%

Security threshold: QBER ≥ 11% → H(0.11) = 0.5 → SKR = 0 → SESSION ABORTED
Verified: simulation produces 24.07% QBER at n=10,000 with full Eve (within ±2.7% statistical variance)
Visual: probability tree diagram showing Eve's attack mechanics with branch probabilities
Speaker notes: "This is the central security result of BB84. When Eve intercepts every photon using the intercept-resend strategy, she must choose a random measurement basis. Half the time she picks the wrong basis, and her measurement gives a random result. She then re-emits a photon in this wrong state. When Bob — who happens to match Alice's basis — measures Eve's re-emitted photon, he gets the wrong bit half the time. Combining: 0.5 probability of wrong basis times 0.5 probability of error gives exactly 25% QBER. This is a fundamental physical result, not a software artifact. Our simulator produces 24.07% QBER with 10,000 photons, well within the expected ±2.7% statistical variance. At the 11% threshold, the binary entropy reaches 0.5, the SKR drops to zero, and the protocol must abort."

SLIDE 9 — VALIDATION BENCHMARKS
Title: Physics Verification Results
Content — show as a professional table with green checkmarks:
  Test                            | Expected      | Actual        | Status
  No Eve, 0km, no noise           | QBER ≈ 0%     | 0.00%         | ✅ PASS
  Full Eve (attack_prob=1.0)      | QBER ≈ 25%    | 24.6%         | ✅ PASS
  Half Eve (attack_prob=0.5)      | QBER ≈ 12.5%  | ~12-13%       | ✅ PASS
  50km fiber survival             | P ≈ 10%       | 10.0%         | ✅ PASS
  100km fiber survival            | P ≈ 1%        | 1.0%          | ✅ PASS
  SKR at QBER=11%                 | 0.0           | 0.0           | ✅ PASS
  H(0)=0, H(0.5)=1               | exact         | exact         | ✅ PASS
  No-Cloning Probe                | QBER spike    | confirmed     | ✅ PASS

All 8 benchmarks from PHYSICS_CONTRACT.md Section 8 verified ✅
Visual: clean data table with green checkmark icons, professional formatting
Speaker notes: "We verified all physics benchmarks from our Physics Contract document. With no Eve, no noise, and zero distance, QBER is exactly 0%. With full Eve interception, QBER reaches 24.6% — within statistical variance of the theoretical 25%. The Beer-Lambert attenuation formula produces exactly 10% survival at 50 kilometers and 1% at 100 kilometers. The SKR correctly drops to zero at the 11% QBER threshold. Binary entropy edge cases are handled correctly. And the no-cloning probe produces the expected QBER spike on the affected lane. All 8 benchmarks pass."

SLIDE 10 — QUANTUM GATES
Title: Quantum Gate System — 6 Verified Transformations
Content:
Show gate transformation table:
  Gate | Symbol | Transformation                        | Physical Effect
  H    |   H    | |0⟩↔|+⟩, |1⟩↔|−⟩                    | Switches basis (rectilinear ↔ diagonal)
  X    |   X    | |0⟩↔|1⟩, |+⟩→|+⟩, |−⟩→|−⟩            | Bit flip (rectilinear only)
  Y    |   Y    | |0⟩↔|1⟩, |+⟩↔|−⟩                      | Bit flip + phase flip
  Z    |   Z    | |0⟩→|0⟩, |1⟩→|1⟩, |+⟩↔|−⟩            | Phase flip (diagonal only)
  S    |   S    | |+⟩→67.5°, |−⟩→112.5°                 | π/2 phase rotation (+22.5°)
  T    |   T    | |+⟩→56.25°, |−⟩→123.75°               | π/4 phase rotation (+11.25°)

Implementation: lookup-table transformations — O(1) per photon
Critical invariant: alice_bit and alice_basis NEVER modified by gates
Frontend: drag-and-drop gates onto 3 quantum channel lanes
11 gate physics tests verified against PHYSICS_CONTRACT.md Section 10
Visual: gate symbol cards with colored borders, transformation arrows between states
Speaker notes: "We implemented six single-qubit quantum gates as lookup-table transformations. The Hadamard gate switches between rectilinear and diagonal bases — it transforms ket-0 to ket-plus, and ket-1 to ket-minus. The Pauli-X gate is a bit flip in the rectilinear basis but leaves diagonal states invariant. Pauli-Y combines bit flip and phase flip. Pauli-Z flips only diagonal states. The S and T gates perform fine-grained phase rotations of 22.5 and 11.25 degrees respectively. A critical design invariant is that gates never modify Alice's original bit or basis — only the physical photon state changes. This ensures QBER is always computed against Alice's secret values. All 11 transformation tests pass against our physics truth table."

SLIDE 11 — EXPERIMENT MODES
Title: 6 Structured Experiment Modes
Content — two column layout:

Left column:
  Exp 1: Random Bits, Clean Channel
         Random photons, no Eve, no gates
         → Baseline QBER ≈ 0%, demonstrates sifting efficiency ≈ 50%

  Exp 2: User-Defined Input, No Eve
         Manual bit and basis selection (up to 20 photons)
         → Trace individual photons through entire pipeline

  Exp 3: Random Bits + Eve Interception
         Full intercept-resend attack
         → QBER spikes to ≈ 25%, SKR drops to 0

Right column:
  Exp 4: User Input + Eve
         Manual photons with active eavesdropper
         → See exactly which photons Eve disturbs

  Exp 5: Quantum Gate Transmission
         Drag-drop H/X/Y/Z/S/T gates onto lanes
         → Observe QBER elevation from state transformations

  Exp 6: No-Cloning Theorem
         CNOT cloning probe on channel lane
         → Proves quantum states cannot be perfectly copied

Visual: 6 colored experiment cards in 2×3 grid layout with colored borders (green, indigo, amber, amber, purple, red)
Speaker notes: "The simulator provides six structured experiments designed for progressive learning. Experiment 1 establishes a baseline — random photons with no adversary, producing 0% QBER. Experiment 2 lets users manually define each photon's bit and basis, tracing individual photons through the pipeline. Experiment 3 introduces Eve's intercept-resend attack, demonstrating the characteristic 25% QBER spike. Experiment 4 combines manual input with Eve for per-photon interception analysis. Experiment 5 demonstrates quantum gate effects — dragging a Hadamard gate onto a lane switches bases and elevates QBER. Experiment 6 demonstrates the no-cloning theorem using a CNOT-based cloning probe that corrupts photon states."

SLIDE 12 — NO-CLONING THEOREM
Title: Experiment 6 — No-Cloning Theorem Demonstration
Content:
Theorem statement: It is impossible to create a perfect copy of an arbitrary unknown quantum state

Implementation in simulator:
  Input:  |ψ⟩|0⟩ — original photon + blank probe qubit
  CNOT operation: attempts to copy via controlled-NOT entanglement
  Output: entangled state — NEITHER copy equals |ψ⟩
  Effect: original photon's polarization_angle randomized to any of {0°, 45°, 90°, 135°}

Simulation results:
  - Unaffected lanes: QBER ≈ 0% (baseline)
  - Probed lane: QBER spikes dramatically (≈ 50% — randomized states)
  - Lane turns RED in the frontend canvas visualization
  - alice_bit and alice_basis remain unchanged — only physical state corrupted

Implication: Eve CANNOT silently clone photons — any copying attempt introduces detectable errors
Visual: before/after diagram showing photon state transformation, with red lane highlight
Speaker notes: "The no-cloning theorem is one of the most important results in quantum information theory. It states that it is impossible to create a perfect copy of an arbitrary unknown quantum state. Our simulator demonstrates this using a CNOT-based cloning probe placed on a channel lane. The probe attempts to entangle the photon with a blank probe qubit. The result is an entangled state where neither the original nor the copy preserves the original polarization. In the simulation, the photon's polarization angle is randomized to any of the four BB84 angles with uniform probability, causing QBER to spike to approximately 50% on the affected lane. The lane turns red in the canvas to visually indicate corruption. This proves that Eve cannot silently copy quantum states."

SLIDE 13 — SIMULATOR INTERFACE
Title: Interactive Simulation Platform
Content — describe these UI features:
- Real-time photon animation at 60fps on HTML5 Canvas
- 3 quantum channel lanes with photons traveling Alice → Bob
- Color encoding: Blue (#6366f1) = rectilinear (+), Purple (#a855f7) = diagonal (×)
- Polarization line through each photon at exact angle (0°, 45°, 90°, 135°)
- Eve interception: red pulse effect at Eve's node position
- Channel loss: photon fades to 0 opacity mid-channel
- Bob arrival: 3 concentric rings — green (match) or orange (mismatch)
- Three navigation views: Simulator, Guide, Results
- Results page: simulated vs theoretical comparison with reference dot on theoretical curve
- Metric cards: QBER, SKR, Sifted Key Length, Efficiency — color-coded (green=secure, red=insecure)
- QBER vs Distance and SKR vs Distance charts with theoretical curves
- Bit stream table: per-photon data (alice_bit, alice_basis, bob_basis, bob_bit, match, intercepted, lost)
- 6 experiment modes accessible via sidebar modal configuration
- Drag-and-drop quantum gates onto channel lanes
- Portal-based tooltips explaining every component with physics detail
Visual: mockup or screenshot of the simulator interface showing the dark UI with photon animation
Speaker notes: "The simulator provides a rich interactive interface. The main view shows a quantum channel with three lanes and photons animated at 60 frames per second. Each photon's polarization is encoded in both color — blue for rectilinear, purple for diagonal — and a thin line at the exact angle. Eve's interception is shown as a red pulse effect. Lost photons fade mid-channel. Bob's detector shows concentric rings colored green for basis match and orange for mismatch. The results page displays simulated values alongside theoretical predictions, with QBER and SKR charts showing distance-dependent curves. A bit stream table provides per-photon drill-down data. Quantum gates can be dragged onto lanes, and every component has physics-detailed tooltips."

SLIDE 14 — CONCLUSION AND FUTURE WORK
Title: Conclusions and Future Directions
Content:
Achievements:
  ✅ Physics-accurate BB84 simulation — all 8 benchmarks verified
  ✅ Mathematical proof: 25% QBER at full Eve interception (confirmed at 24.6%)
  ✅ Complete experiment framework — 6 structured experiments
  ✅ 6 quantum gates with verified lookup-table transformations (11 tests pass)
  ✅ No-cloning theorem demonstration via CNOT probe
  ✅ 60fps real-time photon animation with polarization encoding
  ✅ Production architecture — 30+ commits, tagged v0.2.0 release

Current limitations:
  ⚠ Classical simulation of quantum probabilities — not actual quantum state evolution
  ⚠ Ideal single-photon source assumed — no multi-photon pulse modeling
  ⚠ No error correction (CASCADE/LDPC) or privacy amplification implementation
  ⚠ QBER estimation variance at low photon counts (n < 5000)

Future work (v0.3+):
  → PNS (Photon Number Splitting) attack simulation
  → Decoy state protocol countermeasure
  → Dark counts advanced experiment
  → Hardware integration with ID Quantique / Toshiba QKD systems
  → Multi-party protocols: E91, B92, SARG04
  → Network QKD: trusted-node and MDI topologies

Visual: two-column layout — achievements with green checkmarks on left, future work with arrows on right
Speaker notes: "In conclusion, we have built a physics-accurate BB84 QKD simulator that passes all 8 benchmarks from our physics contract. The mathematical proof of 25% QBER at full Eve interception is confirmed empirically. We provide 6 structured experiments, 6 quantum gates, and a no-cloning theorem demonstration. The simulator runs at 60fps with real-time photon animation. Current limitations include the classical nature of the simulation, the assumption of ideal single-photon sources, and the absence of error correction implementation. For version 0.3, we plan to add photon number splitting attack simulation, decoy state protocols, and advanced dark count experiments. Long-term goals include hardware integration with commercial QKD systems and implementation of additional protocols like E91 and B92."
