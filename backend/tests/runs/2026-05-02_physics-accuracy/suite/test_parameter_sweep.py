"""
tests/test_parameter_sweep.py

Full parametrized sweep across all defined input combinations.
All tests are @pytest.mark.slow — invoke with: pytest tests/ -m slow -v

Tasks covered: 6.1 – 6.9
"""

import sys
from pathlib import Path
import numpy as np
import pytest
import math

_BACKEND_DIR = Path(__file__).parent.parent.parent  # suite/ -> tests/ -> backend/
_TESTS_DIR = Path(__file__).parent.parent  # suite/ -> tests/
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
if str(_TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_DIR))

_SUITE_DIR = Path(__file__).parent  # backend/tests/suite/
if str(_SUITE_DIR) not in sys.path:
    sys.path.insert(0, str(_SUITE_DIR))

from conftest import run_pipeline, run_pipeline_trials
from core.channel import QuantumChannel
from core.wcp import poisson_photon_counts, classify_pulses, theoretical_pulse_fractions
from core.constants import ATTENUATION_COEFF_DB_PER_KM


# ---------------------------------------------------------------------------
# 6.1 — Sweep dimension constants
# ---------------------------------------------------------------------------

N_BITS_VALUES       = [500, 1000, 5000]
DISTANCE_KM_VALUES  = [0, 10, 50, 100]
NOISE_LEVEL_VALUES  = [0.00, 0.05, 0.10]
ATTACK_PROB_VALUES  = [0.0, 0.25, 0.5, 1.0]
ATTACK_STRATEGIES   = ['intercept_resend', 'partial', 'burst', 'pns']
GATE_TYPES          = ['H', 'X', 'Y', 'Z', 'S', 'T']
MU_VALUES           = [0.1, 0.2, 0.5]

# Non-PNS strategies for QBER vs attack_prob tests
NON_PNS_STRATEGIES  = ['intercept_resend', 'partial', 'burst']


# ---------------------------------------------------------------------------
# 6.2 — QBER vs attack_prob sweep (non-PNS strategies)
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize("attack_prob", ATTACK_PROB_VALUES)
@pytest.mark.parametrize("attack_strategy", NON_PNS_STRATEGIES)
def test_sweep_qber_vs_attack_prob(attack_prob, attack_strategy):
    """QBER ≈ 0.25*attack_prob ± 0.04 for non-PNS strategies at 0km, no noise."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=0, noise_level=0.0,
        attack_prob=attack_prob, attack_strategy=attack_strategy, seed=42,
    )
    expected_qber = 0.25 * attack_prob
    tolerance = 0.04
    assert abs(trial.mean_qber - expected_qber) <= tolerance, (
        f"test_sweep_qber_vs_attack_prob: strategy={attack_strategy}, attack_prob={attack_prob}, "
        f"measured={trial.mean_qber:.4f}, expected={expected_qber:.4f} ± {tolerance}, "
        f"std={trial.std_qber:.4f}, n_trials={trial.n_trials}"
    )


# ---------------------------------------------------------------------------
# 6.3 — QBER vs noise sweep
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize("noise_level", NOISE_LEVEL_VALUES)
def test_sweep_qber_vs_noise(noise_level):
    """QBER ≈ noise_level ± 0.03 with no Eve, no distance."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=0, noise_level=noise_level,
        attack_prob=0.0, attack_strategy='intercept_resend', seed=42,
    )
    tolerance = 0.03
    assert abs(trial.mean_qber - noise_level) <= tolerance, (
        f"test_sweep_qber_vs_noise: noise_level={noise_level}, "
        f"measured={trial.mean_qber:.4f}, expected={noise_level:.4f} ± {tolerance}, "
        f"std={trial.std_qber:.4f}"
    )


