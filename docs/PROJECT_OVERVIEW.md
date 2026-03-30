# QKD BB84 Simulator — Project Overview
Version: 0.1 | Status: In Development | Started: 2026-03-12

## What Is This?
A web-based interactive simulator for the BB84 Quantum Key Distribution protocol.
Built as a research evaluation tool and teaching platform for students and educators
learning about quantum cryptography and quantum-secure communication.

## Why Does This Exist?
Quantum computing threatens RSA and ECC. QKD offers information-theoretic security
grounded in quantum mechanics. Most educational resources are too theoretical or
require physical hardware. This simulator runs on classical hardware while faithfully
modeling BB84 physics.

## What Does It Do?
- Complete BB84 protocol: Alice encodes photons, fiber channel, Eve intercepts, Bob measures
- Real-world impairments: fiber attenuation, detector inefficiency, dark counts
- Adversarial attacks: intercept-resend, partial interception, burst attack
- Security metrics: QBER and SKR computed from physics-accurate simulation
- Photon animation: real-time polarization state visualization on HTML5 Canvas
- Beginner guide: theory, step-by-step walkthrough, component tooltips

## Who Is It For?
- University students studying quantum cryptography or information security
- Educators teaching QKD in lectures or lab sessions
- Researchers needing a configurable BB84 performance evaluation platform

## Tech Stack
Backend:   Python 3.11, FastAPI, Pydantic v2, NumPy, SciPy
Frontend:  React 18, Vite 5, Tailwind CSS, Framer Motion, Zustand, Recharts
Animation: HTML5 Canvas API, requestAnimationFrame
VCS:       Git, protected main and develop branches

## Team
Developer:   Antigravity
Supervisor:  Devansh
Institution: QKD Research Lab
Repository:  c:\Devansh\Projects\QKD_Simulator\qkd-simulator
