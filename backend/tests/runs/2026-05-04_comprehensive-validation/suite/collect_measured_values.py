"""
collect_measured_values.py
Runs all test sections programmatically, collects all raw readings into
.results_cache.json inside the run folder.

Usage (from qkd-simulator/backend/):
  & ".\.venv\Scripts\python.exe" tests/runs/2026-05-04_comprehensive-validation/suite/collect_measured_values.py
"""

import json
import sys
import time
from pathlib import Path

_SUITE_DIR   = Path(__file__).parent
_RUN_DIR     = _SUITE_DIR.parent
_BACKEND_DIR = _SUITE_DIR.parent.parent.parent.parent

for p in [str(_BACKEND_DIR), str(_SUITE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from conftest import run_pipeline_trials, run_pipeline

SEED     = 42
N_TRIALS = 25


def header(title: str):
    print(f'\n{"="*60}')
    print(f'  {title}')
    print(f'{"="*60}')


all_results = []


def collect(row: dict):
    all_results.append(row)


# ===========================================================================
# Section 1 — n_bits sweep
# ===========================================================================
header('Section 1 — n_bits Sweep')
for n_bits in range(1000, 11000, 1000):
    t = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=n_bits,
        distance_km=0, noise_level=0.0,
        attack_prob=0.0, attack_strategy='intercept_resend',
        seed=SEED,
    )
    collect({
        'section': 1, 'n_bits': n_bits,
        'mean_qber': t.mean_qber, 'std_qber': t.std_qber,
        'mean_skr': t.mean_skr,
        'mean_sifted_key_length': t.mean_sifted_key_length,
        'mean_survival_fraction': t.mean_survival_fraction,
        'n_trials': N_TRIALS,
    })
    print(f"  n_bits={n_bits:5d}  QBER={t.mean_qber:.4f} ±{t.std_qber:.4f}  SKR={t.mean_skr:.4f}")


# ===========================================================================
# Section 2 — Distance sweep
# ===========================================================================
header('Section 2 — Distance Sweep')
for d in [0, 10, 25, 50, 75, 100, 125, 150]:
    t = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=5000,
        distance_km=d, noise_level=0.0,
        attack_prob=0.0, attack_strategy='intercept_resend',
        seed=SEED,
    )
    collect({
        'section': 2, 'distance_km': d,
        'mean_qber': t.mean_qber, 'mean_skr': t.mean_skr,
        'mean_sifted_key_length': t.mean_sifted_key_length,
        'mean_survival_fraction': t.mean_survival_fraction,
        'n_trials': N_TRIALS,
    })
    print(f"  dist={d:3d}km  survival={t.mean_survival_fraction:.4f}  sifted={t.mean_sifted_key_length:.0f}")


# ===========================================================================
# Section 3 — Noise sweep
# ===========================================================================
header('Section 3 — Noise Sweep')
for noise in [0.0, 0.01, 0.02, 0.05, 0.08, 0.10, 0.12]:
    t = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=5000,
        distance_km=0, noise_level=noise,
        attack_prob=0.0, attack_strategy='intercept_resend',
        seed=SEED,
    )
    collect({
        'section': 3, 'noise_level': noise,
        'mean_qber': t.mean_qber, 'std_qber': t.std_qber,
        'mean_skr': t.mean_skr, 'n_trials': N_TRIALS,
    })
    print(f"  noise={noise:.2f}  QBER={t.mean_qber:.4f} ±{t.std_qber:.4f}")


# ===========================================================================
# Section 4 — Eve attack strategies
# ===========================================================================
header('Section 4 — Eve Attack Strategies')
for strategy in ['intercept_resend', 'partial', 'burst']:
    for atk in [0.0, 0.25, 0.50, 0.75, 1.0]:
        t = run_pipeline_trials(
            n_trials=N_TRIALS, n_bits=5000,
            distance_km=0, noise_level=0.0,
            attack_prob=atk, attack_strategy=strategy,
            seed=SEED,
        )
        collect({
            'section': 4, 'attack_strategy': strategy, 'attack_prob': atk,
            'mean_qber': t.mean_qber, 'std_qber': t.std_qber,
            'mean_skr': t.mean_skr, 'n_trials': N_TRIALS,
        })
        print(f"  {strategy:18s} p={atk:.2f}  QBER={t.mean_qber:.4f}  SKR={t.mean_skr:.4f}")


