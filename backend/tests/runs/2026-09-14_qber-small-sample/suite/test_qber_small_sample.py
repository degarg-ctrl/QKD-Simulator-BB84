"""
test_qber_small_sample.py — Targeted tests for audit fix C1.

Defect (C1): estimate_qber() used sample_size = floor(0.10 * sifted_count).
For sifted_count < 10 this yields sample_size = 0 and the implementation
reported qber = 0.0 with threshold_breached = False — a scientifically
misleading "error-free" reading for a key whose QBER was never measured.

Fix: when the sifted key is too short to yield a meaningful sample
(< QBER_MIN_SIFTED_COUNT), QBER is reported as NOT ESTIMATED:

    qber = None
    qber_estimated = False

and this propagates through SKR, threshold-breach logic, key extraction,
schemas and the API. A sufficient sample yields the normal estimate with
qber_estimated = True.

Coverage (as required by the task):
  - sifted_count = 0
  - sifted_count = 1
  - sifted_count < minimum
  - sifted_count = minimum-1
  - sifted_count = minimum
  - normal sufficiently-large sample
  - full intercept-resend with small N
  - full intercept-resend with adequate N
  - insufficient sample cannot incorrectly report threshold_breached = False
    *because* QBER was coerced to zero
"""

import sys
from pathlib import Path

import pytest

_SUITE_DIR   = Path(__file__).parent
_BACKEND_DIR = _SUITE_DIR.parent.parent.parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from core.protocol import BB84Protocol
from core.metrics import compute_skr
from core.constants import (
    QBER_MIN_SAMPLE_SIZE,
    QBER_MIN_SIFTED_COUNT,
    QBER_SECURITY_THRESHOLD,
)

PROTOCOL = BB84Protocol()


# ---------------------------------------------------------------------------
# Helpers — build a synthetic sift_result with exact control over counts
# ---------------------------------------------------------------------------

def _make_sift_result(sifted_count: int, errors: int = 0) -> dict:
    """
    Build a minimal sift_result dict with `sifted_count` sifted bits and
    `errors` of them wrong (alice_bit != bob_bit).
    """
    if errors > sifted_count:
        raise ValueError('errors cannot exceed sifted_count')
    alice = [0] * sifted_count
    bob = [0] * sifted_count
    for i in range(errors):
        bob[i] = 1
    states = [{'index': i, 'alice_bit': alice[i], 'bob_bit': bob[i]}
              for i in range(sifted_count)]
    return {
        'sifted_states': states,
        'alice_bits': alice,
        'bob_bits': bob,
        'sifted_indices': list(range(sifted_count)),
        'raw_count': sifted_count,
        'sifted_count': sifted_count,
        'sift_efficiency': 1.0,
    }


# ---------------------------------------------------------------------------
# Minimum-sample policy is explicit and consistent
# ---------------------------------------------------------------------------

def test_min_sample_policy_is_explicit():
    """The minimum is an explicit constant, not accidental floor() behaviour."""
    assert QBER_MIN_SAMPLE_SIZE >= 1
    # Derived sifted-count threshold = ceil(min_sample / sample_fraction)
    assert QBER_MIN_SIFTED_COUNT == 100
    assert QBER_MIN_SIFTED_COUNT * 0.10 >= QBER_MIN_SAMPLE_SIZE


# ---------------------------------------------------------------------------
# Insufficient sample -> NOT ESTIMATED (never a fake 0.0)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('sifted_count', [0, 1, 2, 9, 50, 99])
def test_insufficient_sample_not_estimated(sifted_count):
    """sifted_count < minimum -> qber is None and qber_estimated is False.

    Covers: 0, 1, <minimum, minimum-1 (99).
    """
    result = PROTOCOL.estimate_qber(_make_sift_result(sifted_count))
    assert result['qber'] is None, (
        f"sifted_count={sifted_count}: expected qber=None, got {result['qber']!r}"
    )
    assert result['qber_estimated'] is False
    assert result['sample_size'] == 0
    # No bits are sacrificed when we cannot estimate.
    assert len(result['remaining_bob_bits']) == sifted_count


def test_insufficient_sample_threshold_not_falsely_reported():
    """Insufficient sample must NOT be reported as a clean (non-breached) key.

    The old bug produced threshold_breached=False *because* qber was coerced
    to 0.0. The fix must make the 'not estimated' state explicit instead.
    """
    result = PROTOCOL.estimate_qber(_make_sift_result(5, errors=5))
    # Even though every bit is wrong, we must not claim an estimate.
    assert result['qber'] is None
    assert result['qber_estimated'] is False
    # threshold_breached is False only because no estimate exists — the
    # distinguishing signal is qber_estimated, not the breach flag.
    assert result['threshold_breached'] is False
    assert result['qber_estimated'] is False  # <-- the meaningful guard


def test_insufficient_sample_extract_key_aborts():
    """No key can be extracted without a QBER estimate."""
    qber_result = PROTOCOL.estimate_qber(_make_sift_result(5))
    key_result = PROTOCOL.extract_key(qber_result)
    assert key_result['session_aborted'] is True
    assert key_result['key_length'] == 0
    assert key_result['key'] == []


# ---------------------------------------------------------------------------
# Minimum sample and above -> normal estimation
# ---------------------------------------------------------------------------

