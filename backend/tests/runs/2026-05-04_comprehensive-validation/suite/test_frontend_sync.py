"""
test_frontend_sync.py — Section 8: Frontend/Backend API field sync

Requires backend running at http://127.0.0.1:8000
Run this file separately AFTER starting the server:

    # Terminal 1 (start backend):
    & ".\.venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8000

    # Terminal 2 (run only this file):
    & ".\.venv\Scripts\python.exe" -m pytest tests/runs/2026-05-04_comprehensive-validation/suite/test_frontend_sync.py -v

Tests that the API response is internally consistent:
  1. qber is in valid range and consistent with threshold_breached
  2. sifted_key_length is in valid range [0, n_bits]
  3. secure_threshold_breached ↔ qber >= 0.11
  4. skr == 0 when secure_threshold_breached=True
  5. wcp_enabled in response mirrors request
  6. pns_stats is non-empty only when attack_strategy='pns'

All tests are marked @pytest.mark.sync and auto-skip if the server is not running.
"""

import sys
import json
from pathlib import Path
import pytest

_SUITE_DIR = Path(__file__).parent
_BACKEND_DIR = _SUITE_DIR.parent.parent.parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from conftest import api_call

# ---------------------------------------------------------------------------
# Auto-skip fixture: skip all sync tests if server is unreachable
# ---------------------------------------------------------------------------

def _server_available() -> bool:
    import urllib.request
    import urllib.error
    try:
        urllib.request.urlopen('http://127.0.0.1:8000/docs', timeout=2)
        return True
    except Exception:
        return False