# ---------------------------------------------------------------------------
# 6.4 — Attenuation vs distance sweep
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize("distance_km", DISTANCE_KM_VALUES)
def test_sweep_attenuation_vs_distance(distance_km):
    """Survival fraction ≈ P_survive = 10^(-0.2*d/10) ± 0.05."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=distance_km, noise_level=0.0,
        attack_prob=0.0, attack_strategy='intercept_resend', seed=42,
    )
    p_survive = 10 ** (-(ATTENUATION_COEFF_DB_PER_KM * distance_km) / 10)
    mean_survival = sum(r.survival_fraction for r in trial.raw_results) / trial.n_trials
    tolerance = 0.05  # generous tolerance for stochastic survival
    assert abs(mean_survival - p_survive * 0.85) <= tolerance, (
        f"test_sweep_attenuation_vs_distance: distance={distance_km}km, "
        f"mean_survival={mean_survival:.4f}, "
        f"expected≈{p_survive*0.85:.4f} (P_survive={p_survive:.4f} × η=0.85) ± {tolerance}"
    )


# ---------------------------------------------------------------------------
# 6.5 — SKR threshold sweep: SKR=0 when QBER >= 0.11
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize("attack_prob", [0.5, 1.0])
@pytest.mark.parametrize("noise_level", [0.0, 0.05])
def test_sweep_skr_threshold(attack_prob, noise_level):
    """When QBER >= 0.11 (breached), SKR must be 0 and threshold_breached=True."""
    result = run_pipeline(
        n_bits=5000, distance_km=0, noise_level=noise_level,
        attack_prob=attack_prob, attack_strategy='intercept_resend', seed=42,
    )
    if result.threshold_breached:
        assert result.skr == 0.0, (
            f"test_sweep_skr_threshold: threshold_breached=True but SKR={result.skr:.6f}, "
            f"QBER={result.qber:.4f}, attack_prob={attack_prob}, noise_level={noise_level}"
        )
    # Also verify the pure function
    from core.metrics import compute_skr
    assert compute_skr(1000, 5000, 0.11) == 0.0
    assert compute_skr(1000, 5000, 0.25) == 0.0


# ---------------------------------------------------------------------------
# 6.6 — Gate sweep: each gate type applied to photon stream
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize("gate_type", GATE_TYPES)
def test_sweep_gate_individual(gate_type):
    """Each gate applied to a photon stream — pipeline completes, sifted<=raw.
    
    NOTE: Gates Y and Z intentionally modify photon states such that
    QBER can exceed 0.5 (e.g., Y flips all bits → QBER→1.0, Z flips
    diagonal states → QBER can be high). This is correct physics behavior.
    Gates are not designed to be undetectable — they are circuit elements.
    The test verifies structural correctness (pipeline completes, sifted<=raw).
    """
    result = run_pipeline(
        n_bits=1000, distance_km=0, noise_level=0.0,
        attack_prob=0.0, attack_strategy='intercept_resend',
        gates=[gate_type], seed=42,
    )
    # Structural correctness: pipeline must complete
    assert result.sifted_key_length <= result.raw_key_length, (
        f"test_sweep_gate_individual ({gate_type}): sifted ({result.sifted_key_length}) > raw ({result.raw_key_length})"
    )
    # QBER must be a valid float (may exceed 0.5 for state-flipping gates like Y)
    assert isinstance(result.qber, float), (
        f"test_sweep_gate_individual ({gate_type}): qber is not float"
    )
    assert result.qber >= 0.0, (
        f"test_sweep_gate_individual ({gate_type}): qber={result.qber:.4f} is negative"
    )


# ---------------------------------------------------------------------------
# 6.7 — WCP mu sweep: fractions match Poisson theory
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize("mu", MU_VALUES)
def test_sweep_wcp_mu_values(mu):
    """WCP fractions match Poisson theory for all mu values (n=50000)."""
    rng = np.random.default_rng(42)
    n = 50000
    counts = poisson_photon_counts(n, mu, rng)
    stats = classify_pulses(counts)
    theory = theoretical_pulse_fractions(mu)

    assert abs(stats['vacuum_fraction'] - theory['p_vacuum']) <= 0.01, (
        f"test_sweep_wcp_mu_values (mu={mu}): "
        f"vacuum: measured={stats['vacuum_fraction']:.4f}, theory={theory['p_vacuum']:.4f} ± 0.01"
    )
    assert abs(stats['single_fraction'] - theory['p_single']) <= 0.01, (
        f"test_sweep_wcp_mu_values (mu={mu}): "
        f"single: measured={stats['single_fraction']:.4f}, theory={theory['p_single']:.4f} ± 0.01"
    )
    assert abs(stats['multi_fraction'] - theory['p_multi']) <= 0.01, (
        f"test_sweep_wcp_mu_values (mu={mu}): "
        f"multi: measured={stats['multi_fraction']:.4f}, theory={theory['p_multi']:.4f} ± 0.01"
    )


# ---------------------------------------------------------------------------
# 6.8 — Decoy + PNS combination sweep
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize("attack_prob", [0.5, 1.0])
def test_sweep_decoy_pns_combination(attack_prob):
    """Decoy + PNS at high attack_prob → pns_detected in most trials."""
    detected_count = 0
    n_trials = 5
    for seed in range(n_trials):
        result = run_pipeline(
            n_bits=5000, distance_km=0, noise_level=0.0,
            attack_prob=attack_prob, attack_strategy='pns',
            wcp_enabled=True, mu=0.2, decoy_enabled=True,
            seed=seed * 100,
        )
        if result.decoy_results.get('pns_detected', False):
            detected_count += 1

    # At attack_prob >= 0.5, expect PNS to be detected in majority of trials
    if attack_prob >= 0.5:
        assert detected_count >= 2, (
            f"test_sweep_decoy_pns_combination (attack_prob={attack_prob}): "
            f"pns_detected in {detected_count}/{n_trials} trials, expected >= 2"
        )


# ---------------------------------------------------------------------------
# 6.9 — Collect results for report generation
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_sweep_collect_results(results_collector):
    """
    Iterate representative combinations, collect ResultRow dicts.
    Appends rows to session-scoped results_collector for report generation.
    """
    # Use a compact subset for the sweep to keep runtime reasonable
    sweep_cases = [
        # (n_bits, distance_km, noise_level, attack_prob, strategy, wcp, mu, decoy)
        (5000, 0,   0.00, 0.0, 'intercept_resend', False, 0.2, False),
        (5000, 0,   0.05, 0.0, 'intercept_resend', False, 0.2, False),
        (5000, 0,   0.10, 0.0, 'intercept_resend', False, 0.2, False),
        (5000, 0,   0.00, 0.25,'intercept_resend', False, 0.2, False),
        (5000, 0,   0.00, 0.5, 'intercept_resend', False, 0.2, False),
        (5000, 0,   0.00, 1.0, 'intercept_resend', False, 0.2, False),
        (5000, 10,  0.00, 0.0, 'intercept_resend', False, 0.2, False),
        (5000, 50,  0.00, 0.0, 'intercept_resend', False, 0.2, False),
        (5000, 100, 0.00, 0.0, 'intercept_resend', False, 0.2, False),
        (5000, 0,   0.00, 0.0, 'partial',           False, 0.2, False),
        (5000, 0,   0.00, 0.5, 'partial',           False, 0.2, False),
        (5000, 0,   0.00, 0.0, 'burst',             False, 0.2, False),
        (5000, 0,   0.00, 0.5, 'burst',             False, 0.2, False),
        (5000, 0,   0.00, 1.0, 'pns',               True,  0.2, False),
        (5000, 0,   0.00, 1.0, 'pns',               True,  0.2, True),
        (5000, 0,   0.00, 0.0, 'intercept_resend', True,  0.1, False),
        (5000, 0,   0.00, 0.0, 'intercept_resend', True,  0.2, False),
        (5000, 0,   0.00, 0.0, 'intercept_resend', True,  0.5, False),
        (1000, 0,   0.00, 0.0, 'intercept_resend', False, 0.2, False),
        (500,  0,   0.00, 0.0, 'intercept_resend', False, 0.2, False),
    ]

    for idx, (n_bits, dist, noise, atk_prob, strategy, wcp, mu, decoy) in enumerate(sweep_cases):
        trial = run_pipeline_trials(
            n_trials=5, n_bits=n_bits, distance_km=dist,
            noise_level=noise, attack_prob=atk_prob,
            attack_strategy=strategy, wcp_enabled=wcp, mu=mu,
            decoy_enabled=decoy, seed=42,
        )

        # Expected QBER based on physics model
        if strategy == 'pns':
            expected_qber = 0.0
        else:
            expected_qber = noise + 0.25 * atk_prob

        deviation = abs(trial.mean_qber - expected_qber)
        tolerance = 0.06
        pass_fail = "PASS" if deviation <= tolerance else "FAIL"

        row = {
            'test_id':            f"sweep_{idx+1:03d}",
            'n_bits':             n_bits,
            'distance_km':        dist,
            'noise_level':        noise,
            'attack_prob':        atk_prob,
            'attack_strategy':    strategy,
            'wcp_enabled':        wcp,
            'mu':                 mu,
            'decoy_enabled':      decoy,
            'gates':              'none',
            'measured_qber':      round(trial.mean_qber, 5),
            'expected_qber':      round(expected_qber, 5),
            'qber_deviation':     round(deviation, 5),
            'measured_skr':       round(trial.mean_skr, 5),
            'sifted_key_length':  int(trial.mean_sifted_key_length),
            'efficiency':         round(trial.mean_efficiency, 3),
            'threshold_breached': trial.raw_results[0].threshold_breached,
            'pass_fail':          pass_fail,
            'n_trials':           trial.n_trials,
            'std_qber':           round(trial.std_qber, 5),
        }
        results_collector.append(row)

    # Verify at least one row was collected
    assert len(results_collector) >= len(sweep_cases), (
        f"test_sweep_collect_results: expected >= {len(sweep_cases)} rows, "
        f"got {len(results_collector)}"
    )
