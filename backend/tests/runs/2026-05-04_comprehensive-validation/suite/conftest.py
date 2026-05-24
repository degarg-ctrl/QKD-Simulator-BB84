"""
conftest.py — Shared fixtures for 2026-05-04_comprehensive-validation test suite.

Inherits the same pipeline helpers from the 2026-05-02 run.
Adds: api_call() helper for frontend sync tests.
"""

from __future__ import annotations

import dataclasses
import json
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# Path setup: make `core.*` importable from backend/
# File:  backend/tests/runs/2026-05-04_comprehensive-validation/suite/conftest.py
# Depth: suite/ -> 2026-05-04.../ -> runs/ -> tests/ -> backend/
# ---------------------------------------------------------------------------
_SUITE_DIR   = Path(__file__).parent                     # suite/
_RUN_DIR     = _SUITE_DIR.parent                         # 2026-05-04.../
_RUNS_DIR    = _RUN_DIR.parent                           # runs/
_TESTS_DIR   = _RUNS_DIR.parent                         # tests/
_BACKEND_DIR = _TESTS_DIR.parent                        # backend/

for p in [str(_BACKEND_DIR), str(_SUITE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from core.alice import Alice
from core.bob import Bob
from core.channel import QuantumChannel
from core.eve import Eve
from core.protocol import BB84Protocol
from core.metrics import compute_skr, compute_efficiency
from core.gates import apply_gate
from core.wcp import poisson_photon_counts, classify_pulses, apply_wcp_to_states
from core.pns import PNSAttack
from core.decoy import assign_decoy_intensities, compute_gains, detect_pns_attack


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclasses.dataclass
class PipelineResult:
    """Structured output from a single run_pipeline() call."""
    qber: float
    skr: float
    sifted_key_length: int
    raw_key_length: int
    efficiency: float
    threshold_breached: bool
    wcp_stats: dict
    pns_stats: dict
    decoy_results: dict
    survival_fraction: float
    detection_rate: float
    bit_stream: list[dict]


@dataclasses.dataclass
class TrialResult:
    """Averaged output from run_pipeline_trials()."""
    mean_qber: float
    std_qber: float
    mean_skr: float
    mean_sifted_key_length: float
    mean_survival_fraction: float
    n_trials: int
    raw_results: list[PipelineResult]


# ---------------------------------------------------------------------------
# Core pipeline helper
# ---------------------------------------------------------------------------

def run_pipeline(
    n_bits: int,
    distance_km: float,
    noise_level: float,
    attack_prob: float,
    attack_strategy: str,
    wcp_enabled: bool = False,
    mu: float = 0.2,
    decoy_enabled: bool = False,
    gates: list[dict] | None = None,
    seed: int | None = None,
) -> PipelineResult:
    """
    Run the full BB84 simulation pipeline and return structured results.
    Direct Python import — no HTTP dependency.
    """
    if seed is not None:
        np.random.seed(seed)

    # Step 1: Alice
    alice = Alice()
    bits = alice.generate_bits(n_bits)
    bases = alice.choose_bases(n_bits)
    states = alice.encode_states(bits, bases)

    # Step 2: WCP (optional)
    wcp_stats: dict = {}
    decoy_intensities = None

    if wcp_enabled:
        rng = np.random.default_rng(seed)
        if decoy_enabled:
            decoy_intensities = assign_decoy_intensities(n_bits, rng)
            photon_counts = np.array([rng.poisson(m) for m in decoy_intensities])
        else:
            photon_counts = poisson_photon_counts(n_bits, mu, rng)
        states = apply_wcp_to_states(states, photon_counts)
        wcp_stats = classify_pulses(photon_counts)

    # Step 3: Channel
    channel = QuantumChannel(distance_km=distance_km, noise_level=noise_level)
    channel_states = channel.transmit(states)

    # Step 4: Eve / PNS
    pns_stats: dict = {}
    if attack_strategy == 'pns':
        eve = Eve(attack_strategy='intercept_resend', attack_prob=0.0)
        eve_states = eve.intercept(channel_states)
        if wcp_enabled:
            pns_rng = np.random.default_rng(seed)
            pns = PNSAttack(p_block=attack_prob * 0.5, p_split=attack_prob)
            eve_states, pns_stats = pns.attack(eve_states, pns_rng)
    else:
        eve = Eve(attack_strategy=attack_strategy, attack_prob=attack_prob)
        eve_states = eve.intercept(channel_states)

    # Step 5: Gates (optional)
    if gates:
        for gate_cfg in gates:
            gate_type = gate_cfg.get('type') if isinstance(gate_cfg, dict) else gate_cfg
            eve_states = [apply_gate(s, gate_type) for s in eve_states]

    # Step 6: Bob
    bob = Bob()
    measured_states = bob.measure(eve_states)

    # Step 7: Protocol
    protocol = BB84Protocol()
    sift_result = protocol.sift(measured_states)
    qber_result = protocol.estimate_qber(sift_result)

    # Step 8: Metrics
    skr = compute_skr(
        sifted_key_length=sift_result['sifted_count'],
        raw_key_length=n_bits,
        qber=qber_result['qber'],
    )
    efficiency = compute_efficiency(
        sifted_key_length=sift_result['sifted_count'],
        raw_key_length=n_bits,
    )

    detected_count = sum(1 for s in channel_states if s.get('detected', False))
    survival_fraction = detected_count / n_bits if n_bits > 0 else 0.0
    detection_rate = sift_result['sifted_count'] / n_bits if n_bits > 0 else 0.0

    # Step 9: Decoy (optional)
    decoy_results: dict = {}
    if decoy_enabled and decoy_intensities is not None:
        gains = compute_gains(measured_states, decoy_intensities)
        decoy_results = detect_pns_attack(gains)

    # Build bit_stream for sync tests
    bit_stream = []
    for i, s in enumerate(measured_states):
        bit_stream.append({
            'index': i,
            'alice_bit': s.get('alice_bit', 0),
            'alice_basis': s.get('alice_basis', '+'),
            'bob_basis': s.get('bob_basis', '+'),
            'bob_bit': s.get('bob_bit', 0),
            'match': s.get('alice_basis') == s.get('bob_basis'),
            'intercepted': s.get('intercepted', False),
            'lost': not s.get('detected', True),
        })

    return PipelineResult(
        qber=float(qber_result['qber']),
        skr=float(skr),
        sifted_key_length=int(sift_result['sifted_count']),
        raw_key_length=int(n_bits),
        efficiency=float(efficiency),
        threshold_breached=bool(qber_result['threshold_breached']),
        wcp_stats=wcp_stats,
        pns_stats=pns_stats,
        decoy_results=decoy_results,
        survival_fraction=float(survival_fraction),
        detection_rate=float(detection_rate),
        bit_stream=bit_stream,
    )


# ---------------------------------------------------------------------------
# Multi-trial helper
# ---------------------------------------------------------------------------

def run_pipeline_trials(
    n_trials: int = 25,
    **pipeline_kwargs: Any,
) -> TrialResult:
    """
    Run run_pipeline n_trials times with independent seeds, return averaged results.
    """
    base_seed = pipeline_kwargs.pop('seed', 42)
    results: list[PipelineResult] = []

    for i in range(n_trials):
        trial_seed = (base_seed + i * 1000) if base_seed is not None else None
        result = run_pipeline(seed=trial_seed, **pipeline_kwargs)
        results.append(result)

    qbers = [r.qber for r in results]
    skrs  = [r.skr  for r in results]
    sifted = [r.sifted_key_length for r in results]
    surv   = [r.survival_fraction for r in results]

    return TrialResult(
        mean_qber=float(np.mean(qbers)),
        std_qber=float(np.std(qbers)),
        mean_skr=float(np.mean(skrs)),
        mean_sifted_key_length=float(np.mean(sifted)),
        mean_survival_fraction=float(np.mean(surv)),
        n_trials=n_trials,
        raw_results=results,
    )


# ---------------------------------------------------------------------------
# HTTP helper for frontend sync tests
# ---------------------------------------------------------------------------

def api_call(payload: dict, base_url: str = 'http://127.0.0.1:8000') -> dict:
    """
    POST /api/simulate and return parsed JSON.
    Raises RuntimeError if server unreachable or non-200.
    """
    import urllib.request
    import urllib.error

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f'{base_url}/api/simulate',
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.URLError as e:
        raise RuntimeError(
            f'Backend unreachable at {base_url}. Start the server before running sync tests. Error: {e}'
        )


# ---------------------------------------------------------------------------
# Session-level results store
# ---------------------------------------------------------------------------

_SESSION_RESULTS: list[dict] = []


@pytest.fixture(scope='session')
def results_collector():
    return _SESSION_RESULTS


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    """Write collected results to .results_cache.json in the run folder."""
    if not _SESSION_RESULTS:
        return
    cache_path = _RUN_DIR / '.results_cache.json'
    try:
        existing_results = []
        if cache_path.exists():
            try:
                with open(cache_path, 'r', encoding='utf-8') as f:
                    existing_results = json.load(f)
            except Exception:
                pass  # Ignore bad json, start fresh
        
        # Merge by replacing old tests with same section/test name, or append new ones
        new_keys = {(r.get('section'), r.get('test')) for r in _SESSION_RESULTS}
        merged_results = [r for r in existing_results if (r.get('section'), r.get('test')) not in new_keys]
        merged_results.extend(_SESSION_RESULTS)

        # Sort by section so the JSON file remains readable
        merged_results.sort(key=lambda r: r.get('section', 99))

        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(merged_results, f, indent=2, default=str)
        print(f'\n[conftest] Results cache merged: {cache_path} ({len(merged_results)} rows total)')
    except Exception as exc:
        print(f'\n[conftest] Warning: could not write results cache: {exc}')


# ---------------------------------------------------------------------------
# Standard fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def alice() -> Alice:
    return Alice()

@pytest.fixture
def bob() -> Bob:
    return Bob()

@pytest.fixture
def channel_0km() -> QuantumChannel:
    return QuantumChannel(distance_km=0.0, noise_level=0.0)

@pytest.fixture
def eve_none() -> Eve:
    return Eve(attack_strategy='intercept_resend', attack_prob=0.0)

@pytest.fixture
def protocol() -> BB84Protocol:
    return BB84Protocol()
