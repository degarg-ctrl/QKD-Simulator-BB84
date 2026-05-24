"""
test_single_photon.py — Section 7: Single photon mode (n_bits=1)

200 readings per parameter combination.

Tests:
  - API never crashes (always returns a PipelineResult)
  - bit_stream has exactly 0 or 1 entries
  - All required fields present when bit_stream is non-empty
  - At 100km: > 80% of runs have lost=True (Beer-Lambert)
  - At 0% Eve: if photon arrives, intercepted=False
  - At 100% Eve: if photon arrives, intercepted=True
"""

import sys
from pathlib import Path
import numpy as np
import pytest

_SUITE_DIR = Path(__file__).parent
_BACKEND_DIR = _SUITE_DIR.parent.parent.parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from conftest import run_pipeline

N_TRIALS  = 200
SEED_BASE = 42
N_BITS    = 1

# Parameter combos: (distance_km, noise_level, attack_prob, attack_strategy)
COMBOS = [
    (0,   0.0,  0.0, 'intercept_resend'),
    (50,  0.0,  0.0, 'intercept_resend'),
    (100, 0.0,  0.0, 'intercept_resend'),
    (0,   0.05, 0.0, 'intercept_resend'),
    (0,   0.0,  1.0, 'intercept_resend'),
]


def _collect_single_photon(distance_km, noise_level, attack_prob, attack_strategy):
    """Run N_TRIALS single-photon simulations and return list of PipelineResult."""
    results = []
    for i in range(N_TRIALS):
        seed = SEED_BASE + i * 7
        r = run_pipeline(
            n_bits=N_BITS,
            distance_km=distance_km,
            noise_level=noise_level,
            attack_prob=attack_prob,
            attack_strategy=attack_strategy,
            seed=seed,
        )
        results.append(r)
    return results


# ---------------------------------------------------------------------------
# 7.1 — Clean response for all combos
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize('dist,noise,atk,strat', COMBOS)
def test_single_photon_no_crash(dist, noise, atk, strat, results_collector):
    """n_bits=1 must never crash; bit_stream must have 0 or 1 entries."""
    results = _collect_single_photon(dist, noise, atk, strat)
    stream_lengths = [len(r.bit_stream) for r in results]
    lost_count     = sum(1 for r in results if len(r.bit_stream) == 0)
    arrived_count  = sum(1 for r in results if len(r.bit_stream) == 1)

    results_collector.append({
        'section': 7, 'test': 'single_photon_no_crash',
        'distance_km': dist, 'noise_level': noise,
        'attack_prob': atk, 'attack_strategy': strat,
        'n_trials': N_TRIALS,
        'arrived_count': arrived_count, 'lost_count': lost_count,
        'arrived_rate': arrived_count / N_TRIALS,
        'lost_rate': lost_count / N_TRIALS,
    })

    # bit_stream must only ever have 0 or 1 photons
    assert all(l in (0, 1) for l in stream_lengths), (
        f"d={dist}km n={noise} p={atk}: bit_stream lengths outside {{0,1}}: {stream_lengths}"
    )


# ---------------------------------------------------------------------------
# 7.2 — Required fields when photon arrives
# ---------------------------------------------------------------------------

REQUIRED_FIELDS = {'alice_bit', 'alice_basis', 'bob_basis', 'bob_bit',
                   'match', 'intercepted', 'lost'}

@pytest.mark.slow
def test_single_photon_fields(results_collector):
    """When photon arrives, all required fields must be present."""
    results = _collect_single_photon(0, 0.0, 0.0, 'intercept_resend')
    arrivals = [r for r in results if len(r.bit_stream) > 0]
    assert len(arrivals) > 10, (
        f"Too few arrived photons to test fields: {len(arrivals)}/{N_TRIALS}"
    )
    for r in arrivals:
        photon = r.bit_stream[0]
        missing = REQUIRED_FIELDS - set(photon.keys())
        assert not missing, f"Single photon missing fields: {missing}"


# ---------------------------------------------------------------------------
# 7.3 — 100km: > 80% photons lost
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_single_photon_100km_loss_rate(results_collector):
    """At 100km, > 80% of single-photon runs should result in photon loss (Beer-Lambert)."""
    lost = 0
    for i in range(N_TRIALS):
        seed = SEED_BASE + i * 7
        r = run_pipeline(
            n_bits=N_BITS,
            distance_km=100,
            noise_level=0.0,
            attack_prob=0.0,
            attack_strategy='intercept_resend',
            seed=seed,
        )
        # Lost = survival_fraction is 0 (photon not detected) OR sifted_key_length is 0
        if r.survival_fraction == 0.0 or r.sifted_key_length == 0:
            lost += 1

    lost_rate = lost / N_TRIALS

    results_collector.append({
        'section': 7, 'test': 'single_photon_100km_loss_rate',
        'distance_km': 100, 'n_trials': N_TRIALS,
        'lost_count': lost, 'lost_rate': lost_rate,
    })
    assert lost_rate > 0.80, (
        f"100km single-photon loss rate={lost_rate:.3f}, expected > 0.80 "
        f"(Beer-Lambert, α=0.2 dB/km). "
        f"Note: sifted_key_length=0 means photon was lost or not sifted."
    )



# ---------------------------------------------------------------------------
# 7.4 — Full Eve (attack_prob=1.0): intercepted=True on arrived photons
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_single_photon_full_eve_intercepted(results_collector):
    """At 100% Eve, all arrived photons must be flagged intercepted=True."""
    results = _collect_single_photon(0, 0.0, 1.0, 'intercept_resend')
    arrivals = [r for r in results if len(r.bit_stream) > 0]
    assert len(arrivals) > 20, (
        f"Too few arrivals to test intercepted flag: {len(arrivals)}"
    )
    not_intercepted = [r.bit_stream[0] for r in arrivals
                       if not r.bit_stream[0].get('intercepted', False)]
    results_collector.append({
        'section': 7, 'test': 'single_photon_full_eve_intercepted',
        'attack_prob': 1.0, 'n_trials': N_TRIALS,
        'arrivals': len(arrivals),
        'not_intercepted_count': len(not_intercepted),
    })
    assert len(not_intercepted) == 0, (
        f"{len(not_intercepted)}/{len(arrivals)} photons not marked intercepted "
        f"with attack_prob=1.0"
    )


# ---------------------------------------------------------------------------
# 7.5 — No Eve (attack_prob=0.0): intercepted=False on arrived photons
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_single_photon_no_eve_not_intercepted(results_collector):
    """At 0% Eve, all arrived photons must have intercepted=False."""
    results = _collect_single_photon(0, 0.0, 0.0, 'intercept_resend')
    arrivals = [r for r in results if len(r.bit_stream) > 0]
    assert len(arrivals) > 20
    flagged = [r.bit_stream[0] for r in arrivals
               if r.bit_stream[0].get('intercepted', False)]
    results_collector.append({
        'section': 7, 'test': 'single_photon_no_eve_not_intercepted',
        'attack_prob': 0.0, 'n_trials': N_TRIALS,
        'arrivals': len(arrivals), 'wrongly_intercepted': len(flagged),
    })
    assert len(flagged) == 0, (
        f"{len(flagged)}/{len(arrivals)} photons incorrectly marked intercepted "
        f"with attack_prob=0.0"
    )
