"""
tests/conftest.py

Shared fixtures and pipeline helpers for the QKD Simulation Accuracy Testing Suite.

Provides:
- PipelineResult dataclass: structured output from a single run_pipeline() call
- TrialResult dataclass: averaged output from run_pipeline_trials()
- run_pipeline(): invokes the full BB84 simulation pipeline directly (no HTTP)
- run_pipeline_trials(): runs run_pipeline n_trials times and averages results
- Fixtures: alice, bob, channel_0km, eve_none, protocol (function-scoped)
- Session-scoped results_collector fixture
- pytest_sessionfinish hook: serializes results_collector to tests/.results_cache.json
"""

from __future__ import annotations

import dataclasses
import json
import os
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# Ensure the backend package root is on sys.path so that `core.*` imports work
# when pytest is invoked from qkd-simulator/backend/
#
# File location: backend/tests/suite/conftest.py
# Path depth:    suite/ -> tests/ -> backend/  (3 levels up)
# ---------------------------------------------------------------------------
_TESTS_DIR   = Path(__file__).parent.parent.parent.parent  # backend/tests/
_BACKEND_DIR = Path(__file__).parent.parent.parent.parent.parent  # backend/
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from core.alice import Alice
from core.bob import Bob
from core.channel import QuantumChannel
from core.eve import Eve
from core.protocol import BB84Protocol
from core.metrics import compute_skr, compute_efficiency
from core.gates import apply_gate, apply_gates_to_lane
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


@dataclasses.dataclass
class TrialResult:
    """Averaged output from run_pipeline_trials()."""
    mean_qber: float
    std_qber: float
    mean_skr: float
    mean_sifted_key_length: float
    mean_efficiency: float
    n_trials: int
    raw_results: list[PipelineResult]


# ---------------------------------------------------------------------------
# Central pipeline helper
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
    gates: list[str] | None = None,
    seed: int | None = None,
) -> PipelineResult:
    """
    Run the full BB84 simulation pipeline and return structured results.

    Invokes core modules directly — no HTTP endpoint dependency.

    Pipeline order:
      1. Alice generates bits, bases, encodes states
      2. (Optional) WCP: apply Poisson photon distribution
      3. QuantumChannel transmits states
      4. Eve intercepts (or PNS attack if attack_strategy='pns')
      5. (Optional) Apply quantum gates
      6. Bob measures
      7. BB84Protocol sifts, estimates QBER, extracts key
      8. Metrics: compute SKR, efficiency
      9. (Optional) Decoy state analysis

    Args:
        n_bits: number of photons Alice sends
        distance_km: fiber channel distance in km
        noise_level: channel noise probability [0, 1]
        attack_prob: Eve's interception probability [0, 1]
        attack_strategy: one of 'intercept_resend', 'partial', 'burst', 'pns'
        wcp_enabled: whether to apply WCP Poisson photon model
        mu: mean photon number per pulse (used when wcp_enabled=True)
        decoy_enabled: whether to apply decoy state protocol
        gates: list of gate type strings (e.g. ['H', 'X']) applied to all photons
        seed: if provided, sets numpy.random.seed before the run for reproducibility

    Returns:
        PipelineResult with all simulation outputs
    """
    if seed is not None:
        np.random.seed(seed)

    # Step 1: Alice
    alice = Alice()
    bits = alice.generate_bits(n_bits)
    bases = alice.choose_bases(n_bits)
    states = alice.encode_states(bits, bases)

    # Step 2: WCP model (optional)
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

    # Step 4: Eve / PNS attack
    pns_stats: dict = {}
    if attack_strategy == 'pns':
        # PNS attack: Eve does NOT do intercept-resend (no QBER introduced)
        # Use a pass-through Eve (attack_prob=0) then apply PNS
        eve = Eve(attack_strategy='intercept_resend', attack_prob=0.0)
        eve_states = eve.intercept(channel_states)
        if wcp_enabled:
            pns_rng = np.random.default_rng(seed)
            pns = PNSAttack(
                p_block=attack_prob * 0.5,
                p_split=attack_prob,
            )
            eve_states, pns_stats = pns.attack(eve_states, pns_rng)
    else:
        eve = Eve(attack_strategy=attack_strategy, attack_prob=attack_prob)
        eve_states = eve.intercept(channel_states)

    # Step 5: Apply quantum gates (optional)
    if gates:
        for gate_type in gates:
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

    # Survival fraction: fraction of photons that were detected (not lost)
    detected_count = sum(
        1 for s in channel_states
        if s.get('detected', False)
    )
    survival_fraction = detected_count / n_bits if n_bits > 0 else 0.0

    # Detection rate: sifted / raw
    detection_rate = sift_result['sifted_count'] / n_bits if n_bits > 0 else 0.0

    # Step 9: Decoy state analysis (optional)
    decoy_results: dict = {}
    if decoy_enabled and decoy_intensities is not None:
        gains = compute_gains(measured_states, decoy_intensities)
        decoy_results = detect_pns_attack(gains)

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
    )


