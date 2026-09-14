"""
H6 — Channel noise must keep the canonical quantum state consistent.

Defect: a noise-induced bit flip mutated state['bit'] but left
state['state_label'] and state['polarization_angle'] describing the
pre-flip state, producing internally inconsistent event records.

Fix: the flip updates bit, state_label and polarization_angle together
(basis is unchanged — the flip is within the current basis).
"""

import pytest

from core.alice import Alice
from core.channel import QuantumChannel
from core.rng import create_rng
from core.constants import STATE_LABELS, POLARIZATION_ANGLES


def _alice_states(n: int, seed: int = 0) -> list[dict]:
    alice = Alice(rng=create_rng(seed))
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    return alice.encode_states(bits, bases)


class TestNoiseFlipConsistency:
    def test_every_flipped_state_is_canonical(self):
        """Noise=1.0 flips every detected photon; all must stay canonical."""
        states = _alice_states(500, seed=1)
        channel = QuantumChannel(
            distance_km=0.0, noise_level=1.0,
            detector_efficiency=1.0, dark_count_prob=0.0,
            rng=create_rng(2),
        )
        out = channel.transmit(states)
        flipped = [s for s in out if s['noise_flipped']]
        assert len(flipped) == len(states)
        for s in out:
            key = (s['basis'], s['bit'])
            assert s['state_label'] == STATE_LABELS[key], (
                f"index {s['index']}: label {s['state_label']} != "
                f"{STATE_LABELS[key]} for (basis={s['basis']}, bit={s['bit']})"
            )
            assert s['polarization_angle'] == POLARIZATION_ANGLES[key], (
                f"index {s['index']}: angle {s['polarization_angle']} != "
                f"{POLARIZATION_ANGLES[key]} for "
                f"(basis={s['basis']}, bit={s['bit']})"
            )

    def test_flip_is_within_basis_and_inverts_bit(self):
        """A noise flip inverts the bit but never changes the basis."""
        states = _alice_states(300, seed=3)
        channel = QuantumChannel(
            distance_km=0.0, noise_level=1.0,
            detector_efficiency=1.0, dark_count_prob=0.0,
            rng=create_rng(4),
        )
        out = channel.transmit(states)
        for before, after in zip(states, out):
            assert after['basis'] == before['basis']
            assert after['bit'] == 1 - before['bit']

    def test_partial_noise_flips_are_consistent(self, pipeline):
        """Mixed stream: every noise_flipped slot is internally consistent."""
        res = pipeline(
            n_bits=4000, distance_km=0.0, noise_level=0.3,
            attack_strategy='intercept_resend', attack_prob=0.0, seed=5,
        )
        flipped = [s for s in res['measured_states'] if s.get('noise_flipped')]
        assert len(flipped) > 100
        for s in flipped:
            key = (s['basis'], s['bit'])
            assert s['state_label'] == STATE_LABELS[key]
            assert s['polarization_angle'] == POLARIZATION_ANGLES[key]

    def test_unflipped_states_remain_canonical(self, pipeline):
        res = pipeline(
            n_bits=2000, distance_km=0.0, noise_level=0.0,
            attack_strategy='intercept_resend', attack_prob=0.0, seed=6,
        )
        for s in res['measured_states']:
            key = (s['basis'], s['bit'])
            assert s['state_label'] == STATE_LABELS[key]
            assert s['polarization_angle'] == POLARIZATION_ANGLES[key]
