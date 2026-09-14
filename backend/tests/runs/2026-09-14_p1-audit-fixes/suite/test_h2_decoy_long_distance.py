"""
H2 — Decoy sensitivity at long distances.

Characterisation, NOT a forced pass. The audit observed ~2/10 PNS
detections at N=10000, p_block~0.4, distance=100 km. This is statistical
power loss: the absolute decoy-gain shift from PNS blocking shrinks with
P_survive while the binomial sampling noise does not shrink as fast.

These tests pin that characterisation and verify the decision criterion
was NOT weakened to inflate the long-distance pass rate.
"""

import math

import pytest

from core.constants import DETECTOR_EFFICIENCY, DARK_COUNT_PROB
from core.decoy import (
    compute_gains,
    detect_pns_attack,
    PNS_DETECTION_ALPHA,
    MU_DECOY,
    DECOY_FRACTION,
)

N_BITS = 10000
P_BLOCK = 0.4


def _p_survive(distance_km: float) -> float:
    return 10 ** (-(0.2 * distance_km) / 10.0)


def _clean_gain(mu: float, distance_km: float) -> float:
    p_click = (1.0 - math.exp(-mu)) * _p_survive(distance_km) \
        * DETECTOR_EFFICIENCY
    return p_click + DARK_COUNT_PROB * (1.0 - p_click)


def _pns_shift_and_sigma(distance_km: float) -> tuple[float, float]:
    """
    Expected absolute shift in decoy-click count caused by blocking single
    photons, and the binomial sigma of the observed decoy-click count.
    """
    n_d = N_BITS * DECOY_FRACTION
    mu = MU_DECOY
    # Blocking removes single photons: P(1|mu)*p_block that would have
    # been detected with prob P_survive*eta.
    single_click = mu * math.exp(-mu) * _p_survive(distance_km) \
        * DETECTOR_EFFICIENCY
    shift = n_d * P_BLOCK * single_click
    Q = _clean_gain(mu, distance_km)
    sigma = math.sqrt(n_d * Q * (1.0 - Q))
    return shift, sigma


class TestAnalyticPowerLoss:
    def test_long_distance_shift_below_sampling_resolution(self):
        """At 100 km the expected PNS gain shift is below one sigma."""
        shift, sigma = _pns_shift_and_sigma(100.0)
        assert shift / sigma < 1.0, (
            f"100km: shift {shift:.3f} vs sigma {sigma:.3f} "
            f"(ratio {shift/sigma:.2f}) — characterisation changed"
        )

    def test_power_decreases_with_distance(self):
        """Separation (shift / sigma) must be strictly worse at 100 km."""
        r10 = _pns_shift_and_sigma(10.0)
        r100 = _pns_shift_and_sigma(100.0)
        assert (r100[0] / r100[1]) < (r10[0] / r10[1])


class TestCriterionNotWeakened:
    def test_detection_alpha_unchanged(self):
        """The family-level false-positive budget stays at 0.01."""
        assert PNS_DETECTION_ALPHA == pytest.approx(0.01)

    def test_decision_rule_describes_binomial_tests(self):
        gains = {
            'signal_gain': 0.01, 'decoy_gain': 0.001,
            'vacuum_gain': 1e-5, 'signal_total': 1000,
            'decoy_total': 1000, 'normalized_signal': 0.02,
            'normalized_decoy': 0.01,
        }
        result = detect_pns_attack(gains, distance_km=10.0)
        assert 'binomial' in result['decision_rule'].lower()


class TestLongDistanceCharacterisation:
    @pytest.mark.slow
    def test_long_distance_detection_is_rare(self, pipeline):
        """
        Empirical characterisation: at 100 km a full PNS attack is
        detected in at most half of a handful of seeded runs (documented
        limitation — not asserted to be zero, and not "fixed").
        """
        seeds = list(range(6))
        detections = 0
        for s in seeds:
            res = pipeline(
                n_bits=N_BITS, distance_km=100.0, wcp_enabled=True,
                decoy_enabled=True, attack_strategy='pns',
                attack_prob=0.8, seed=s,
            )
            gains = compute_gains(
                res['measured_states'], res['decoy_intensities']
            )
            out = detect_pns_attack(
                gains, distance_km=100.0,
                eta=DETECTOR_EFFICIENCY, dark_count_prob=DARK_COUNT_PROB,
            )
            detections += int(out['pns_detected'])
        assert detections <= len(seeds) // 2, (
            f"expected weak long-distance detection, got "
            f"{detections}/{len(seeds)}"
        )
