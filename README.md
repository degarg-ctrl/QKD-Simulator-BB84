# BB84 Quantum Key Distribution Simulator

This project proposes the development of a Python-based simulator for the BB84 Quantum Key Distribution (QKD) protocol. The objective is to design a realistic and configurable simulation framework to analyze quantum-secure communication under practical operating conditions.

---

## About

The BB84 Quantum Key Distribution Simulator is a physics-accurate, interactive tool designed to visualize the fundamental principles of quantum cryptography. Users can simulate the complete BB84 protocol involving Alice, Bob, and an optional eavesdropper, Eve, to understand how quantum mechanics ensures information security. The simulator maintains strict physics accuracy, demonstrating a 25% QBER under full Eve interception and modeling fiber-optic transmission via Beer-Lambert attenuation at distances up to 150km. Designed for research, teaching, and hackathon demonstrations, it calculates the Secret Key Rate (SKR) using binary entropy and verifies security thresholds as at 11% QBER. Key features include animated photon transmission, interactive quantum gate manipulation, and advanced source modeling like Weak Coherent Pulses (WCP) with decoy state detection.

---

## Features

List these exactly:
- Full BB84 physics pipeline (Alice → Channel → Eve → Gates → Bob → Protocol → Metrics)
- 8 experiment modes including no-cloning theorem and PNS attack
- Quantum gates (H/X/Y/Z/S/T) with drag-and-drop canvas
- Ideal vs Realistic source model toggle (WCP + Poisson distribution)
- PNS attack simulation + Decoy State detection
- One-Time Pad encryption demo
- Photon Inspector with sync mode
- Interactive Guide with formula derivations and inline charts
- Results page with simulated vs theoretical comparison
- Dark / Light mode
- Landing page with animated photon background
- Single-command launch via launch.py

---

## Tech Stack

| Backend | Frontend |
| :--- | :--- |
| Python 3.14 | React 18 |
| FastAPI | Vite 5 |
| Pydantic v2 | Tailwind CSS |
| NumPy | Framer Motion |
| | Zustand |
| | Recharts |
| | HTML5 Canvas |

---

## Installation

### Prerequisites
- Python 3.11+ (project uses 3.14)
- Node.js 18+
- Git

### Clone
```bash
git clone <repo-url>
cd <repo-folder>
```

### Backend setup
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### Frontend setup
```bash
cd frontend
npm install
cd ..
```

---

## Running the Project

### Option 1 — Single launch (recommended)
Builds frontend and starts everything on port 8000:
```bash
python launch.py
```
Then open: http://localhost:8000

### Option 2 — Development mode (two terminals)
**Terminal 1:**
```bash
cd backend
activate .venv\Scripts\activate  # if using venv
uvicorn main:app --reload --port 8000
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```
Then open: http://localhost:5173

---

## Project Structure

```text
backend/
  core/         ← physics modules
  main.py       ← FastAPI app
frontend/
  src/
    components/ ← UI components
    pages/      ← LandingPage, SimulatorPage, etc
    store/      ← Zustand state
    api/        ← API calls
launch.py       ← single-command launcher
PHYSICS_CONTRACT.md
CHANGELOG.md
```

---

## Physics Reference

Include these verified values:
- QBER under full Eve interception: 25%
- Security threshold: 11% QBER
- Attenuation at 50km: ~10% photon survival
- Attenuation at 100km: ~1% photon survival
- SKR formula: S*(1 - 2*H(Q)), where H is binary entropy

---

## Documentation

- PHYSICS_CONTRACT.md — all physics invariants
- CHANGELOG.md — version history
- DECISIONS.md — architectural decisions
- ERROR_LOG.md — known issues and resolutions

---

## Version

Current: v0.4.0-final
See CHANGELOG.md for full history.
