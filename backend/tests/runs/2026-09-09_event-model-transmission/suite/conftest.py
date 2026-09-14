"""
conftest.py — fixtures for the 2026-09-09 event-model test suite.

Provides a full-pipeline runner (mirrors routers/simulation.py order)
and an HTTP client for end-to-end API assertions.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

# Path setup: make `core.*` / `models.*` importable from backend/
# File:  backend/tests/runs/2026-09-09_event-model-transmission/suite/conftest.py
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
from core.events import (
    build_event_record,
    compute_transmission_accounting,
    select_event_stream_indices,
)
from core.constants import DETECTOR_EFFICIENCY, DARK_COUNT_PROB


def run_pipeline(
    n_bits: int = 1000,
    distance_km: float = 0.0,
    noise_level: float = 0.0,
    attack_strategy: str = 'intercept_resend',
    attack_prob: float = 0.0,
    wcp_enabled: bool = False,
    mean_photon_number: float = 0.2,
) -> dict:
    """
    Run the BB84 pipeline in the exact router order and return the
    measured states plus the derived event/accounting structures.

    Order (must match routers/simulation.py):
      Alice -> WCP -> Channel -> Eve -> PNS -> Bob
    """
    alice = Alice()
    bits = alice.generate_bits(n_bits)
    bases = alice.choose_bases(n_bits)
    states = alice.encode_states(bits, bases)

    if wcp_enabled:
        rng = np.random.default_rng()
        photon_counts = poisson_photon_counts(
            n_bits, mean_photon_number, rng
        )
        states = apply_wcp_to_states(states, photon_counts)

    channel = QuantumChannel(
        distance_km=distance_km,
        noise_level=noise_level,
        detector_efficiency=DETECTOR_EFFICIENCY if wcp_enabled else 1.0,
        dark_count_prob=DARK_COUNT_PROB if wcp_enabled else 0.0,
    )
    channel_states = channel.transmit(states)

    eve = Eve(
        attack_strategy=(
            attack_strategy
            if attack_strategy != 'pns' else 'intercept_resend'
        ),
        attack_prob=(
            attack_prob if attack_strategy != 'pns' else 0.0
        ),
    )
    eve_states = eve.intercept(channel_states)

    pns_stats = {}
    if wcp_enabled and attack_strategy == 'pns':
        pns = PNSAttack(
            p_block=attack_prob * 0.5,
            p_split=attack_prob,
        )
        eve_states, pns_stats = pns.attack(
            eve_states, np.random.default_rng()
        )

    bob = Bob()
    measured_states = bob.measure(eve_states)

    return {
        'measured_states': measured_states,
        'events': [build_event_record(s) for s in measured_states],
        'accounting': compute_transmission_accounting(measured_states),
        'stream_indices': select_event_stream_indices(measured_states),
        'pns_stats': pns_stats,
    }


@pytest.fixture
def pipeline():
    """Callable fixture wrapping run_pipeline."""
    return run_pipeline


@pytest.fixture(scope='session')
def api():
    """FastAPI TestClient bound to the real app."""
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)
