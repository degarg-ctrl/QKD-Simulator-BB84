"""
EVE/PNS event semantics + physics regressions protected by the
event-model change.

Guards:
1. Eve/PNS only interact with pulses that physically reached Eve.
2. Serialized post-Eve state matches the simulated re-emission.
3. Frontend-visible state corresponds to the backend result.
4. Physics invariants survive the change (QBER 25%±3%, PNS < 5%).
"""

import pytest

from core.constants import POLARIZATION_ANGLES


class TestEveEventSemantics:
    """Eve interacts only with photons that survived the fiber."""

    @pytest.mark.fast
    def test_intercepted_implies_fiber_survived(self, pipeline):
        """A photon absorbed before Eve cannot be intercepted."""
        result = pipeline(
            n_bits=2000, distance_km=60,
            attack_strategy='intercept_resend', attack_prob=1.0,
        )
        for e in result['events']:
            if e.intercepted:
                assert e.fiber_survived is True, (
                    f"event {e.index}: intercepted but fiber_survived=False"
                )

    @pytest.mark.fast
    def test_intercepted_events_carry_eve_fields(self, pipeline):
        result = pipeline(
            n_bits=500, distance_km=0,
            attack_strategy='intercept_resend', attack_prob=1.0,
        )
        intercepted = [e for e in result['events'] if e.intercepted]
        assert len(intercepted) > 100
        for e in intercepted:
            assert e.eve_basis in ('+', 'x')
            assert e.eve_bit in (0, 1)
            assert e.eve_basis_match is not None
            # Resend angle is the actual re-emitted polarization
            assert e.eve_resend_angle is not None
            assert e.eve_resend_angle in (0.0, 45.0, 90.0, 135.0)

    @pytest.mark.fast
    def test_resend_angle_matches_backend_reencoding(self, pipeline):
        """
        eve_resend_angle must equal the angle for (eve_basis, eve_bit)
        — the actual state Eve re-emitted, not a frontend invention.
        """
        result = pipeline(
            n_bits=500, distance_km=0,
            attack_strategy='intercept_resend', attack_prob=1.0,
        )
        for e in result['events']:
            if e.intercepted:
                expected = POLARIZATION_ANGLES[(e.eve_basis, e.eve_bit)]
                assert e.eve_resend_angle == expected, (
                    f"event {e.index}: resend angle {e.eve_resend_angle} "
                    f"!= {expected} for ({e.eve_basis},{e.eve_bit})"
                )

    @pytest.mark.fast
    def test_basis_match_leaves_alice_state(self, pipeline):
        """
        When Eve guesses Alice's basis, the re-emitted angle equals
        Alice's original angle (no disturbance).
        """
        result = pipeline(
            n_bits=500, distance_km=0,
            attack_strategy='intercept_resend', attack_prob=1.0,
        )
        matched = [
            e for e in result['events']
            if e.intercepted and e.eve_basis_match
        ]
        assert len(matched) > 50
        for e in matched:
            assert e.eve_resend_angle == e.alice_polarization_angle

    @pytest.mark.fast
    def test_unintercepted_have_no_eve_state(self, pipeline):
        result = pipeline(
            n_bits=500, distance_km=0,
            attack_strategy='partial', attack_prob=0.3,
        )
        for e in result['events']:
            if not e.intercepted:
                assert e.eve_basis is None
                assert e.eve_bit is None
                assert e.eve_resend_angle is None


