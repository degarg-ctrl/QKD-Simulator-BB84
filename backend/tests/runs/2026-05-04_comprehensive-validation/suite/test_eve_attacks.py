"""
test_eve_attacks.py — Section 4: Eve attack strategies

Tests:
  - intercept_resend at 100% → QBER ≈ 0.25 ± 0.03 (BB84 security proof)
  - intercept_resend at 50%  → QBER ≈ 0.125 ± 0.03
  - QBER is monotonically increasing with attack_prob for all strategies
  - partial and burst attacks produce QBER < 0.30 for all attack_probs

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

N_TRIALS    = 25
SEED        = 42
N_BITS      = 5000
DISTANCE    = 0
NOISE       = 0.0
ATK_PROBS   = [0.25, 0.50, 0.75, 1.0]
STRATEGIES  = ['intercept_resend', 'partial', 'burst']


# ---------------------------------------------------------------------------
# 4.1 — Intercept-Resend: QBER at 100% and 50%
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_intercept_resend_full_eve(results_collector):
    """100% intercept_resend → QBER ≈ 0.25 ± 0.03 (BB84 security proof)."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DISTANCE, noise_level=NOISE,
        attack_prob=1.0, attack_strategy='intercept_resend',
        seed=SEED,
    )
    results_collector.append({
        'section': 4, 'test': 'intercept_resend_full',
        'attack_strategy': 'intercept_resend', 'attack_prob': 1.0,
        'n_trials': N_TRIALS, 'mean_qber': trial.mean_qber,
        'std_qber': trial.std_qber, 'mean_skr': trial.mean_skr,
    })
    assert abs(trial.mean_qber - 0.25) <= 0.03, (
        f"Full Eve: mean_qber={trial.mean_qber:.4f}, expected=0.25 ± 0.03"
    )


@pytest.mark.slow
def test_intercept_resend_half_eve(results_collector):
    """50% intercept_resend → QBER ≈ 0.125 ± 0.03."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DISTANCE, noise_level=NOISE,
        attack_prob=0.50, attack_strategy='intercept_resend',
        seed=SEED,
    )
    results_collector.append({
        'section': 4, 'test': 'intercept_resend_half',
        'attack_strategy': 'intercept_resend', 'attack_prob': 0.5,
        'n_trials': N_TRIALS, 'mean_qber': trial.mean_qber,
        'std_qber': trial.std_qber, 'mean_skr': trial.mean_skr,
    })
    assert abs(trial.mean_qber - 0.125) <= 0.03, (
        f"Half Eve: mean_qber={trial.mean_qber:.4f}, expected=0.125 ± 0.03"
    )


# ---------------------------------------------------------------------------
# 4.2 — All strategies: parametrised sweep (collect all readings)
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize('attack_strategy', STRATEGIES)
@pytest.mark.parametrize('attack_prob', ATK_PROBS)
def test_strategy_sweep(attack_strategy, attack_prob, results_collector):
    """Collect QBER for all (attack_prob × strategy) combinations."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DISTANCE, noise_level=NOISE,
        attack_prob=attack_prob, attack_strategy=attack_strategy,
        seed=SEED,
    )
    results_collector.append({
        'section': 4, 'test': 'strategy_sweep',
        'attack_strategy': attack_strategy, 'attack_prob': attack_prob,
        'n_trials': N_TRIALS, 'mean_qber': trial.mean_qber,
        'std_qber': trial.std_qber, 'mean_skr': trial.mean_skr,
        'mean_survival_fraction': trial.mean_survival_fraction,
    })
    # Max possible QBER for any strategy is 0.30 (with noise headroom)
    assert trial.mean_qber <= 0.30, (
        f"{attack_strategy} at p={attack_prob}: "
        f"mean_qber={trial.mean_qber:.4f} > 0.30 (unrealistic)"
    )


# ---------------------------------------------------------------------------
# 4.3 — Monotonicity: QBER increases with attack_prob
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize('attack_strategy', STRATEGIES)
def test_qber_monotone_with_attack_prob(attack_strategy):
    """QBER must increase (or stay flat) as attack_prob increases 0→1."""
    qbers = []
    for p in [0.0, 0.25, 0.50, 0.75, 1.0]:
        trial = run_pipeline_trials(
            n_trials=N_TRIALS, n_bits=N_BITS,
            distance_km=DISTANCE, noise_level=NOISE,
            attack_prob=p, attack_strategy=attack_strategy,
            seed=SEED,
        )
        qbers.append(trial.mean_qber)

    for i in range(len(qbers) - 1):
        assert qbers[i] <= qbers[i + 1] + 0.02, (
            f"{attack_strategy}: QBER not monotone at p=[0,0.25,0.5,0.75,1.0]: "
            f"{[f'{q:.4f}' for q in qbers]}"
        )