# ===========================================================================
# Section 5 — Realistic mode
# ===========================================================================
header('Section 5 — Realistic Mode (WCP + PNS + Decoy)')
realistic_combos = [
    (0.1, False, 'intercept_resend'), (0.2, False, 'intercept_resend'),
    (0.5, False, 'intercept_resend'), (0.2, False, 'pns'),
    (0.5, False, 'pns'), (0.2, True, 'pns'), (0.5, True, 'pns'),
    (0.2, False, 'partial'), (0.2, False, 'burst'),
]
for (mu, decoy, strategy) in realistic_combos:
    trials = 5 if strategy in ('partial', 'burst') else N_TRIALS
    t = run_pipeline_trials(
        n_trials=trials, n_bits=5000,
        distance_km=0, noise_level=0.0,
        attack_prob=0.5, attack_strategy=strategy,
        wcp_enabled=True, mu=mu, decoy_enabled=decoy,
        seed=SEED,
    )
    collect({
        'section': 5, 'mu': mu, 'decoy_enabled': decoy, 'attack_strategy': strategy,
        'mean_qber': t.mean_qber, 'std_qber': t.std_qber,
        'mean_skr': t.mean_skr, 'n_trials': trials,
        'wcp_stats': t.raw_results[0].wcp_stats,
    })
    print(f"  μ={mu}  decoy={decoy}  {strategy:18s}  QBER={t.mean_qber:.4f}")


# ===========================================================================
# Section 6 — Gates
# ===========================================================================
header('Section 6 — Gate Functionality')
for gate in ['H', 'X', 'Y', 'Z', 'S', 'T']:
    t = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=3000,
        distance_km=0, noise_level=0.0,
        attack_prob=0.0, attack_strategy='intercept_resend',
        gates=[gate], seed=SEED,
    )
    collect({
        'section': 6, 'gate': gate,
        'mean_qber': t.mean_qber, 'std_qber': t.std_qber,
        'mean_skr': t.mean_skr, 'n_trials': N_TRIALS,
    })
    print(f"  Gate={gate}  QBER={t.mean_qber:.4f}  SKR={t.mean_skr:.4f}")


# ===========================================================================
# Section 7 — Single photon (200 readings)
# ===========================================================================
header('Section 7 — Single Photon Mode (200 readings per combo)')
sp_combos = [
    (0, 0.0, 0.0, 'intercept_resend'),
    (50, 0.0, 0.0, 'intercept_resend'),
    (100, 0.0, 0.0, 'intercept_resend'),
    (0, 0.05, 0.0, 'intercept_resend'),
    (0, 0.0, 1.0, 'intercept_resend'),
]
for (dist, noise, atk, strat) in sp_combos:
    lost = 0
    arrived = 0
    intercept_correct = 0
    for i in range(200):
        r = run_pipeline(
            n_bits=1, distance_km=dist, noise_level=noise,
            attack_prob=atk, attack_strategy=strat,
            seed=SEED + i * 7,
        )
        if len(r.bit_stream) == 0:
            lost += 1
        else:
            arrived += 1
            if atk == 1.0 and r.bit_stream[0].get('intercepted'):
                intercept_correct += 1

    collect({
        'section': 7, 'distance_km': dist, 'noise_level': noise,
        'attack_prob': atk, 'attack_strategy': strat,
        'n_trials': 200, 'arrived': arrived, 'lost': lost,
        'loss_rate': lost / 200, 'arrive_rate': arrived / 200,
    })
    print(f"  d={dist:3d}km n={noise:.2f} p={atk:.1f}  "
          f"arrived={arrived}/200  lost={lost}/200  loss_rate={lost/200:.3f}")


# ===========================================================================
# Save cache
# ===========================================================================
cache_path = _RUN_DIR / '.results_cache.json'
with open(cache_path, 'w', encoding='utf-8') as f:
    json.dump(all_results, f, indent=2, default=str)

print(f'\n✓ Results cache written: {cache_path}')
print(f'  Total rows: {len(all_results)}')
print('\nNext step: run generate_reports.py')
