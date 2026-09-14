"""
TRANSMISSION-001..005 — event accounting identities, fiber attenuation,
detector efficiency, dark counts, event classification consistency.

Plus: event_stream sampling determinism and API-level integration.
"""

import math

import pytest

from core.constants import (
    ATTENUATION_COEFF_DB_PER_KM,
    DETECTOR_EFFICIENCY,
    DARK_COUNT_PROB,
)


# ────────────────────────────────────────────────────────────────
# TRANSMISSION-001: Accounting identities
# ────────────────────────────────────────────────────────────────

@pytest.mark.fast
class TestTransmissionIdentities:
    """TRANSMISSION-001 — conservation laws of the accounting dict."""

    def _assert_identities(self, acc):
        # generated = vacuum + fiber_survived + fiber_lost
        assert acc['generated'] == (
            acc['vacuum_pulses'] + acc['fiber_survived'] + acc['fiber_lost']
        )
        # fiber_survived = real_detections + detector_loss + pns_blocked
        assert acc['fiber_survived'] == (
            acc['real_detections'] + acc['detector_loss']
            + acc['pns_blocked']
        )
        # total_detections = real_detections + dark_counts
        assert acc['total_detections'] == (
            acc['real_detections'] + acc['dark_counts']
        )
        # sifted never exceeds total detections
        assert acc['sifted'] <= acc['total_detections']

    def test_ideal_mode_identities(self, pipeline):
        result = pipeline(n_bits=500, distance_km=20)
        self._assert_identities(result['accounting'])

    def test_wcp_pns_identities(self, pipeline):
        result = pipeline(
            n_bits=1000, distance_km=0, wcp_enabled=True,
            mean_photon_number=0.5,
            attack_strategy='pns', attack_prob=0.8,
        )
        self._assert_identities(result['accounting'])

    def test_wcp_long_distance_identities(self, pipeline):
        result = pipeline(
            n_bits=1000, distance_km=100, wcp_enabled=True,
            mean_photon_number=0.2,
        )
        self._assert_identities(result['accounting'])


# ────────────────────────────────────────────────────────────────
# TRANSMISSION-002: Fiber attenuation statistics
# ────────────────────────────────────────────────────────────────

class TestFiberAttenuation:
    """TRANSMISSION-002 — observed survival vs 10^(-0.2d/10)."""

    @pytest.mark.slow
    @pytest.mark.parametrize("distance_km", [0, 25, 50, 100])
    def test_survival_fraction_matches_theory(self, pipeline, distance_km):
        n = 5000
        result = pipeline(n_bits=n, distance_km=distance_km)
        acc = result['accounting']

        expected = 10 ** (
            -(ATTENUATION_COEFF_DB_PER_KM * distance_km) / 10
        )
        observed = acc['fiber_survived'] / acc['generated']

        # Binomial 4-sigma tolerance
        sigma = math.sqrt(expected * (1 - expected) / n)
        assert abs(observed - expected) <= 4 * sigma, (
            f"d={distance_km}km: observed {observed:.4f} vs "
            f"expected {expected:.4f} (sigma={sigma:.4f})"
        )

    @pytest.mark.fast
    def test_50km_benchmark_10_percent(self, pipeline):
        """PHYSICS_CONTRACT benchmark: ~10% survival at 50 km."""
        result = pipeline(n_bits=3000, distance_km=50)
        acc = result['accounting']
        observed = acc['fiber_survived'] / acc['generated']
        assert 0.07 <= observed <= 0.13, (
            f"50km survival {observed:.3f} outside [0.07, 0.13]"
        )

    @pytest.mark.fast
    def test_100km_benchmark_1_percent(self, pipeline):
        """PHYSICS_CONTRACT benchmark: ~1% survival at 100 km."""
        result = pipeline(n_bits=3000, distance_km=100)
        acc = result['accounting']
        observed = acc['fiber_survived'] / acc['generated']
        assert 0.004 <= observed <= 0.017, (
            f"100km survival {observed:.3f} outside [0.004, 0.017]"
        )


# ────────────────────────────────────────────────────────────────
# TRANSMISSION-003: Detector efficiency — ideal vs realistic
# ────────────────────────────────────────────────────────────────