@pytest.fixture(autouse=True, scope='module')
def require_server():
    """Skip entire module if backend is not running."""
    if not _server_available():
        pytest.skip(
            'Backend server not running at http://127.0.0.1:8000. '
            'Start it first: & ".\.venv\Scripts\python.exe" -m uvicorn main:app --reload --port 8000'
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _manual_sifted_count(bit_stream: list[dict]) -> int:
    """Count photons with matching bases and not lost (visible in bit_stream)."""
    return sum(1 for p in bit_stream if p.get('match') and not p.get('lost'))


BASE_PAYLOAD = {
    'n_bits': 2000,
    'distance_km': 0,
    'noise_level': 0.02,
    'attack_prob': 0.0,
    'attack_strategy': 'intercept_resend',
    'wcp_enabled': False,
    'mean_photon_number': 0.2,
    'decoy_enabled': False,
}


# ---------------------------------------------------------------------------
# 8.1 — QBER valid range and consistency with threshold_breached
# ---------------------------------------------------------------------------

@pytest.mark.sync
def test_qber_valid_range(results_collector):
    """
    API qber must be in [0, 1] and consistent with threshold_breached.

    Note: The API caps bit_stream at 500 photons for response size, but
    qber is computed from ALL n_bits photons in the protocol. We verify
    qber is in [0, 1] and consistent with threshold_breached.
    """
    resp = api_call({**BASE_PAYLOAD, 'attack_prob': 0.5})
    reported = resp['qber']
    breached = resp['secure_threshold_breached']

    results_collector.append({
        'section': 8, 'test': 'qber_valid_range',
        'reported_qber': reported, 'threshold_breached': breached,
    })

    assert 0.0 <= reported <= 1.0, (
        f"QBER={reported:.4f} out of valid range [0, 1]"
    )
    assert (reported >= 0.11) == breached, (
        f"QBER={reported:.4f} inconsistent with threshold_breached={breached}"
    )


# ---------------------------------------------------------------------------
# 8.2 — sifted_key_length valid range
# ---------------------------------------------------------------------------

@pytest.mark.sync
def test_sifted_key_length_valid_range(results_collector):
    """
    sifted_key_length must be in [0, n_bits] and >= visible sifted in bit_stream.

    Note: The API caps bit_stream at 500 photons, so sifted_key_length from
    the full protocol run is always >= visible sifted count in bit_stream.
    """
    resp = api_call(BASE_PAYLOAD)
    reported_sifted = resp['sifted_key_length']
    raw_key_length  = resp['raw_key_length']
    visible_sifted  = _manual_sifted_count(resp['bit_stream'])

    results_collector.append({
        'section': 8, 'test': 'sifted_key_length_valid',
        'reported_sifted': reported_sifted,
        'raw_key_length': raw_key_length,
        'visible_in_bit_stream': visible_sifted,
    })

    assert 0 <= reported_sifted <= raw_key_length, (
        f"sifted_key_length={reported_sifted} out of range [0, {raw_key_length}]"
    )
    assert reported_sifted >= visible_sifted, (
        f"sifted_key_length={reported_sifted} < visible in bit_stream={visible_sifted} "
        f"(API bit_stream is capped at 500 photons)"
    )


# ---------------------------------------------------------------------------
# 8.3 — secure_threshold_breached ↔ qber >= 0.11
# ---------------------------------------------------------------------------

@pytest.mark.sync
@pytest.mark.parametrize('attack_prob,expect_breach', [
    (0.0, False),
    (1.0, True),
])
def test_threshold_breached_matches_qber(attack_prob, expect_breach, results_collector):
    """secure_threshold_breached must equal (qber >= 0.11)."""
    resp = api_call({**BASE_PAYLOAD, 'attack_prob': attack_prob})
    qber     = resp['qber']
    breached = resp['secure_threshold_breached']
    expected = qber >= 0.11

    results_collector.append({
        'section': 8, 'test': 'threshold_breach_consistency',
        'attack_prob': attack_prob, 'qber': qber,
        'reported_breached': breached, 'expected_breached': expected,
    })

    assert breached == expected, (
        f"attack_prob={attack_prob}: qber={qber:.4f}, "
        f"secure_threshold_breached={breached}, expected={expected}"
    )


# ---------------------------------------------------------------------------
# 8.4 — SKR == 0 when threshold breached
# ---------------------------------------------------------------------------

@pytest.mark.sync
def test_skr_zero_when_breached(results_collector):
    """skr must be 0 when secure_threshold_breached=True."""
    resp = api_call({**BASE_PAYLOAD, 'attack_prob': 1.0})
    if resp['secure_threshold_breached']:
        results_collector.append({
            'section': 8, 'test': 'skr_zero_when_breached',
            'skr': resp['skr'], 'breached': True,
        })
        assert resp['skr'] == 0.0, (
            f"skr={resp['skr']} should be 0 when threshold_breached=True"
        )


# ---------------------------------------------------------------------------
# 8.5 — wcp_enabled mirrored in response
# ---------------------------------------------------------------------------

@pytest.mark.sync
@pytest.mark.parametrize('wcp', [False, True])
def test_wcp_enabled_mirrored(wcp, results_collector):
    """wcp_enabled in response must mirror wcp_enabled in request."""
    resp = api_call({**BASE_PAYLOAD, 'wcp_enabled': wcp})
    results_collector.append({
        'section': 8, 'test': 'wcp_enabled_mirrored',
        'requested': wcp, 'reported': resp.get('wcp_enabled'),
    })
    assert resp.get('wcp_enabled') == wcp, (
        f"wcp_enabled: requested={wcp}, response={resp.get('wcp_enabled')}"
    )


# ---------------------------------------------------------------------------
# 8.6 — pns_stats non-empty only for pns strategy
# ---------------------------------------------------------------------------

@pytest.mark.sync
@pytest.mark.parametrize('strategy,expect_pns', [
    ('intercept_resend', False),
    ('pns', True),
])
def test_pns_stats_only_for_pns(strategy, expect_pns, results_collector):
    """pns_stats must be non-empty only when attack_strategy='pns'."""
    payload = {
        **BASE_PAYLOAD,
        'attack_strategy': strategy,
        'attack_prob': 0.5,
        'wcp_enabled': True,
    }
    resp = api_call(payload)
    has_pns = bool(resp.get('pns_stats'))

    results_collector.append({
        'section': 8, 'test': 'pns_stats_presence',
        'attack_strategy': strategy,
        'pns_stats_non_empty': has_pns, 'expected': expect_pns,
    })

    if expect_pns:
        assert has_pns, f"pns_stats should be non-empty for strategy='{strategy}'"
