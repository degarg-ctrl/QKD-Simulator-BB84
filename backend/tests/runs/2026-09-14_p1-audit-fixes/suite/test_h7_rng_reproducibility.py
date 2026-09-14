"""
H7 — Single-RNG architecture and deterministic replay.

Defect: randomness was drawn from np.random.* in some modules and from
independent default_rng() instances in others, so a single seed could
not reproduce a simulation.

Fix: core/rng.create_rng(seed) is the one entry point; the router
threads that single Generator through Alice, Channel, Eve, PNS, gates,
Bob and the QBER shuffle. An optional `seed` request parameter enables
deterministic replay; None stays stochastic.
"""

import pytest

from core.rng import create_rng, resolve_rng
from conftest import run_pipeline


STOCHASTIC_PAYLOAD = {
    'n_bits': 2000,
    'distance_km': 20.0,
    'noise_level': 0.1,
    'attack_prob': 0.5,
    'attack_strategy': 'intercept_resend',
}

FULL_PAYLOAD = {
    'n_bits': 2000,
    'distance_km': 50.0,
    'noise_level': 0.05,
    'attack_prob': 0.8,
    'attack_strategy': 'pns',
    'wcp_enabled': True,
    'decoy_enabled': True,
    'mean_photon_number': 0.5,
    'gates': [
        {'type': 'clone', 'lane': 0, 'position': 0.5},
        {'type': 'H', 'lane': 1, 'position': 0.4},
    ],
}


class TestRNGModule:
    def test_create_rng_same_seed_same_stream(self):
        a = create_rng(42).random(10)
        b = create_rng(42).random(10)
        assert list(a) == list(b)

    def test_create_rng_different_seed_differs(self):
        a = create_rng(1).random(10)
        b = create_rng(2).random(10)
        assert list(a) != list(b)

    def test_unseeded_is_stochastic(self):
        a = create_rng(None).random(10)
        b = create_rng(None).random(10)
        assert list(a) != list(b)

    def test_resolve_rng_fallback_is_generator(self):
        import numpy as np
        assert isinstance(resolve_rng(None), np.random.Generator)
        gen = create_rng(0)
        assert resolve_rng(gen) is gen


class TestInternalReproducibility:
    def test_same_seed_same_measured_states(self):
        a = run_pipeline(n_bits=800, distance_km=20.0, noise_level=0.1,
                         attack_prob=0.5, seed=2024)
        b = run_pipeline(n_bits=800, distance_km=20.0, noise_level=0.1,
                         attack_prob=0.5, seed=2024)
        assert a['measured_states'] == b['measured_states']

    def test_different_seed_differs(self):
        a = run_pipeline(n_bits=800, distance_km=20.0, noise_level=0.1,
                         attack_prob=0.5, seed=1)
        b = run_pipeline(n_bits=800, distance_km=20.0, noise_level=0.1,
                         attack_prob=0.5, seed=2)
        assert a['measured_states'] != b['measured_states']

    def test_wcp_pns_seed_reproducible(self):
        a = run_pipeline(n_bits=1000, distance_km=10.0, wcp_enabled=True,
                         decoy_enabled=True, attack_strategy='pns',
                         attack_prob=0.8, seed=7)
        b = run_pipeline(n_bits=1000, distance_km=10.0, wcp_enabled=True,
                         decoy_enabled=True, attack_strategy='pns',
                         attack_prob=0.8, seed=7)
        assert a['measured_states'] == b['measured_states']
        assert list(a['decoy_intensities']) == list(b['decoy_intensities'])


class TestAPISeed:
    @pytest.mark.sync
    def test_same_seed_identical_response(self, client):
        payload = dict(STOCHASTIC_PAYLOAD, seed=12345)
        a = client.post('/api/simulate', json=payload).json()
        b = client.post('/api/simulate', json=payload).json()
        assert a == b

    @pytest.mark.sync
    def test_different_seed_varies(self, client):
        a = client.post('/api/simulate',
                        json=dict(STOCHASTIC_PAYLOAD, seed=1)).json()
        b = client.post('/api/simulate',
                        json=dict(STOCHASTIC_PAYLOAD, seed=2)).json()
        assert a != b

    @pytest.mark.sync
    def test_unseeded_varies(self, client):
        a = client.post('/api/simulate', json=STOCHASTIC_PAYLOAD).json()
        b = client.post('/api/simulate', json=STOCHASTIC_PAYLOAD).json()
        # Full event streams are effectively impossible to match by chance.
        assert a['event_stream'] != b['event_stream']

    @pytest.mark.sync
    def test_seed_accepted_with_full_pipeline(self, client):
        payload = dict(FULL_PAYLOAD, seed=99)
        a = client.post('/api/simulate', json=payload)
        b = client.post('/api/simulate', json=payload)
        assert a.status_code == 200, a.text
        assert b.status_code == 200, b.text
        assert a.json() == b.json()