class TestDetectorEfficiency:
    """TRANSMISSION-003 — eta=1.0/dark=0 (ideal) vs 0.85/1e-5."""

    def test_ideal_mode_no_detector_loss(self, pipeline):
        """Ideal mode: every fiber-surviving photon is detected."""
        result = pipeline(n_bits=1000, distance_km=30)
        acc = result['accounting']
        assert acc['detector_loss'] == 0
        assert acc['dark_counts'] == 0
        assert acc['real_detections'] == acc['fiber_survived']

    @pytest.mark.slow
    def test_realistic_mode_eta_085(self, pipeline):
        """Realistic mode: ~85% of surviving photons detected."""
        n = 5000
        result = pipeline(
            n_bits=n, distance_km=0, wcp_enabled=True,
            mean_photon_number=0.5,
        )
        acc = result['accounting']
        # Non-vacuum pulses that survived the fiber
        eligible = acc['fiber_survived']
        observed = acc['real_detections'] / eligible

        expected = DETECTOR_EFFICIENCY
        sigma = math.sqrt(expected * (1 - expected) / eligible)
        assert abs(observed - expected) <= 4 * sigma, (
            f"detector efficiency {observed:.4f} vs {expected} "
            f"(sigma={sigma:.4f}, n={eligible})"
        )


# ────────────────────────────────────────────────────────────────
# TRANSMISSION-004: Dark count behavior
# ────────────────────────────────────────────────────────────────

class TestDarkCounts:
    """TRANSMISSION-004 — dark counts are rare spurious clicks."""

    @pytest.mark.slow
    def test_dark_count_frequency_matches_model(self, pipeline):
        """
        Dark counts fire on undetected slots with P_dark=1e-5.
        At 100 km nearly everything is undetected → dark ≈ N * 1e-5.
        """
        n = 10000
        result = pipeline(
            n_bits=n, distance_km=100, wcp_enabled=True,
            mean_photon_number=0.5,
        )
        acc = result['accounting']

        undetected_slots = acc['generated'] - acc['real_detections']
        expected_rate = DARK_COUNT_PROB
        observed = acc['dark_counts']

        # Binomial 4-sigma tolerance
        sigma = math.sqrt(
            undetected_slots * expected_rate * (1 - expected_rate)
        )
        assert abs(observed - undetected_slots * expected_rate) \
            <= max(4 * sigma, 3), (
            f"dark counts {observed} vs expected "
            f"{undetected_slots * expected_rate:.1f}"
        )

    @pytest.mark.fast
    def test_dark_count_events_are_not_real_detections(self, pipeline):
        """A dark-count event must have detector_detected=False."""
        result = pipeline(
            n_bits=5000, distance_km=100, wcp_enabled=True,
            mean_photon_number=0.5,
        )
        dark_events = [
            e for e in result['events'] if e.dark_count
        ]
        if not dark_events:
            pytest.skip("no dark count fired in this run")
        for e in dark_events:
            assert e.detector_detected is False
            assert e.fiber_survived is False or e.wcp_vacuum is True \
                or e.pns_blocked is True or e.detector_loss is True

    @pytest.mark.fast
    def test_dark_count_bit_is_random_field(self, pipeline):
        """Dark-count slots carry a measured bob_bit (random value)."""
        result = pipeline(
            n_bits=5000, distance_km=100, wcp_enabled=True,
            mean_photon_number=0.5,
        )
        dark_events = [e for e in result['events'] if e.dark_count]
        for e in dark_events:
            assert e.bob_bit in (0, 1)
            assert e.bob_basis in ('+', 'x')


# ────────────────────────────────────────────────────────────────
# TRANSMISSION-005: Event classification consistency
# ────────────────────────────────────────────────────────────────

