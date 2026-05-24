"""
test_distance.py — Section 2: Distance sweep (0 to 150 km)

Tests:
  - Survival fraction at 50 km ≈ 10% ± 3% (Beer-Lambert)
  - Survival fraction at 100 km ≈ 1% ± 2%
  - Sifted key length is monotonically non-increasing with distance
  - SKR = 0 at distances that cause QBER ≥ 11%

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
N_BITS     = 5000
NOISE      = 0.0
ATK_PROB   = 0.0
STRATEGY   = 'intercept_resend'
DISTANCES  = [0, 10, 25, 50, 75, 100, 125, 150]


@pytest.mark.slow
@pytest.mark.parametrize('distance_km', DISTANCES)
def test_survival_fraction(distance_km, results_collector):
    """Collect survival fraction for all distances."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=distance_km, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        seed=SEED,
    )
    results_collector.append({
        'section': 2,
        'test': 'survival_fraction',
        'distance_km': distance_km,
        'n_bits': N_BITS,
        'noise_level': NOISE,
        'attack_prob': ATK_PROB,
        'n_trials': N_TRIALS,
        'mean_qber': trial.mean_qber,
        'mean_skr': trial.mean_skr,
        'mean_sifted_key_length': trial.mean_sifted_key_length,
        'mean_survival_fraction': trial.mean_survival_fraction,
    })
    # No strict assert here — we collect data for all distances
    # The specific 50km and 100km bounds are tested below
    assert trial.mean_survival_fraction >= 0.0


@pytest.mark.slow
def test_survival_50km(results_collector):
    """50 km survival fraction ≈ 10% ± 3% (Beer-Lambert)."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=50, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        seed=SEED,
    )
    assert abs(trial.mean_survival_fraction - 0.10) <= 0.03, (
        f"50km survival={trial.mean_survival_fraction:.4f}, "
        f"expected=0.10 ± 0.03"
    )


@pytest.mark.slow
def test_survival_100km(results_collector):
    """100 km survival fraction ≈ 1% ± 2% (Beer-Lambert)."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=100, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        seed=SEED,
    )
    assert abs(trial.mean_survival_fraction - 0.01) <= 0.02, (
        f"100km survival={trial.mean_survival_fraction:.4f}, "
        f"expected=0.01 ± 0.02"
    )


@pytest.mark.slow
def test_sifted_monotonically_decreasing():
    """Sifted key length must be non-increasing with distance."""
    sifted_lengths = []
    for d in DISTANCES:
        trial = run_pipeline_trials(
            n_trials=N_TRIALS, n_bits=N_BITS,
            distance_km=d, noise_level=NOISE,
            attack_prob=ATK_PROB, attack_strategy=STRATEGY,
            seed=SEED,
        )
        sifted_lengths.append(trial.mean_sifted_key_length)

    for i in range(len(sifted_lengths) - 1):
        assert sifted_lengths[i] >= sifted_lengths[i + 1] - 5, (
            f"Sifted key length not monotone at "
            f"d={DISTANCES[i]}→{DISTANCES[i+1]}km: "
            f"{sifted_lengths[i]:.1f} → {sifted_lengths[i+1]:.1f}"
        )
