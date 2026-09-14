"""
H1 — Vacuum gain / dark-count handling.

Defect: compute_gains() required ``detected and not lost``. Vacuum pulses
are marked 'lost' (no photon emitted), so a registered DARK COUNT in a
vacuum slot was structurally discarded and Y_0 = Q_vac = 0 even in
realistic detector mode.

Fix: a registered detector click counts toward the gain even on a 'lost'
slot (the dark-count model itself is unchanged); PNS-blocked slots still
never count.
"""

import numpy as np
import pytest

from core.channel import QuantumChannel
from core.constants import DARK_COUNT_PROB
from core.decoy import (
    compute_gains,
    estimate_y1_lmc,
    MU_VACUUM,
    MU_SIGNAL,
    MU_DECOY,
)
from core.rng import create_rng


def _vacuum_states(n: int, detected_indices: set[int]) -> list[dict]:
    return [
        {
            'index': i,
            'bit': 0,
            'basis': '+',
            'alice_bit': 0,
            'alice_basis': '+',
            'wcp_vacuum': True,
            'wcp_lost': True,
            'detected': i in detected_indices,
            'lost': True,
            'dark_count': i in detected_indices,
            'pns_blocked': False,
        }
        for i in range(n)
    ]


class TestVacuumGainAccounting:
    def test_vacuum_dark_count_counts_toward_vacuum_gain(self):
        """A registered dark-count click on a vacuum slot yields Y0 > 0."""
        states = _vacuum_states(10, detected_indices={0, 1, 2, 3})
        intensities = np.array([MU_VACUUM] * 10)
        gains = compute_gains(states, intensities)
        assert gains['vacuum_gain'] == pytest.approx(0.4)
        assert gains['vacuum_gain'] > 0.0

    def test_no_click_vacuum_slots_not_counted(self):
        states = _vacuum_states(5, detected_indices=set())
        intensities = np.array([MU_VACUUM] * 5)
        gains = compute_gains(states, intensities)
        assert gains['vacuum_gain'] == 0.0

    def test_vacuum_forces_detected_dark_clicks(self):
        """
        Detector with dark_count_prob=1.0 and no real photon: every
        vacuum slot registers a dark count (no photon ever emitted).
        """
        states = _vacuum_states(200, detected_indices=set())
        channel = QuantumChannel(
            distance_km=0.0,
            detector_efficiency=0.0,
            dark_count_prob=1.0,
            rng=create_rng(0),
        )
        out = channel.transmit(states)
        assert all(s['dark_count'] for s in out)
        assert all(s['detected'] for s in out)
        assert all(s['fiber_survived'] is False for s in out)

        intensities = np.array([MU_VACUUM] * 200)
        gains = compute_gains(out, intensities)
        assert gains['vacuum_gain'] == pytest.approx(1.0)

    def test_ideal_detector_has_no_vacuum_clicks(self):
        """Ideal detector (eta=1, dark=0): no vacuum slots ever click."""
        states = _vacuum_states(200, detected_indices=set())
        channel = QuantumChannel(
            distance_km=0.0,
            detector_efficiency=1.0,
            dark_count_prob=0.0,
            rng=create_rng(0),
        )
        out = channel.transmit(states)
        assert not any(s['dark_count'] for s in out)
        intensities = np.array([MU_VACUUM] * 200)
        gains = compute_gains(out, intensities)
        assert gains['vacuum_gain'] == 0.0

    def test_non_vacuum_gain_still_counts_real_detections(self):
        """Signal/decoy gains are unaffected in form: real clicks count."""
        states = []
        intensities = []
        for i in range(10):
            mu = MU_SIGNAL if i % 2 == 0 else MU_DECOY
            intensities.append(mu)
            states.append({
                'index': i, 'wcp_vacuum': False,
                'detected': True, 'lost': False,
                'dark_count': False, 'pns_blocked': False,
            })
        gains = compute_gains(states, np.array(intensities))
        assert gains['signal_gain'] == pytest.approx(1.0)
        assert gains['decoy_gain'] == pytest.approx(1.0)

    def test_pns_blocked_slot_never_counts(self):
        """A blocked slot must not contribute even if a click was drawn."""
        states = [{
            'index': 0, 'wcp_vacuum': False,
            'detected': True, 'lost': True,
            'dark_count': False, 'pns_blocked': True,
        }]
        gains = compute_gains(states, np.array([MU_SIGNAL]))
        assert gains['signal_gain'] == 0.0

    def test_y0_equals_vacuum_gain(self):
        """estimate_y1_lmc uses Q_vac directly as Y_0."""
        Q_s, Q_d, Q_vac = 0.01, 0.002, 1e-4
        _, Y_0 = estimate_y1_lmc(Q_s, Q_d, Q_vac)
        assert Y_0 == pytest.approx(Q_vac)

    def test_realistic_mode_vacuum_gain_within_dark_count_scale(self, pipeline):
        """
        Qualitative realistic-mode check: over a large run the vacuum
        gain is non-negative and bounded by a generous multiple of the
        dark-count probability (it is tiny, as physics requires).
        """
        result = pipeline(
            n_bits=10000, distance_km=0.0, wcp_enabled=True,
            mean_photon_number=0.2, decoy_enabled=True,
            attack_strategy='intercept_resend', attack_prob=0.0, seed=7,
        )
        gains = compute_gains(
            result['measured_states'], result['decoy_intensities']
        )
        assert gains['vacuum_gain'] >= 0.0
        assert gains['vacuum_gain'] <= 100 * DARK_COUNT_PROB