class TestEventClassification:
    """TRANSMISSION-005 — outcome categories are consistent."""

    @pytest.mark.fast
    def test_every_event_has_exactly_one_primary_outcome(self, pipeline):
        """
        The primary outcome categories are mutually exclusive:
          vacuum / fiber-lost / pns-blocked / detector-loss /
          real-detection / dark-count-only.
        """
        result = pipeline(
            n_bits=800, distance_km=60, wcp_enabled=True,
            mean_photon_number=0.4,
            attack_strategy='pns', attack_prob=0.5,
        )
        for e in result['events']:
            categories = []
            if e.wcp_vacuum:
                categories.append('vacuum')
            if e.fiber_survived is False and not e.wcp_vacuum:
                categories.append('fiber_lost')
            if e.pns_blocked:
                categories.append('pns_blocked')
            if (e.fiber_survived and not e.pns_blocked
                    and not e.detector_detected
                    and not e.dark_count):
                categories.append('detector_loss')
            if e.detector_detected:
                categories.append('real_detection')
            if e.dark_count and not e.detector_detected:
                categories.append('dark_only')

            assert len(categories) == 1, (
                f"event {e.index}: categories {categories} "
                f"(should be exactly 1)"
            )

    @pytest.mark.fast
    def test_lost_flag_consistency(self, pipeline):
        """
        'lost' must be True for fiber-lost, vacuum, and PNS-blocked
        pulses (anything that never reached Bob as a real photon).
        """
        result = pipeline(
            n_bits=600, distance_km=60, wcp_enabled=True,
            mean_photon_number=0.4,
            attack_strategy='pns', attack_prob=0.5,
        )
        for e in result['events']:
            never_reached = (
                e.wcp_vacuum or e.pns_blocked
                or e.fiber_survived is False
            )
            if never_reached:
                assert e.lost is True
            if e.detector_detected:
                assert e.lost is False

    @pytest.mark.fast
    def test_sifted_requires_basis_match_and_measurement(self, pipeline):
        result = pipeline(n_bits=500, distance_km=20)
        for e in result['events']:
            if e.sifted:
                assert e.match is True
                assert e.bob_basis == e.alice_basis
                assert e.bob_bit is not None

    @pytest.mark.fast
    def test_alice_fields_never_mutated(self, pipeline):
        """Alice's original encoding must survive the whole pipeline."""
        result = pipeline(
            n_bits=500, distance_km=0,
            attack_strategy='intercept_resend', attack_prob=1.0,
        )
        for e in result['events']:
            assert e.alice_polarization_angle is not None
            assert e.alice_state_label in ('|0>', '|1>', '|+>', '|->')
            # Angle must be one of the four BB84 encodings
            assert e.alice_polarization_angle in (0.0, 90.0, 45.0, 135.0)


# ────────────────────────────────────────────────────────────────
# Event stream sampling
# ────────────────────────────────────────────────────────────────

class TestEventStreamSampling:
    """Deterministic stride sampling with rare-category rescue."""

    @pytest.mark.fast
    def test_small_n_included_entirely(self, pipeline):
        result = pipeline(n_bits=100, distance_km=0)
        assert result['stream_indices'] == list(range(100))

    @pytest.mark.fast
    def test_cap_enforced(self, pipeline):
        result = pipeline(n_bits=2000, distance_km=0)
        assert len(result['stream_indices']) <= 504  # cap + ≤4 rescue

    @pytest.mark.fast
    def test_deterministic_given_states(self, pipeline):
        """Same states → same selection (pure function of records)."""
        result = pipeline(n_bits=600, distance_km=30)
        from core.events import select_event_stream_indices
        again = select_event_stream_indices(result['measured_states'])
        assert result['stream_indices'] == again

    @pytest.mark.fast
    def test_stride_order_preserved(self, pipeline):
        result = pipeline(n_bits=2000, distance_km=0)
        idx = result['stream_indices']
        assert idx == sorted(idx)
        assert len(set(idx)) == len(idx)  # no duplicates


# ────────────────────────────────────────────────────────────────
# API-level integration
# ────────────────────────────────────────────────────────────────

@pytest.mark.sync
class TestAPIEventModel:
    """End-to-end HTTP response contains the event model."""

    def test_response_has_event_stream_and_transmission(self, api):
        r = api.post('/api/simulate', json={
            'n_bits': 200, 'distance_km': 50, 'noise_level': 0.0,
            'attack_prob': 0.0, 'attack_strategy': 'intercept_resend',
        })
        assert r.status_code == 200
        body = r.json()
        assert 'event_stream' in body
        assert 'transmission' in body
        assert body['transmission']['generated'] == 200
        assert len(body['event_stream']) == 200  # n <= cap → all
        # bit_stream stays the detected-only legacy view
        assert len(body['bit_stream']) == \
            body['transmission']['total_detections']

    def test_large_n_stream_capped_but_accounting_full(self, api):
        r = api.post('/api/simulate', json={
            'n_bits': 5000, 'distance_km': 30, 'noise_level': 0.0,
            'attack_prob': 0.0, 'attack_strategy': 'intercept_resend',
        })
        assert r.status_code == 200
        body = r.json()
        assert len(body['event_stream']) <= 504
        assert body['transmission']['generated'] == 5000
        assert body['transmission']['event_stream_truncated'] is True

    def test_event_fields_present(self, api):
        r = api.post('/api/simulate', json={
            'n_bits': 100, 'distance_km': 10, 'noise_level': 0.0,
            'attack_prob': 0.5, 'attack_strategy': 'intercept_resend',
        })
        body = r.json()
        sample = body['event_stream'][0]
        for field in (
            'fiber_survived', 'detector_detected', 'dark_count',
            'noise_flipped', 'sifted', 'alice_polarization_angle',
        ):
            assert field in sample, f"missing field {field}"
