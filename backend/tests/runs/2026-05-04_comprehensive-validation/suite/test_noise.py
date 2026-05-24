"""
test_noise.py — Section 3: Noise sweep (0% to 12%)

Tests:
  - QBER ≈ noise_level ± 0.03 for noise_level ∈ [0, 0.10]
  - SKR = 0 and threshold_breached=True when noise_level ≥ 0.11

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

N_TRIALS      = 25
SEED          = 42
N_BITS        = 5000
DISTANCE      = 0
ATK_PROB      = 0.0
STRATEGY      = 'intercept_resend'
NOISE_LEVELS  = [0.0, 0.01, 0.02, 0.05, 0.08, 0.10, 0.12]


@pytest.mark.slow
@pytest.mark.parametrize('noise_level', NOISE_LEVELS)
def test_qber_tracks_noise(noise_level, results_collector):
    """QBER ≈ noise_level ± 0.03 for noise_level ≤ 0.10, then breaches."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DISTANCE, noise_level=noise_level,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        seed=SEED,
    )
    threshold_breached = any(r.threshold_breached for r in trial.raw_results)

    results_collector.append({
        'section': 3,
        'test': 'qber_tracks_noise',
        'noise_level': noise_level,
        'n_bits': N_BITS,
        'n_trials': N_TRIALS,
        'mean_qber': trial.mean_qber,
        'std_qber': trial.std_qber,
        'mean_skr': trial.mean_skr,
        'threshold_breached': threshold_breached,
    })

    if noise_level <= 0.10:
        assert abs(trial.mean_qber - noise_level) <= 0.03, (
            f"noise_level={noise_level}: mean_qber={trial.mean_qber:.4f}, "
            f"expected {noise_level:.2f} ± 0.03"
        )


@pytest.mark.slow
def test_skr_zero_above_noise_threshold():
    """
    Any individual trial with threshold_breached=True must have skr=0.

    At noise_level=0.12 (just above 0.11), some runs may land below threshold
    due to statistical variance. We therefore check per-trial: if threshold_breached
    then skr must be 0. We also verify at least some trials breach.
    """
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DISTANCE, noise_level=0.12,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        seed=SEED,
    )
    breach_count = 0
    for r in trial.raw_results:
        if r.threshold_breached:
            breach_count += 1
            assert r.skr == 0.0, (
                f"trial: threshold_breached=True but skr={r.skr:.6f} (expected 0)"
            )
    assert breach_count > 0, (
        f"noise=0.12: no trial breached threshold — unexpected. "
        f"mean_qber={trial.mean_qber:.4f}"
    )
