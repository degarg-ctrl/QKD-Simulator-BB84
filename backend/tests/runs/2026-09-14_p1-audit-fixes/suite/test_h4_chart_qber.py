"""
H4 — Chart / theoretical QBER must use the authoritative model.

Defect: generate_chart_data() used an additive approximation
(noise + 0.25*attack + dark). The simulator follows the multiplicative
model Q = pn + p/4 - (p/2)*pn. Fix: one function,
metrics.theoretical_qber(), used by the chart and validated against the
simulator.
"""

import pytest

from core.metrics import theoretical_qber, generate_chart_data
from core.constants import DETECTOR_EFFICIENCY, DARK_COUNT_PROB
from conftest import sifted_qber


def _dark_fraction(distance_km: float, eta: float, dark: float) -> float:
    survival = 10 ** (-(0.2 * distance_km) / 10.0)
    p_click = survival * eta
    p_detect = p_click + dark * (1 - p_click)
    return (dark * (1 - p_click)) / p_detect if p_detect > 0 else 0.0


class TestAuthoritativeFormula:
    @pytest.mark.parametrize("pn,p,expected", [
        (0.0, 0.0, 0.0),
        (0.0, 0.25, 0.0625),
        (0.0, 0.5, 0.125),
        (0.0, 1.0, 0.25),
        (0.05, 0.0, 0.05),
        (0.05, 0.5, 0.05 + 0.125 - 0.0125),
        (0.1, 0.0, 0.1),
        (0.1, 1.0, 0.30),          # the audit's example value
        (0.1, 0.5, 0.1 + 0.125 - 0.025),
        (1.0, 1.0, 0.5),           # clamped
    ])
    def test_known_values(self, pn, p, expected):
        assert theoretical_qber(pn, p, 0.0) == pytest.approx(expected)

    def test_no_eve_reduces_to_noise(self):
        for pn in (0.0, 0.05, 0.1, 0.3):
            assert theoretical_qber(pn, 0.0) == pytest.approx(pn)

    def test_full_attack_no_noise_is_25_percent(self):
        assert theoretical_qber(0.0, 1.0) == pytest.approx(0.25)

    def test_dark_mixture_interpolates_to_half(self):
        q = theoretical_qber(0.0, 0.0, dark_fraction=1.0)
        assert q == pytest.approx(0.5)
        q = theoretical_qber(0.0, 0.0, dark_fraction=0.5)
        assert q == pytest.approx(0.25)

    def test_never_exceeds_half(self):
        assert theoretical_qber(0.9, 1.0, 0.9) <= 0.5


class TestChartUsesAuthoritativeModel:
    def test_chart_at_distance_zero_matches_formula_ideal(self):
        chart = generate_chart_data(
            noise_level=0.1, attack_prob=1.0,
            attack_strategy='intercept_resend',
            detector_efficiency=1.0, dark_count_prob=0.0,
        )
        q0 = chart['qber_vs_distance'][0]
        assert q0['distance'] == 0.0
        assert q0['qber'] == pytest.approx(0.30, abs=1e-9)

    def test_chart_no_eve_equals_noise_all_distances(self):
        pn = 0.07
        chart = generate_chart_data(
            noise_level=pn, attack_prob=0.0,
            attack_strategy='intercept_resend',
            detector_efficiency=1.0, dark_count_prob=0.0,
        )
        for point in chart['qber_vs_distance']:
            assert point['qber'] == pytest.approx(pn, abs=1e-9)

    @pytest.mark.parametrize("pn", [0.0, 0.05, 0.1])
    @pytest.mark.parametrize("p", [0.0, 0.25, 0.5, 1.0])
    def test_chart_matches_formula_realistic(self, pn, p):
        eta, dark = DETECTOR_EFFICIENCY, DARK_COUNT_PROB
        chart = generate_chart_data(
            noise_level=pn, attack_prob=p,
            attack_strategy='intercept_resend',
            detector_efficiency=eta, dark_count_prob=dark,
        )
        for point in chart['qber_vs_distance']:
            d = point['distance']
            expected = theoretical_qber(
                pn, p, _dark_fraction(d, eta, dark)
            )
            assert point['qber'] == pytest.approx(expected, abs=1e-9)

    def test_chart_is_not_the_old_additive_approximation(self):
        """The old additive value (0.35) must not appear."""
        chart = generate_chart_data(
            noise_level=0.1, attack_prob=1.0,
            attack_strategy='intercept_resend',
            detector_efficiency=1.0, dark_count_prob=0.0,
        )
        assert chart['qber_vs_distance'][0]['qber'] != pytest.approx(
            0.35, abs=1e-6
        )


class TestSimulatorMatchesModel:
    @pytest.mark.parametrize("pn,p", [(0.0, 0.5), (0.1, 1.0), (0.05, 0.5)])
    def test_empirical_qber_tracks_authoritative_model(self, pipeline, pn, p):
        """Ideal mode, 0 km: empirical QBER ~ theoretical_qber(pn, p)."""
        res = pipeline(
            n_bits=8000, distance_km=0.0, noise_level=pn,
            attack_strategy='intercept_resend', attack_prob=p,
            seed=1234,
        )
        qber, n_sifted = sifted_qber(res['measured_states'])
        expected = theoretical_qber(pn, p)
        assert n_sifted > 1000
        assert qber == pytest.approx(expected, abs=0.03), (
            f"pn={pn} p={p}: empirical {qber:.4f} vs model {expected:.4f}"
        )