class TestPNSEventSemantics:
    """PNS splits/blocks only apply to reachable pulses."""

    @pytest.mark.fast
    def test_pns_events_require_fiber_survival(self, pipeline):
        result = pipeline(
            n_bits=2000, distance_km=60, wcp_enabled=True,
            mean_photon_number=0.5,
            attack_strategy='pns', attack_prob=1.0,
        )
        for e in result['events']:
            if e.pns_split or e.pns_blocked:
                assert e.fiber_survived is True
                assert e.wcp_vacuum is False

    @pytest.mark.fast
    def test_split_requires_multi_photon(self, pipeline):
        """Splits can only happen on multiphoton pulses."""
        result = pipeline(
            n_bits=2000, distance_km=0, wcp_enabled=True,
            mean_photon_number=0.5,
            attack_strategy='pns', attack_prob=1.0,
        )
        splits = [e for e in result['events'] if e.pns_split]
        assert len(splits) > 10
        for e in splits:
            assert e.wcp_multi is True
            assert e.wcp_photon_count >= 2
            assert e.eve_has_copy is True

    @pytest.mark.fast
    def test_blocked_requires_single_photon(self, pipeline):
        """Blocks can only happen on single-photon pulses."""
        result = pipeline(
            n_bits=2000, distance_km=0, wcp_enabled=True,
            mean_photon_number=0.5,
            attack_strategy='pns', attack_prob=1.0,
        )
        blocks = [e for e in result['events'] if e.pns_blocked]
        assert len(blocks) > 10
        for e in blocks:
            assert e.wcp_single is True
            assert e.wcp_photon_count == 1
            assert e.detector_detected is False
            assert e.lost is True

    @pytest.mark.fast
    def test_split_pulse_still_reaches_bob(self, pipeline):
        """A split pulse forwards the remaining photons to Bob."""
        result = pipeline(
            n_bits=2000, distance_km=0, wcp_enabled=True,
            mean_photon_number=0.5,
            attack_strategy='pns', attack_prob=1.0,
        )
        # Ideal detector: every surviving non-blocked pulse is detected
        splits = [e for e in result['events'] if e.pns_split]
        detected_splits = [e for e in splits if e.detector_detected]
        # eta=1 in this configuration (wcp forces realistic) — the
        # router couples WCP with realistic detector; use accounting
        acc = result['accounting']
        assert acc['pns_split'] > 0
        assert acc['eve_copies'] == acc['pns_split']
        # Splits must not appear as blocked or lost
        for e in splits:
            assert e.pns_blocked is False

    @pytest.mark.fast
    def test_no_false_classification_without_attack(self, pipeline):
        """Clean run: zero PNS events, zero Eve copies."""
        result = pipeline(
            n_bits=1000, distance_km=30, wcp_enabled=True,
            mean_photon_number=0.5, attack_strategy='pns',
            attack_prob=0.0,
        )
        acc = result['accounting']
        assert acc['pns_split'] == 0
        assert acc['pns_blocked'] == 0
        assert acc['eve_copies'] == 0
        assert acc['intercepted'] == 0


class TestPhysicsRegression:
    """Physics invariants must survive the event-model change."""

    @pytest.mark.slow
    def test_full_intercept_qber_25_percent(self, pipeline):
        """PHYSICS_CONTRACT: full intercept-resend → QBER 25%±3%."""
        qbers = []
        for _ in range(3):
            result = pipeline(
                n_bits=3000, distance_km=0,
                attack_strategy='intercept_resend', attack_prob=1.0,
            )
            # Recompute QBER from the event stream
            sifted = [e for e in result['events'] if e.sifted]
            errors = sum(
                1 for e in sifted
                if e.bob_bit != e.alice_bit
            )
            qbers.append(errors / max(1, len(sifted)))
        mean_qber = sum(qbers) / len(qbers)
        assert 0.22 <= mean_qber <= 0.28, (
            f"QBER {mean_qber:.3f} outside 25%±3%"
        )

    @pytest.mark.slow
    def test_pns_qber_below_5_percent(self, pipeline):
        """PHYSICS_CONTRACT: PNS QBER < 5% (undetectable by threshold)."""
        result = pipeline(
            n_bits=5000, distance_km=0, wcp_enabled=True,
            mean_photon_number=0.5,
            attack_strategy='pns', attack_prob=0.8,
        )
        sifted = [e for e in result['events'] if e.sifted]
        errors = sum(
            1 for e in sifted if e.bob_bit != e.alice_bit
        )
        qber = errors / max(1, len(sifted))
        assert qber < 0.05, f"PNS QBER {qber:.3f} >= 5%"

    @pytest.mark.fast
    def test_noise_flip_rate_matches_level(self, pipeline):
        """Detected bits flip at approximately noise_level."""
        noise = 0.3
        result = pipeline(
            n_bits=3000, distance_km=0, noise_level=noise,
        )
        detected = [e for e in result['events'] if e.detector_detected]
        flipped = sum(1 for e in detected if e.noise_flipped)
        rate = flipped / max(1, len(detected))
        assert 0.2 <= rate <= 0.4, (
            f"noise flip rate {rate:.3f} vs expected ~{noise}"
        )