def test_at_minimum_sample_estimated():
    """sifted_count == minimum -> normal QBER estimation."""
    result = PROTOCOL.estimate_qber(_make_sift_result(100, errors=0))
    assert result['qber_estimated'] is True
    assert result['qber'] == pytest.approx(0.0)
    assert result['sample_size'] == QBER_MIN_SAMPLE_SIZE  # floor(0.1*100)=10


def test_large_sample_estimated_normal():
    """A comfortably large sample yields a normal QBER in [0, 1]."""
    result = PROTOCOL.estimate_qber(_make_sift_result(1000, errors=250))
    assert result['qber_estimated'] is True
    assert result['sample_size'] == 100
    assert 0.0 <= result['qber'] <= 1.0
    # ~25% of bits are wrong; the sampled estimate should be near that.
    assert 0.10 < result['qber'] < 0.40


def test_high_error_sample_breaches_threshold():
    """A valid (estimated) QBER >= 11% still breaches the threshold."""
    result = PROTOCOL.estimate_qber(_make_sift_result(1000, errors=1000))
    assert result['qber_estimated'] is True
    assert result['qber'] == pytest.approx(1.0)
    assert result['threshold_breached'] is True
    key_result = PROTOCOL.extract_key(result)
    assert key_result['session_aborted'] is True


# ---------------------------------------------------------------------------
# SKR handling of unestimated QBER (no silent None->0)
# ---------------------------------------------------------------------------

def test_compute_skr_none_is_zero_not_measured_zero():
    """compute_skr(None) must return 0.0 (cannot certify) without crashing."""
    assert compute_skr(1000, 2000, None) == 0.0


def test_compute_skr_normal_still_works():
    """Regression: a valid float QBER still produces a positive SKR."""
    skr = compute_skr(1000, 2000, 0.0)
    assert skr > 0.0
    assert compute_skr(1000, 2000, 0.20) == 0.0


# ---------------------------------------------------------------------------
# Full-pipeline / API behaviour
# ---------------------------------------------------------------------------

def test_full_intercept_resend_small_N_not_estimated(client):
    """Full intercept-resend at small N: QBER NOT ESTIMATED (not 0.0)."""
    resp = client.post('/api/simulate', json={
        'n_bits': 8, 'distance_km': 0, 'noise_level': 0.0,
        'attack_prob': 1.0, 'attack_strategy': 'intercept_resend',
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    # 8 photons -> at most 8 sifted bits << minimum -> not estimated.
    assert data['qber_estimated'] is False
    assert data['qber'] is None, (
        f"small-N full interception must not report qber=0.0; got {data['qber']!r}"
    )
    # And must not be presented as a secure (non-breached) session.
    assert data['skr'] == 0.0


def test_full_intercept_resend_adequate_N_estimated(client):
    """Full intercept-resend at adequate N: QBER ~25%, estimated."""
    resp = client.post('/api/simulate', json={
        'n_bits': 2000, 'distance_km': 0, 'noise_level': 0.0,
        'attack_prob': 1.0, 'attack_strategy': 'intercept_resend',
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data['qber_estimated'] is True
    assert data['qber'] is not None
    assert 0.20 <= data['qber'] <= 0.30, f"QBER={data['qber']} outside 25%±5%"


def test_clean_adequate_N_estimated_and_secure(client):
    """Clean channel, adequate N: QBER ~0, estimated, not breached."""
    resp = client.post('/api/simulate', json={
        'n_bits': 2000, 'distance_km': 0, 'noise_level': 0.0,
        'attack_prob': 0.0, 'attack_strategy': 'intercept_resend',
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data['qber_estimated'] is True
    assert data['qber'] < 0.02
    assert data['secure_threshold_breached'] is False


# ---------------------------------------------------------------------------
# Schema invariant: qber_estimated is present and consistent with qber
# ---------------------------------------------------------------------------

def test_api_qber_estimated_flag_consistent(client):
    """qber_estimated must be present and exactly (qber is not None)."""
    for payload in (
        {'n_bits': 8, 'distance_km': 0, 'noise_level': 0.0,
         'attack_prob': 1.0, 'attack_strategy': 'intercept_resend'},
        {'n_bits': 2000, 'distance_km': 0, 'noise_level': 0.0,
         'attack_prob': 0.0, 'attack_strategy': 'intercept_resend'},
    ):
        data = client.post('/api/simulate', json=payload).json()
        assert 'qber_estimated' in data
        assert data['qber_estimated'] == (data['qber'] is not None)


# ---------------------------------------------------------------------------
# Exp 2 / Exp 4 presets expose an adequate sample size
# ---------------------------------------------------------------------------

def test_exp2_exp4_sample_size_adequate():
    """exp2/exp4 defaults must allow an estimable QBER (>= minimum)."""
    from core.experiments import get_experiment_preset
    for exp_id in ('exp2', 'exp4'):
        preset = get_experiment_preset(exp_id)
        assert preset is not None
        assert preset['default_params']['n_bits'] >= QBER_MIN_SIFTED_COUNT, (
            f"{exp_id} default n_bits="
            f"{preset['default_params']['n_bits']} < minimum sifted count"
        )
        assert preset['max_photons'] >= QBER_MIN_SIFTED_COUNT
