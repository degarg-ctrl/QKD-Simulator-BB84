"""
H5 — Absolute event-stream cap.

Defect: select_event_stream_indices() strided to the full cap and THEN
appended up to four rare-category rescue indices, reaching cap + 4 (504).
Fix: reserve capacity for rescue before striding, so len <= cap always.
"""

import pytest

from core.events import (
    select_event_stream_indices,
    EVENT_STREAM_CAP,
)


def _states(n: int, rare: dict[int, set[str]] | None = None) -> list[dict]:
    rare = rare or {}
    out = []
    for i in range(n):
        flags = rare.get(i, set())
        out.append({
            'index': i,
            'pns_split': 'pns_split' in flags,
            'pns_blocked': 'pns_blocked' in flags,
            'dark_count': 'dark_count' in flags,
            'intercepted': 'intercepted' in flags,
        })
    return out


class TestAbsoluteCap:
    @pytest.mark.parametrize("n", [501, 504, 600, 1000, 2000, 5000, 10000])
    def test_cap_never_exceeded(self, n):
        for rare in (
            None,
            # all four rare categories only at the tail (stride misses)
            {n - 1: {'pns_split'}, n - 2: {'pns_blocked'},
             n - 3: {'dark_count'}, n - 4: {'intercepted'}},
        ):
            idx = select_event_stream_indices(_states(n, rare))
            assert len(idx) <= EVENT_STREAM_CAP, (
                f"n={n}: selected {len(idx)} > {EVENT_STREAM_CAP}"
            )

    def test_cap_is_exactly_500(self):
        assert EVENT_STREAM_CAP == 500

    def test_small_n_includes_all(self):
        assert select_event_stream_indices(_states(400)) == list(range(400))

    def test_custom_cap_respected(self):
        idx = select_event_stream_indices(_states(10000), cap=50)
        assert len(idx) <= 50

    def test_deterministic(self):
        states = _states(2000, {1999: {'pns_split'}})
        assert select_event_stream_indices(states) == \
            select_event_stream_indices(states)

    def test_rare_categories_still_representable(self):
        n = 10000
        rare = {
            n - 1: {'pns_split'},
            n - 2: {'pns_blocked'},
            n - 3: {'dark_count'},
            n - 4: {'intercepted'},
        }
        states = _states(n, rare)
        idx = select_event_stream_indices(states)
        assert any(states[i]['pns_split'] for i in idx)
        assert any(states[i]['pns_blocked'] for i in idx)
        assert any(states[i]['dark_count'] for i in idx)
        assert any(states[i]['intercepted'] for i in idx)

    def test_sorted_unique(self):
        idx = select_event_stream_indices(_states(3000))
        assert idx == sorted(idx)
        assert len(set(idx)) == len(idx)


class TestCapViaAPI:
    @pytest.mark.sync
    def test_api_event_stream_respects_cap(self, client):
        r = client.post('/api/simulate', json={
            'n_bits': 10000, 'distance_km': 100.0, 'noise_level': 0.0,
            'attack_prob': 0.8, 'attack_strategy': 'intercept_resend',
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert len(body['event_stream']) <= 500

    @pytest.mark.sync
    def test_api_cap_with_pns_and_gates(self, client):
        r = client.post('/api/simulate', json={
            'n_bits': 10000, 'distance_km': 50.0, 'noise_level': 0.1,
            'attack_prob': 0.8, 'attack_strategy': 'pns',
            'wcp_enabled': True, 'decoy_enabled': True,
            'mean_photon_number': 0.5,
            'gates': [
                {'type': 'clone', 'lane': 0, 'position': 0.5},
                {'type': 'H', 'lane': 1, 'position': 0.5},
            ],
        })
        assert r.status_code == 200, r.text
        assert len(r.json()['event_stream']) <= 500