# ---------------------------------------------------------------------------
# Multi-trial averaging helper
# ---------------------------------------------------------------------------

def run_pipeline_trials(
    n_trials: int = 5,
    **pipeline_kwargs: Any,
) -> TrialResult:
    """
    Run run_pipeline n_trials times with independent random seeds.

    Each trial uses a different seed derived from the trial index so that
    results are independent but reproducible.  The base seed can be
    controlled by passing seed=<value> in pipeline_kwargs; if omitted a
    fixed default (42) is used so that the trial sequence is reproducible.

    Returns a TrialResult with mean and std of each numeric field.
    """
    base_seed = pipeline_kwargs.pop('seed', 42)
    results: list[PipelineResult] = []

    for i in range(n_trials):
        trial_seed = (base_seed + i * 1000) if base_seed is not None else None
        result = run_pipeline(seed=trial_seed, **pipeline_kwargs)
        results.append(result)

    qbers = [r.qber for r in results]
    skrs = [r.skr for r in results]
    sifted_lengths = [r.sifted_key_length for r in results]
    efficiencies = [r.efficiency for r in results]

    return TrialResult(
        mean_qber=float(np.mean(qbers)),
        std_qber=float(np.std(qbers)),
        mean_skr=float(np.mean(skrs)),
        mean_sifted_key_length=float(np.mean(sifted_lengths)),
        mean_efficiency=float(np.mean(efficiencies)),
        n_trials=n_trials,
        raw_results=results,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def alice() -> Alice:
    """Fresh Alice instance per test."""
    return Alice()


@pytest.fixture
def bob() -> Bob:
    """Fresh Bob instance per test."""
    return Bob()


@pytest.fixture
def channel_0km() -> QuantumChannel:
    """Zero-distance, zero-noise channel."""
    return QuantumChannel(distance_km=0.0, noise_level=0.0)


@pytest.fixture
def eve_none() -> Eve:
    """Eve with attack_prob=0.0 (no interception)."""
    return Eve(attack_strategy='intercept_resend', attack_prob=0.0)


@pytest.fixture
def protocol() -> BB84Protocol:
    """Fresh BB84Protocol instance."""
    return BB84Protocol()


# Module-level results store — accessible from session finish hook
_SESSION_RESULTS: list[dict] = []


@pytest.fixture(scope='session')
def results_collector():
    """
    Session-scoped list that test functions append ResultRow dicts to.
    Used by generate_reports.py to build TEST_RESULTS.md.
    References the module-level _SESSION_RESULTS so the sessionfinish hook
    can reliably access it.
    """
    return _SESSION_RESULTS


# ---------------------------------------------------------------------------
# Session finish hook — serialize results_collector to JSON cache
# ---------------------------------------------------------------------------

def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    """
    Serialize the results_collector list to tests/runs/<latest>/.results_cache.json
    at the end of the test session. Uses module-level _SESSION_RESULTS.

    File location: backend/tests/suite/conftest.py
    Output:        backend/tests/runs/<latest-run-folder>/.results_cache.json
    """
    if not _SESSION_RESULTS:
        return

    # Write cache into the most recently modified runs/ subfolder,
    # or fall back to tests/ itself if no runs/ folder exists yet.
    runs_dir = _TESTS_DIR / 'runs'
    if runs_dir.exists():
        run_folders = sorted(
            [d for d in runs_dir.iterdir() if d.is_dir()],
            key=lambda d: d.stat().st_mtime,
            reverse=True,
        )
        cache_dir = run_folders[0] if run_folders else _TESTS_DIR
    else:
        cache_dir = _TESTS_DIR

    cache_path = cache_dir / '.results_cache.json'
    try:
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(_SESSION_RESULTS, f, indent=2, default=str)
        print(f"\n[conftest] Results cache written: {cache_path} ({len(_SESSION_RESULTS)} rows)")
    except Exception as exc:
        print(f"\n[conftest] Warning: could not write results cache: {exc}")
