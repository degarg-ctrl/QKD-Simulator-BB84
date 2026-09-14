"""
conftest.py — fixtures for the 2026-09-14 P1 audit-fix test suite.

Covers audit fixes H1..H7 (see this run's specs/requirements.md).

Provides:
  - sys.path setup so `core.*` / `models.*` / `main` are importable.
  - a full-pipeline runner mirroring routers/simulation.py, with an
    optional seed so tests can be deterministic.
  - a FastAPI TestClient fixture for the router path (seed param).
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

# Path setup: suite/ -> 2026-09-14.../ -> runs/ -> tests/ -> backend/
_SUITE_DIR   = Path(__file__).parent
_RUN_DIR     = _SUITE_DIR.parent
_RUNS_DIR    = _RUN_DIR.parent
_TESTS_DIR   = _RUNS_DIR.parent
_BACKEND_DIR = _TESTS_DIR.parent

for p in [str(_BACKEND_DIR), str(_SUITE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from core.alice import Alice
from core.bob import Bob
from core.channel import QuantumChannel
from core.eve import Eve
from core.pns import PNSAttack
from core.wcp import poisson_photon_counts, apply_wcp_to_states
from core.decoy import assign_decoy_intensities
from core.rng import create_rng
from core.constants import DETECTOR_EFFICIENCY, DARK_COUNT_PROB


def run_pipeline(
    n_bits: int = 1000,
    distance_km: float = 0.0,
    noise_level: float = 0.0,
    attack_strategy: str = 'intercept_resend',
    attack_prob: float = 0.0,
    wcp_enabled: bool = False,
    mean_photon_number: float = 0.2,
    decoy_enabled: bool = False,
    gates: list | None = None,
    seed: int | None = None,
) -> dict:
    """
    Run the BB84 pipeline in the exact router order and return the
    measured states plus intermediate arrays.

    Order (must match routers/simulation.py):
      Alice -> WCP -> Channel -> Eve -> PNS -> gates -> Bob

    All randomness is drawn from ONE seeded generator (create_rng(seed)),
    so passing the same seed reproduces the run exactly.
    """
    rng = create_rng(seed)

    alice = Alice(rng=rng)
    bits = alice.generate_bits(n_bits)
    bases = alice.choose_bases(n_bits)
    states = alice.encode_states(bits, bases)

    decoy_intensities = None
    if wcp_enabled:
        if decoy_enabled:
            decoy_intensities = assign_decoy_intensities(n_bits, rng)
            photon_counts = np.array([rng.poisson(mu)
                                      for mu in decoy_intensities])
        else:
            photon_counts = poisson_photon_counts(
                n_bits, mean_photon_number, rng
            )
        states = apply_wcp_to_states(states, photon_counts)

    channel = QuantumChannel(
        distance_km=distance_km,
        noise_level=noise_level,
        detector_efficiency=DETECTOR_EFFICIENCY if wcp_enabled else 1.0,
        dark_count_prob=DARK_COUNT_PROB if wcp_enabled else 0.0,
        rng=rng,
    )
    channel_states = channel.transmit(states)

    eve = Eve(
        attack_strategy=(
            attack_strategy if attack_strategy != 'pns'
            else 'intercept_resend'
        ),
        attack_prob=(
            attack_prob if attack_strategy != 'pns' else 0.0
        ),
        rng=rng,
    )
    eve_states = eve.intercept(channel_states)

    if wcp_enabled and attack_strategy == 'pns':
        pns = PNSAttack(p_block=attack_prob * 0.5, p_split=attack_prob)
        eve_states, _ = pns.attack(eve_states, rng)

    if gates:
        from core.gates import apply_gates_to_lane, apply_cloning_probe
        probes = [g for g in gates
                  if g.get('type') in ('clone', 'cnot')]
        regular_gates = [g for g in gates
                         if g.get('type') not in ('clone', 'cnot')]
        if regular_gates:
            eve_states = apply_gates_to_lane(
                eve_states, 0, regular_gates
            )
        for probe in probes:
            eve_states = apply_cloning_probe(
                eve_states,
                0,
                probe.get('position', 0.5),
                rng=rng,
            )

    bob = Bob(rng=rng)
    measured_states = bob.measure(eve_states)

    return {
        'rng': rng,
        'measured_states': measured_states,
        'channel_states': channel_states,
        'decoy_intensities': decoy_intensities,
    }


def sifted_qber(measured_states: list[dict]) -> tuple[float, int]:
    """Return (QBER, sifted_count) from raw measured-state dicts."""
    sifted = [
        s for s in measured_states
        if s.get('measured')
        and s.get('bob_basis') == s.get('alice_basis')
    ]
    errors = sum(1 for s in sifted if s.get('bob_bit') != s.get('alice_bit'))
    return (errors / len(sifted) if sifted else 0.0), len(sifted)


@pytest.fixture
def pipeline():
    """Callable fixture wrapping run_pipeline."""
    return run_pipeline


@pytest.fixture(scope='session')
def client():
    """FastAPI TestClient bound to the real app (router + schemas)."""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)
