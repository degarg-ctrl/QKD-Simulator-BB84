"""
test_gates.py — Section 6: Gate functionality (individual gates)

Tests:
  - All gates (H, X, Y, Z, S, T) run without crash
  - H gate changes QBER vs baseline (basis mixing)
  - X gate causes measurable bit flip (bob_bit distribution shifts)
  - Z gate has minimal QBER impact vs baseline (phase only)

Trials per gate: 25
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
N_BITS   = 3000
DIST     = 0
NOISE    = 0.0
ATK_PROB = 0.0
STRATEGY = 'intercept_resend'
GATES    = ['H', 'X', 'Y', 'Z', 'S', 'T']


# ---------------------------------------------------------------------------
# 6.1 — Baseline (no gate)
# ---------------------------------------------------------------------------

@pytest.fixture(scope='module')
def baseline_trial():
    return run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        seed=SEED,
    )


# ---------------------------------------------------------------------------
# 6.2 — All gates: parametrised smoke test
# ---------------------------------------------------------------------------

@pytest.mark.slow
@pytest.mark.parametrize('gate', GATES)
def test_gate_no_crash(gate, results_collector):
    """Gate '{gate}' must run without exception and return valid QBER."""
    trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        gates=[gate],
        seed=SEED,
    )
    results_collector.append({
        'section': 6, 'test': 'gate_no_crash',
        'gate': gate, 'n_trials': N_TRIALS,
        'mean_qber': trial.mean_qber,
        'std_qber': trial.std_qber,
        'mean_skr': trial.mean_skr,
    })
    assert 0.0 <= trial.mean_qber <= 1.0, (
        f"Gate {gate}: QBER={trial.mean_qber:.4f} out of [0,1]"
    )


# ---------------------------------------------------------------------------
# 6.3 — H gate: QBER must differ from baseline
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_h_gate_changes_qber(baseline_trial, results_collector):
    """H gate must produce a measurably different QBER than no-gate baseline."""
    h_trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        gates=['H'],
        seed=SEED,
    )
    delta = abs(h_trial.mean_qber - baseline_trial.mean_qber)
    results_collector.append({
        'section': 6, 'test': 'h_gate_qber_delta',
        'gate': 'H', 'baseline_qber': baseline_trial.mean_qber,
        'gated_qber': h_trial.mean_qber, 'delta': delta,
    })
    # H gate on the channel randomises measurement bases → expect increased QBER
    assert delta > 0.05, (
        f"H gate QBER delta too small: {delta:.4f}. "
        f"baseline={baseline_trial.mean_qber:.4f}, gated={h_trial.mean_qber:.4f}"
    )


# ---------------------------------------------------------------------------
# 6.4 — Z gate: QBER must be close to baseline (phase flip, no basis change)
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_z_gate_minimal_qber_change(baseline_trial, results_collector):
    """Z gate (phase flip) must not significantly change QBER vs baseline."""
    z_trial = run_pipeline_trials(
        n_trials=N_TRIALS, n_bits=N_BITS,
        distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        gates=['Z'],
        seed=SEED,
    )
    delta = abs(z_trial.mean_qber - baseline_trial.mean_qber)
    results_collector.append({
        'section': 6, 'test': 'z_gate_qber_delta',
        'gate': 'Z', 'baseline_qber': baseline_trial.mean_qber,
        'gated_qber': z_trial.mean_qber, 'delta': delta,
    })
    # Z gate should cause < 0.10 QBER change (it only adds a phase, not a full basis change)
    assert delta < 0.10, (
        f"Z gate QBER delta unexpectedly large: {delta:.4f}. "
        f"baseline={baseline_trial.mean_qber:.4f}, gated={z_trial.mean_qber:.4f}"
    )


# ---------------------------------------------------------------------------
# 6.5 — X gate: bob_bit distribution shifts (bit flip)
# ---------------------------------------------------------------------------

@pytest.mark.slow
def test_x_gate_bit_flip(results_collector):
    """X gate must produce detectable shift in bob_bit distribution vs baseline."""
    def avg_bob_bit(result):
        bits = [s['bob_bit'] for s in result.bit_stream if s['bob_bit'] is not None]
        return float(np.mean(bits)) if bits else 0.5

    baseline = run_pipeline(
        n_bits=N_BITS, distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        seed=SEED,
    )
    x_gated = run_pipeline(
        n_bits=N_BITS, distance_km=DIST, noise_level=NOISE,
        attack_prob=ATK_PROB, attack_strategy=STRATEGY,
        gates=['X'], seed=SEED,
    )

    baseline_mean = avg_bob_bit(baseline)
    x_mean = avg_bob_bit(x_gated)
    delta = abs(x_mean - baseline_mean)

    results_collector.append({
        'section': 6, 'test': 'x_gate_bit_flip',
        'gate': 'X', 'baseline_bob_mean': baseline_mean,
        'gated_bob_mean': x_mean, 'delta': delta,
    })
    # X gate flips all bits — mean bob_bit should shift significantly
    assert delta > 0.1, (
        f"X gate bob_bit delta too small: {delta:.4f}. "
        f"baseline_mean={baseline_mean:.4f}, x_mean={x_mean:.4f}"
    )
