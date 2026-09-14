"""
H3 — Cloning probe disturbance model.

Defect: apply_cloning_probe() randomized every affected photon over all
four BB84 states, producing ~50% QBER, contradicting the PHYSICS_CONTRACT
Section 11 CNOT model (~25%).

Fix: CNOT mechanics — rectilinear ('+') states are invariant; diagonal
('x') states become maximally mixed (uniform random bit in the diagonal
basis). Net QBER = P(x) * 50% = 25%.
"""

import pytest

from core.gates import apply_cloning_probe
from core.constants import POLARIZATION_ANGLES, STATE_LABELS
from conftest import sifted_qber


def _four_states() -> list[dict]:
    return [
        {'index': 0, 'bit': 0, 'basis': '+', 'alice_bit': 0,
         'alice_basis': '+', 'state_label': '|0>',
         'polarization_angle': 0.0, 'detected': True, 'dark_count': False},
        {'index': 1, 'bit': 1, 'basis': '+', 'alice_bit': 1,
         'alice_basis': '+', 'state_label': '|1>',
         'polarization_angle': 90.0, 'detected': True, 'dark_count': False},
        {'index': 2, 'bit': 0, 'basis': 'x', 'alice_bit': 0,
         'alice_basis': 'x', 'state_label': '|+>',
         'polarization_angle': 45.0, 'detected': True, 'dark_count': False},
        {'index': 3, 'bit': 1, 'basis': 'x', 'alice_bit': 1,
         'alice_basis': 'x', 'state_label': '|->',
         'polarization_angle': 135.0, 'detected': True,
         'dark_count': False},
    ]


class TestCNOTUnit:
    def test_rectilinear_states_invariant(self):
        """CNOT leaves |0> and |1> unchanged (no added error)."""
        out = apply_cloning_probe(_four_states(), 0, 0.5)
        # indices 0 and 1 are rectilinear (+ basis)
        assert out[0]['basis'] == '+'
        assert out[0]['bit'] == 0
        assert out[0]['state_label'] == '|0>'
        assert out[0]['polarization_angle'] == 0.0
        assert out[0]['cloning_probe_applied'] is True

    def test_diagonal_state_becomes_mixed_diagonal(self):
        """A disturbed 'x' photon stays a valid diagonal BB84 state."""
        out = apply_cloning_probe(_four_states(), 0, 0.5)
        # index 2 is the diagonal 'x' photon
        assert out[2]['basis'] == 'x'
        assert out[2]['bit'] in (0, 1)
        key = (out[2]['basis'], out[2]['bit'])
        assert out[2]['state_label'] == STATE_LABELS[key]
        assert out[2]['polarization_angle'] == POLARIZATION_ANGLES[key]
        assert out[2]['cloning_probe_applied'] is True
        assert out[2]['lane_corrupted'] is True

    def test_alice_fields_never_mutated(self):
        for lane in (0, 1, 2):
            for s in apply_cloning_probe(_four_states(), lane, 0.5):
                assert 'alice_bit' in s and 'alice_basis' in s
        out = apply_cloning_probe(_four_states(), 0, 0.5)
        for s in out:
            # alice_* fields present and untouched by the probe
            assert s['alice_bit'] in (0, 1)
            assert s['alice_basis'] in ('+', 'x')

    def test_other_lanes_untouched(self):
        states = _four_states()
        states[1]['lane'] = 1  # photon marked on other lane
        out = apply_cloning_probe(states, 0, 0.5)
        assert 'cloning_probe_applied' not in out[1]


class TestCNOTStatistics:
    def test_all_lanes_probe_gives_25_percent(self, pipeline):
        """
        Probes on the channel disturb the whole stream: overall
        sifted QBER ~25% (not ~50%).
        """
        res = pipeline(
            n_bits=6000, distance_km=0.0, noise_level=0.0,
            attack_prob=0.0, seed=2024,
            gates=[
                {'type': 'clone', 'lane': 0, 'position': 0.5},
                {'type': 'clone', 'lane': 1, 'position': 0.5},
                {'type': 'clone', 'lane': 2, 'position': 0.5},
            ],
        )
        qber, n_sifted = sifted_qber(res['measured_states'])
        assert n_sifted > 500
        assert 0.20 <= qber <= 0.30, (
            f"all-lane cloning QBER {qber:.3f} not ~25% "
            f"(n_sifted={n_sifted})"
        )

    def test_single_lane_probe_gives_25_percent(self, pipeline):
        """Single transmission lane carries 100% of photons -> ~25% QBER."""
        res = pipeline(
            n_bits=6000, distance_km=0.0, noise_level=0.0,
            attack_prob=0.0, seed=2025,
            gates=[{'type': 'clone', 'lane': 0, 'position': 0.5}],
        )
        qber, n_sifted = sifted_qber(res['measured_states'])
        assert n_sifted > 500
        assert 0.20 <= qber <= 0.30, (
            f"single-lane cloning QBER {qber:.3f} not ~25%"
        )

    def test_old_full_randomisation_would_exceed_bound(self, pipeline):
        """
        Guard against regression to the old 50% behaviour: the
        all-lane QBER must be well below 0.40.
        """
        res = pipeline(
            n_bits=4000, distance_km=0.0, noise_level=0.0,
            attack_prob=0.0, seed=99,
            gates=[
                {'type': 'clone', 'lane': 0, 'position': 0.5},
                {'type': 'clone', 'lane': 1, 'position': 0.5},
                {'type': 'clone', 'lane': 2, 'position': 0.5},
            ],
        )
        qber, _ = sifted_qber(res['measured_states'])
        assert qber < 0.40
