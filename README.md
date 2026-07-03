# 🔬 BB84 Quantum Key Distribution Simulator

> **A physics-accurate, interactive web application that simulates the BB84 quantum cryptography protocol — the world's first and most widely deployed method for generating provably secure encryption keys using the laws of quantum mechanics.**

v0.4.0

---

## 📖 Table of Contents

- [About](#-about)
- [The Problem — Why This Exists](#-the-problem--why-this-exists)
- [Demystifying Quantum Key Distribution](#-demystifying-quantum-key-distribution)
- [Features at a Glance](#-features-at-a-glance)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Data Flow](#-data-flow)
- [Experiment Modes](#-experiment-modes)
- [Physics Reference](#-physics-reference)
- [Installation](#-installation)
- [Running the Project](#-running-the-project)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Version History](#-version-history)

---

## 🧠 About

The BB84 QKD Simulator is a **production-grade, open-source web application** that lets anyone — students, researchers, and educators — simulate the complete BB84 quantum key distribution protocol in a browser. No quantum hardware, no installation, no prerequisites beyond curiosity.

Users play the roles of **Alice** (the sender), **Bob** (the receiver), and optionally **Eve** (the eavesdropper) to explore how quantum mechanics can guarantee perfectly secure communication. The simulator covers everything from fundamental single-photon transmission to advanced attacks that exploit imperfections in real-world laser sources.

**Key differentiators:**

- **Physics-accurate** — All calculations conform to a formal [Physics Contract](docs/PHYSICS_CONTRACT.md). Any deviation is treated as a bug, not a design choice.
- **Interactive visualization** — Real-time HTML5 Canvas photon animation at 60fps with color-coded polarization states.
- **Ideal vs Realistic toggle** — Switch between perfect single-photon sources (textbook theory) and real-world Weak Coherent Pulse (WCP) laser sources to see why practical QKD is harder than the theory suggests.
- **8 guided experiment modes** — From basic key exchange to advanced PNS attacks and decoy state countermeasures.
- **Validated learning impact** — A user study with 20 undergraduates demonstrated a **67% improvement** in QKD comprehension scores (p < 0.001) and a System Usability Scale score of **82.5** (Grade: A, Excellent).

---

## 🔒 The Problem — Why This Exists

Modern encryption (RSA, ECC) relies on the assumption that certain math problems are *computationally hard*. A sufficiently powerful quantum computer running [Shor's algorithm](https://en.wikipedia.org/wiki/Shor%27s_algorithm) could break these systems entirely. This isn't hypothetical — it's a matter of when, not if.

**Quantum Key Distribution (QKD)** solves this by using the laws of physics — not mathematical complexity — to secure communication. But QKD education faces three critical barriers:

| Barrier | Why It Matters |
|:--------|:---------------|
| 🧪 **Physical QKD systems cost $50k–$500k** | Most universities and students simply cannot access real quantum cryptography hardware. |
| 🧩 **QKD sits at the intersection of 3 fields** | Understanding it requires quantum mechanics, information theory, *and* cryptography — a rare combination in any single curriculum. |
| 👁️ **Quantum states are invisible** | Polarization, superposition, and measurement collapse are abstract concepts that are nearly impossible to intuit without visualization. |

Existing tools like QuTiP and Qiskit require programming expertise, lack QKD-specific visualizations, and don't model real-world imperfections like multi-photon pulses or PNS attacks. This simulator fills that gap.

---

## 🔑 Demystifying Quantum Key Distribution

If you're new to quantum cryptography, this section explains the core concepts that the simulator visualizes. Every term below appears directly in the application.

### What Is QKD?

**Quantum Key Distribution** is a method for two parties to generate a shared secret key that is provably secure — not because breaking it is "difficult," but because the laws of physics *forbid* undetected eavesdropping.

### The BB84 Protocol — In Plain English

BB84 (named after its inventors Bennett and Brassard, 1984) works in six stages. The simulator models each one:

| Stage | What Happens | Who | In the Simulator |
|:------|:-------------|:----|:-----------------|
| 1. **Encoding** | Alice picks random bits (0 or 1) and encodes each as a photon with a specific polarization angle. She randomly uses one of two encoding schemes ("bases"). | Alice | Photons appear at the left of the canvas with color-coded polarization. |
| 2. **Transmission** | Photons travel through a fiber-optic channel that can lose photons over distance (like light dimming through fog). | Channel | Photons animate across the canvas. Some fade out if the distance is long. |
| 3. **Eavesdropping** | Eve may intercept photons, measure them (which *changes* them), and re-send them — hoping to learn the key. | Eve | Intercepted photons flash red. Their polarization angle shifts. |
| 4. **Measurement** | Bob receives each photon and measures it using a randomly chosen basis. If his basis matches Alice's, he reads the correct bit. If not, he gets a random result. | Bob | Photons arrive at the right. Matching bases produce a green flash. |
| 5. **Sifting** | Alice and Bob publicly compare which *basis* they used for each photon (not the bit values). They keep only the bits where their bases matched. This discards ~50% of bits. | Both | The Bit Stream table highlights matching bases. |
| 6. **Security Check** | They sacrifice a small sample of their remaining key to check for errors (QBER). If the error rate exceeds **11%**, an eavesdropper is detected and the key is discarded. | Both | QBER metric card turns red above threshold. SKR drops to zero. |

### Key Terms You'll See in the Simulator

| Term | What It Means | Why It Matters |
|:-----|:-------------|:--------------|
| **Basis** | The encoding/measurement scheme used for a photon. Two options: Rectilinear (+) which encodes bits at 0°/90°, or Diagonal (×) which encodes at 45°/135°. | If Alice and Bob use different bases, the measurement result is random — this is the core of BB84. |
| **QBER** (Quantum Bit Error Rate) | The percentage of errors in the sifted key. | QBER tells you if Eve is present. At 0% attack, QBER ≈ 0%. At 100% attack, QBER ≈ 25%. |
| **SKR** (Secret Key Rate) | The number of secure key bits extracted per raw bit sent. Calculated as `S × (1 − 2H(Q))`, where H is binary entropy. | If QBER ≥ 11%, SKR = 0 — the channel is too compromised to extract any secure key. |
| **No-Cloning Theorem** | A fundamental law of quantum mechanics: an unknown quantum state cannot be perfectly duplicated. | This is *why* QKD works. Eve can't copy a photon without disturbing it. |
| **WCP** (Weak Coherent Pulse) | Real laser sources don't emit exactly 1 photon per pulse — they emit a random number following a Poisson distribution. | Multi-photon pulses create a vulnerability that Eve can exploit (PNS attack). |
| **PNS Attack** (Photon Number Splitting) | Eve detects multi-photon pulses, steals one photon, and forwards the rest to Bob — introducing **zero** QBER. | Demonstrates why textbook BB84 with ideal sources is not the full story. |
| **Decoy State Protocol** | Alice sends pulses at varying intensities. Comparing detection rates at different intensities reveals if Eve is performing PNS. | The real-world countermeasure to PNS — and the subject of Experiment 8. |
| **OTP** (One-Time Pad) | An encryption method where the key is as long as the message and used only once. XOR encryption: `ciphertext = message ⊕ key`. | Shannon (1949) proved this is the *only* encryption scheme with perfect secrecy. BB84 provides the key. |

---

## ✨ Features at a Glance

### Simulation Engine
- Full BB84 physics pipeline: **Alice → Channel → Eve → Gates → Bob → Protocol → Metrics**
- 8 experiment modes covering fundamental concepts to advanced security analysis
- Ideal vs Realistic source model toggle (perfect single-photon vs WCP + Poisson distribution)
- PNS attack simulation + Decoy State detection countermeasure
- One-Time Pad encryption demonstration using extracted key
- Configurable parameters: distance (0–150km), noise (0–10%), attack probability (0–1), bit count (1–10,000)

### Visualization & Interaction
- Real-time photon animation at 60fps via HTML5 Canvas with polarization-angle rendering
- Color-coded photons: blue/indigo (#6366f1) = Rectilinear (+), purple (#a855f7) = Diagonal (×)
- Eve interception: photons split, red glow, polarization angle shifts on re-emit
- Channel loss: photons fade to zero opacity mid-transit
- Photon Inspector panel with sync mode (step-by-step, one photon at a time)
- Quantum gates (H/X/Y/Z/S/T) with drag-and-drop canvas placement
- Gate properties panel with real-time quantum state vector display
- 3D Bloch sphere tooltip visualization
- QBER vs Distance and SKR vs Distance interactive charts (Recharts)

### Educational Tools
- Interactive Guide page with BB84 theory, formula derivations, and inline charts
- 8 pre-configured experiments with descriptions, learning objectives, and locked parameters
- Component tooltips on every sidebar entity and gate explaining physical meaning
- Save/load/export/import experiment configurations via localStorage
- Guided exercises with step-by-step verification and hint system
- Bit stream table showing per-photon details (Alice bit/basis, Bob bit/basis, match, intercepted, lost)

### Quality of Life
- Dark / Light mode
- Animated landing page with photon particle background
- Single-command launch via `python launch.py`
- Collapsible configuration panel, sidebar, and bottom metrics panel
- Comprehensive in-app audit log

---

## 🏗️ Architecture & Tech Stack

The simulator uses a **client-server architecture** that cleanly separates physics computation from visualization. The backend performs all quantum mechanics calculations in Python (ensuring numerical precision), while the frontend handles interactive visualization in JavaScript (ensuring smooth 60fps animation without blocking physics computations).

### Backend — Physics Engine

| Technology | Role | Why This Choice |
|:-----------|:-----|:----------------|
| **Python 3.14** | Core language | Version-agnostic NumPy code; no 3.11-specific features used |
| **FastAPI** | REST API framework | Native async, Pydantic v2 integration, auto-generated OpenAPI docs |
| **Pydantic v2** | Request/response validation | Strict type enforcement catches invalid simulation parameters before they reach physics code |
| **NumPy 2.0+** | Numerical computation | Vectorized array operations for efficient probability and statistics calculations |
| **SciPy** | Statistical functions | Binary entropy, Poisson distribution for WCP model |

**Why NumPy instead of Qiskit/Cirq?** BB84 is fundamentally a *classical probability simulation* — Alice and Bob make random choices, and the outcomes follow well-defined probability distributions. No quantum gate library is needed. NumPy provides the exact level of abstraction required without the overhead of a full quantum computing framework.

### Frontend — Interactive Visualization

| Technology | Role | Why This Choice |
|:-----------|:-----|:----------------|
| **React 19** | UI framework | Component-based architecture for complex simulator interface |
| **Vite 7** | Build tool | Sub-second hot module replacement during development |
| **Tailwind CSS 4** | Styling | Rapid prototyping of responsive layouts and dark/light mode |
| **Framer Motion** | Animations | Smooth page transitions, panel animations, and micro-interactions |
| **Zustand 5** | State management | Flat simulation state with zero boilerplate — ideal for a single store holding all simulation results |
| **Recharts 3** | Data visualization | QBER and SKR charts with responsive, interactive tooltips |
| **HTML5 Canvas** | Photon animation | Direct pixel control at 60fps for 1000+ particle rendering without WebGL complexity |
| **React Three Fiber + Drei** | 3D rendering | Bloch sphere tooltip visualization of quantum states |
| **Radix UI** | Accessible primitives | Tooltips, sliders, tabs, dialogs, accordions with full keyboard and screen-reader support |
| **Lucide React** | Icons | Consistent, lightweight icon system |
| **React Router DOM 7** | Routing | Client-side navigation between Landing, Simulator, Guide, and Results views |

**Why HTML5 Canvas instead of WebGL or SVG?** Photon animation requires rendering up to 1,000 moving particles with per-frame polarization angle updates at 60fps. Canvas provides direct pixel control in 2D without the shader complexity of WebGL or the DOM overhead that makes SVG slow at high particle counts.

**Why Zustand instead of Redux?** The simulation state is flat — a single API response containing metrics, charts, and bit stream data. Zustand handles this with zero boilerplate, natural hook integration, and no action/reducer ceremony. Redux Toolkit would be overkill for this shape of state.

---

## 🔄 Data Flow

Every simulation follows this exact sequence. The numbered steps correspond to the pipeline in [simulation.py](backend/routers/simulation.py):

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│                                                          │
│  1. User configures params in ConfigPanel                │
│  2. User clicks "Run Simulation"                         │
│  3. useSimulation hook → simulatorAPI.runSimulation()     │
│                          │                                │
│                          │ POST /api/simulate             │
│                          ▼                                │
├──────────────────────────────────────────────────────────┤
│                 BACKEND (FastAPI + Python)                │
│                                                          │
│  4. Pydantic v2 validates request (SimulationRequest)     │
│  5. Alice generates bits + bases + encodes states         │
│  6. (If WCP) Poisson photon counts applied to states      │
│  7. QuantumChannel transmits (attenuation, noise, darks)  │
│  8. Eve intercepts (strategy: intercept-resend/PNS/etc.)  │
│  9. (If gates) Quantum gates applied per lane              │
│ 10. Bob measures received states                          │
│ 11. BB84Protocol: sift → estimate QBER → extract key      │
│ 12. Metrics: SKR, efficiency, chart data                  │
│ 13. Return SimulationResponse (JSON)                      │
│                          │                                │
│                          ▼                                │
├──────────────────────────────────────────────────────────┤
│                    FRONTEND (React)                       │
│                                                          │
│ 14. Zustand store updated with full response              │
│ 15. BottomPanel renders metric cards + charts             │
│ 16. usePhotonAnimation reads bit_stream from store        │
│ 17. QuantumCanvas animates photons with polarization      │
│ 18. Bit Stream table renders per-photon data              │
└──────────────────────────────────────────────────────────┘
```

### API Contract

```
POST /api/simulate

Request Body:
  n_bits:           int      (1–10,000)
  distance_km:      float    (0–150)
  noise_level:      float    (0.0–1.0)
  attack_prob:      float    (0.0–1.0)
  attack_strategy:  string   ("intercept_resend" | "partial" | "burst" | "pns")
  gates:            array    (gate objects with type, lane, position)
  experiment_mode:  string   ("free" | "exp1"–"exp8")
  wcp_enabled:      bool     (toggles Weak Coherent Pulse model)
  mean_photon_number: float  (0.05–0.5, used when wcp_enabled)
  decoy_enabled:    bool     (toggles decoy state protocol)

Response Body:
  qber, skr, sifted_key_length, raw_key_length, efficiency
  bit_stream:       PhotonRecord[]  (up to 500 detected photons)
  qber_vs_distance: chart data
  skr_vs_distance:  chart data
  secure_threshold_breached: bool
  wcp_stats, pns_stats, decoy_results: dict (when applicable)
```

---

## 🧪 Experiment Modes

The simulator includes **8 guided experiments**, each with pre-configured parameters, locked fields, and specific learning objectives. Experiments progressively build from basic concepts to advanced attacks.

| # | Title | Concept | Key Observation |
|:-:|:------|:--------|:----------------|
| 1 | **Random Bits — Clean Channel** | Baseline BB84 protocol | QBER ≈ 0%, sifting retains ~50% of raw bits |
| 2 | **Manual Photon Encoding** | User-defined bits and bases (max 20) | Direct relationship between basis choice and sifted key |
| 3 | **Eve Intercepts** | Eavesdropping detection via QBER | QBER spikes to ~25% under full intercept-resend attack |
| 4 | **Manual Encoding + Eve** | Per-photon interception tracing | See exactly which photons Eve corrupted |
| 5 | **Quantum Gate Transmission** | Gate transformations (H/X/Y/Z/S/T) | Hadamard switches bases; unexpected transforms mimic eavesdropping |
| 6 | **No-Cloning Theorem** | Impossibility of perfect quantum copying | Cloning attempt introduces ~25% QBER — always detectable |
| 7 | **PNS Attack** *(Realistic mode)* | Undetectable eavesdropping on WCP sources | QBER stays at 0% but key is compromised — standard threshold fails |
| 8 | **Decoy State Protocol** *(Realistic mode)* | Countermeasure against PNS | Comparing gain at different intensities reveals the attack |

---

## 📐 Physics Reference

All physics values below are enforced by [PHYSICS_CONTRACT.md](docs/PHYSICS_CONTRACT.md). These are **not** configurable parameters — they are ground-truth invariants that the simulation must reproduce. Any deviation is a bug.

### Validated Benchmarks

| Condition | Expected | Measured |
|:----------|:---------|:---------|
| No Eve, 0km, no noise | QBER = 0% | 0.00% ± 0.5% |
| Full Eve (attack_prob=1.0), no noise | QBER = 25% | 25.0% ± 2.0% |
| Eve attack_prob=0.5 | QBER ≈ 12.5% | 12.5% ± 1.5% |
| Channel distance = 50km | P_survive ≈ 10% | 9.8% ± 1.2% |
| Channel distance = 100km | P_survive ≈ 1% | ~1% |
| QBER ≥ 11% | SKR = 0 (session aborted) | SKR = 0.000 |

### Core Formulas

| Formula | Equation |
|:--------|:---------|
| **Channel attenuation** | `P_survive = 10^(−0.2 × d_km / 10)` |
| **Detection probability** | `P_detect = P_survive × η + P_dark × (1 − P_survive × η)` |
| **Eve QBER contribution** | `QBER_eve = 0.25 × attack_prob` |
| **Binary entropy** | `H(Q) = −Q·log₂(Q) − (1−Q)·log₂(1−Q)` |
| **Secret Key Rate** | `SKR = S × (1 − 2·H(Q))`, 0 if QBER ≥ 0.11 |
| **WCP photon distribution** | `P(n\|μ) = e^(−μ) × μⁿ / n!` (Poisson) |

### Authoritative Constants

| Constant | Value |
|:---------|:------|
| Fiber attenuation coefficient | 0.2 dB/km |
| Detector efficiency (η) | 0.85 (Realistic mode), 1.0 (Ideal mode) |
| Dark count probability | 10⁻⁵ per time slot |
| QBER security threshold | 11% |
| QBER sample fraction | 10% of sifted bits |
| Default mean photon number (μ) | 0.2 |

---

## ⚙️ Installation

### Prerequisites

| Requirement | Minimum | Used in Project |
|:------------|:--------|:----------------|
| Python | 3.11+ | 3.14 |
| Node.js | 18+ | Latest LTS |
| Git | Any | — |

### Clone the Repository

```bash
git clone <repo-url>
cd qkd-simulator
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cd ..
```

### Frontend Setup

```bash
cd frontend
npm install
cd ..
```

---

## 🚀 Running the Project

### Option 1 — Single-Command Launch (Recommended)

Starts both the FastAPI backend (port 8000) and Vite dev server (port 5173), then opens your browser automatically:

```bash
python launch.py
```

Then open: **http://localhost:5173**

Press `CTRL+C` to stop both servers gracefully.

### Option 2 — Development Mode (Two Terminals)

Useful when you need to restart backend and frontend independently.

**Terminal 1 — Backend:**
```bash
cd backend
.venv\Scripts\activate      # Windows (if using venv)
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open: **http://localhost:5173**

### Option 3 — Concurrent Dev Script

```bash
npm run dev       # from project root — runs both via concurrently
```

---

## 📁 Project Structure

```
qkd-simulator/
├── launch.py                      ← Single-command launcher (starts backend + frontend)
├── package.json                   ← Root workspace (concurrently dev script)
│
├── backend/
│   ├── main.py                    ← FastAPI app entry point + static file serving
│   ├── requirements.txt           ← Python dependencies
│   ├── routers/
│   │   └── simulation.py          ← POST /api/simulate endpoint (full BB84 pipeline)
│   ├── models/
│   │   └── schemas.py             ← Pydantic v2 request/response models
│   ├── core/                      ← Physics engine (13 modules)
│   │   ├── alice.py               ← Bit generation, basis selection, state encoding
│   │   ├── bob.py                 ← Basis-dependent measurement
│   │   ├── channel.py             ← Fiber attenuation, detector efficiency, dark counts
│   │   ├── eve.py                 ← Intercept-resend, partial, burst attack strategies
│   │   ├── protocol.py            ← Sifting, QBER estimation, key extraction
│   │   ├── metrics.py             ← SKR, binary entropy, efficiency, chart data
│   │   ├── gates.py               ← H/X/Y/Z/S/T quantum gate transformations
│   │   ├── wcp.py                 ← Weak Coherent Pulse Poisson model
│   │   ├── pns.py                 ← Photon Number Splitting attack
│   │   ├── decoy.py               ← Decoy state protocol (PNS detection)
│   │   ├── experiments.py         ← 8 experiment preset configurations
│   │   └── constants.py           ← All physical constants (single source of truth)
│   └── tests/                     ← pytest suite + dated test runs
│
├── frontend/
│   ├── index.html                 ← HTML entry point
│   ├── vite.config.js             ← Vite build config with API proxy
│   ├── package.json               ← Frontend dependencies
│   └── src/
│       ├── main.jsx               ← React root + BrowserRouter
│       ├── index.css              ← Global styles + CSS variables for themes
│       ├── api/
│       │   └── simulatorAPI.js    ← Single API client (POST /api/simulate)
│       ├── store/
│       │   └── simulationStore.js ← Zustand state (simulation results, UI state, gates)
│       ├── hooks/
│       │   ├── useSimulation.js   ← API + state orchestration hook
│       │   └── usePhotonAnimation.js ← Canvas animation driver (60fps requestAnimationFrame)
│       ├── pages/
│       │   ├── LandingPage.jsx    ← Animated hero with photon particle background
│       │   ├── SimulatorPage.jsx  ← Main layout (sidebar + canvas + config + bottom panel)
│       │   ├── GuidePage.jsx      ← Interactive BB84 guide with theory + glossary
│       │   └── ResultsPage.jsx    ← Post-simulation analysis with charts + OTP demo
│       └── components/
│           ├── canvas/            ← QuantumCanvas, PhotonParticle (animation engine)
│           ├── layout/            ← TopBar, UniversalTopBar, Sidebar, BottomPanel, SimulatorControls
│           ├── controls/          ← ConfigPanel (distance, noise, attack, strategy sliders)
│           ├── metrics/           ← MetricCard, QBERChart, SKRChart
│           ├── gates/             ← GatePropertiesPanel, GateStateVector, GateContextMenu
│           ├── inspector/         ← PhotonInspector (per-photon state viewer + sync mode)
│           ├── experiments/       ← ExperimentModal, PhotonInputTable, Save/Load modals
│           ├── visualizations/    ← BlochSphere (3D quantum state visualization)
│           ├── entities/          ← Entity components for sidebar items
│           ├── results/           ← Results-specific sub-components
│           ├── guide/             ← Guide page sub-sections
│           └── ui/                ← SmartTooltipWrapper, GateTooltip, ParameterTooltip, etc.
│
└── docs/
    ├── PHYSICS_CONTRACT.md        ← Ground-truth physics invariants (all code must conform)
    ├── HIGH_LEVEL_DESIGN.md       ← System architecture overview
    ├── PRD.md                     ← Product requirements document
    ├── DECISIONS.md               ← Architecture decisions with rationale
    ├── CHANGELOG.md               ← File-level change log
    ├── ERROR_LOG.md               ← Known bugs and resolutions
    ├── TEST_LOG.md                ← Test run summaries
    └── RESEARCH_PAPER_DRAFT.md    ← IEEE-format research paper draft
```

---

## 📄 Documentation

| Document | Purpose |
|:---------|:--------|
| [PHYSICS_CONTRACT.md](docs/PHYSICS_CONTRACT.md) | Single source of truth for all physics invariants — basis systems, encoding angles, channel models, gate transformations, validation benchmarks, and authoritative constants. Any code that deviates from this document has a bug. |
| [HIGH_LEVEL_DESIGN.md](docs/HIGH_LEVEL_DESIGN.md) | System architecture, API contract, and end-to-end data flow. |
| [PRD.md](docs/PRD.md) | Product requirements — core features, non-functional requirements, and success criteria. |
| [DECISIONS.md](docs/DECISIONS.md) | Every significant technology and architecture choice, with rationale and alternatives considered. |
| [CHANGELOG.md](docs/CHANGELOG.md) | File-level audit trail of every create, modify, and delete operation. |
| [ERROR_LOG.md](docs/ERROR_LOG.md) | Bugs encountered, root causes, resolutions, and prevention rules. |
| [RESEARCH_PAPER_DRAFT.md](docs/RESEARCH_PAPER_DRAFT.md) | IEEE Transactions on Quantum Engineering paper draft — includes literature survey, validation methodology, user study results, and hardware implementation guide. |

---

## 📌 Version History

| Version | Date | Highlights |
|:--------|:-----|:-----------|
| v0.4.0 | 2026-03-30 | 3D Bloch sphere tooltips, smart tooltip positioning, navigation redesign, enhanced guide page |
| v0.3.1 | 2026-03-29 | Guided exercises, save/load experiments, gate state vector visualization |
| v0.3 | 2026-03-23 | Ideal vs Realistic source toggle, WCP model, PNS attack, decoy states, Experiments 7 & 8 |
| v0.2 | 2026-03-22 | Enhanced photon animation, pause/resume, single photon mode, chart improvements |
| v0.1 | 2026-03-21 | Initial release — physics-accurate BB84 simulation, photon animation, metrics, guide page |

See [CHANGELOG.md](docs/CHANGELOG.md) for the complete file-level history.

---

<p align="center">
  <em>Built with ⚛️ at SRM Institute of Science & Technology for QtHack04</em>
</p>
