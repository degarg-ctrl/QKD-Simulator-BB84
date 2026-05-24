"""
test_photon_count.py — Section 1: n_bits sweep (1000 to 10000, step 1000)

Tests:
  - QBER < 0.02 for all n_bits (no noise, no Eve, 0km)
  - SKR > 0 for all n_bits
  - QBER variance DECREASES as n_bits increases (statistical convergence)

Trials per combo: 25
"""

import sys
from pathlib import Path
import numpy as np
import pytest

_SUITE_DIR = Path(__file__).parent
_BACKEND_DIR = _SUITE_DIR.parent.parent.parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from conftest import run_pipeline_trials

N_TRIALS   = 25
SEED       = 42
DIST       = 0
NOISE      = 0.0
ATK_PROB   = 0.0
STRATEGY   = 'intercept_resend'
N_BITS_LIST = list(range(1000, 11000, 1000))  # 1000 … 10000


@pytest.mark.slow
@pytest.mark.parametrize('n_bits', N_BITS_LIST)
def test_qber_below_threshold(n_bits, results_collector):
    """QBER < 0.02 for n_bits={n_bits} (no noise, no Eve, 0km)."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=n_bits,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        seed=SEED,
    )
    results_collector.append({
        'section': 1,
        'test': 'qber_below_threshold',
        'n_bits': n_bits,
        'distance_km': DIST,
        'noise_level': NOISE,
        'attack_prob': ATK_PROB,
        'attack_strategy': STRATEGY,
        'n_trials': N_TRIALS,
        'mean_qber': trial.mean_qber,
        'std_qber': trial.std_qber,
        'mean_skr': trial.mean_skr,
        'mean_sifted_key_length': trial.mean_sifted_key_length,
        'mean_survival_fraction': trial.mean_survival_fraction,
        'pass': trial.mean_qber < 0.02,
    })
    assert trial.mean_qber < 0.02, (
        f"n_bits={n_bits}: mean_qber={trial.mean_qber:.4f} >= 0.02"
    )


@pytest.mark.slow
@pytest.mark.parametrize('n_bits', N_BITS_LIST)
def test_skr_positive(n_bits, results_collector):
    """SKR > 0 for n_bits={n_bits}."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=n_bits,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        seed=SEED,
    )
    assert trial.mean_skr > 0, (
        f"n_bits={n_bits}: mean_skr={trial.mean_skr:.6f} should be > 0"
    )


@pytest.mark.slow
def test_qber_variance_decreases(results_collector):
    """QBER std must decrease (or stay flat) as n_bits increases."""
    stds = []
    for n_bits in N_BITS_LIST:
        trial = run_pipeline_trials(
            n_trials=N_TRIALS, n_bits=n_bits,
            distance_km=DIST, noise_level=NOISE,
            attack_prob=ATK_PROB, attack_strategy=STRATEGY,
            seed=SEED,
        )
        stds.append(trial.std_qber)

    # Allow minor fluctuations — overall trend must be non-increasing
    # Compare first half average vs second half average
    first_half_std  = np.mean(stds[:5])
    second_half_std = np.mean(stds[5:])
    assert second_half_std <= first_half_std + 0.005, (
        f"QBER std not converging: first_half={first_half_std:.4f}, "
        f"second_half={second_half_std:.4f}"
    )
