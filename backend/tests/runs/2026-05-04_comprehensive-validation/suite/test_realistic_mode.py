"""
test_realistic_mode.py — Section 5: Realistic source model (WCP + PNS + Decoy)

Tests:
  - PNS attack QBER < 0.05 (undetectable, PHYSICS_CONTRACT)
  - Higher μ → higher multi_photon_fraction
  - Decoy state results dict is non-empty when decoy_enabled=True
  - Smoke tests: partial and burst in WCP mode don't crash

Trials per combo: 25 (smoke tests: 5)
"""

import sys
from pathlib import Path
import numpy as np
import pytest

_SUITE_DIR = Path(__file__).parent
_BACKEND_DIR = _SUITE_DIR.parent.parent.parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from conftest import run_pipeline_trials, run_pipeline

N_TRIALS = 25
SEED     = 42
N_BITS   = 5000
DIST     = 0
NOISE    = 0.0
ATK_PROB = 0.5


# ---------------------------------------------------------------------------
# 5.1 — WCP intercept_resend: higher μ = same QBER (WCP doesn't change IS stats)
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize('mu', [0.1, 0.2, 0.5])
def test_wcp_intercept_resend_qber(mu, results_collector):
    """WCP + intercept_resend: QBER should still be ~ 0.125 at 50% attack."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy='intercept_resend',
        wcp_enabled=True, mu=mu, decoy_enabled=False,
        seed=SEED,
    )
    results_collector.append({
        'section': 5, 'test': 'wcp_intercept_resend',
        'mu': mu, 'attack_strategy': 'intercept_resend', 'attack_prob': ATK_PROB,
        'n_trials': N_TRIALS, 'mean_qber': trial.mean_qber,
        'std_qber': trial.std_qber, 'mean_skr': trial.mean_skr,
        'multi_photon_fraction': trial.raw_results[0].wcp_stats.get('multi_count', 0) / N_BITS,
    })
    # WCP with intercept_resend: QBER is still driven by Eve's attack rate
    assert trial.mean_qber <= 0.30, (
        f"WCP IS mu={mu}: mean_qber={trial.mean_qber:.4f} exceeds 0.30"
    )


# ---------------------------------------------------------------------------
# 5.2 — PNS attack: QBER must be < 0.05 (undetectable)
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize('mu', [0.2, 0.5])
def test_pns_qber_undetectable(mu, results_collector):
    """PNS attack QBER < 0.05 (must be undetectable by threshold)."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy='pns',
        wcp_enabled=True, mu=mu, decoy_enabled=False,
        seed=SEED,
    )
    results_collector.append({
        'section': 5, 'test': 'pns_qber_undetectable',
        'mu': mu, 'attack_strategy': 'pns', 'attack_prob': ATK_PROB,
        'n_trials': N_TRIALS, 'mean_qber': trial.mean_qber,
        'std_qber': trial.std_qber, 'mean_skr': trial.mean_skr,
    })
    assert trial.mean_qber < 0.05, (
        f"PNS attack mu={mu}: mean_qber={trial.mean_qber:.4f} >= 0.05 "
        f"(PNS must be undetectable by QBER threshold)"
    )


# ---------------------------------------------------------------------------
# 5.3 — Higher μ → higher multi_photon_fraction
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_mu_increases_multi_photon_fraction(results_collector):
    """Multi-photon fraction must increase with μ."""
    fractions = {}
    for mu in [0.1, 0.2, 0.5]:
        result = run_pipeline(
            n_bits=N_BITS, distance_km=DIST, noise_level=NOISE,
            attack_prob=0.0, attack_strategy='intercept_resend',
            wcp_enabled=True, mu=mu, seed=SEED,
        )
        fractions[mu] = result.wcp_stats.get('multi_count', 0) / N_BITS

    assert fractions[0.1] <= fractions[0.2] <= fractions[0.5], (
        f"Multi-photon fraction should increase with μ: {fractions}"
    )


# ---------------------------------------------------------------------------
# 5.4 — Decoy state: decoy_results non-empty
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize('mu', [0.2, 0.5])
def test_decoy_results_populated(mu, results_collector):
    """Decoy results dict must be non-empty when decoy_enabled=True."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy='pns',
        wcp_enabled=True, mu=mu, decoy_enabled=True,
        seed=SEED,
    )
    results_collector.append({
        'section': 5, 'test': 'decoy_results_populated',
        'mu': mu, 'decoy_enabled': True, 'attack_strategy': 'pns',
        'n_trials': N_TRIALS, 'mean_qber': trial.mean_qber,
        'mean_skr': trial.mean_skr,
        'decoy_results_keys': list(trial.raw_results[0].decoy_results.keys()),
    })
    for r in trial.raw_results:
        assert len(r.decoy_results) > 0, (
            f"decoy_results is empty when decoy_enabled=True, mu={mu}"
        )


# ---------------------------------------------------------------------------
# 5.5 — Smoke tests: WCP + partial/burst must not crash
# ---------------------------------------------------------------------------

@pytest.mark.fast
@pytest.mark.parametrize('strategy', ['partial', 'burst'])
def test_wcp_smoke_other_strategies(strategy, results_collector):
    """WCP mode + partial/burst must return without crash."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=N_BITS,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=strategy,
        wcp_enabled=True, mu=0.2, decoy_enabled=False,
        seed=SEED,
    )
    results_collector.append({
        'section': 5, 'test': f'wcp_smoke_{strategy}',
        'attack_strategy': strategy, 'n_trials': 5,
        'mean_qber': trial.mean_qber, 'mean_skr': trial.mean_skr,
    })
    # Just verify it ran without exception
    assert isinstance(trial.mean_qber, float)
