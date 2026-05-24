import base64

content = b'''import sys
from pathlib import Path
import numpy as np
import pytest

_BACKEND_DIR = Path(__file__).parent.parent
_TESTS_DIR = Path(__file__).parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
if str(_TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(_TESTS_DIR))

from conftest import run_pipeline, run_pipeline_trials, PipelineResult, TrialResult
from core.metrics import binary_entropy, compute_skr, compute_efficiency
from core.channel import QuantumChannel
from core.constants import DETECTOR_EFFICIENCY, ATTENUATION_COEFF_DB_PER_KM
from core.alice import Alice
from core.bob import Bob
from core.eve import Eve
from core.protocol import BB84Protocol
from core.wcp import poisson_photon_counts, classify_pulses
from core.decoy import assign_decoy_intensities
from core.pns import PNSAttack


# ===========================================================================
# 2.1 - Migrated from test_physics.py (4 tests)
# ===========================================================================

def test_legacy_qber_no_eve():
    """QBER < 0.02 at 0km, no noise, no Eve (n=20000)."""
    alice = Alice()
    n = 20000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    ch = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = ch.transmit(states)
    eve = Eve("intercept_resend", attack_prob=0.0)
    eve_states = eve.intercept(ch_states)
    bob = Bob()
    measured = bob.measure(eve_states)
    protocol = BB84Protocol()
    sift = protocol.sift(measured)
    qber = protocol.estimate_qber(sift)
    assert qber["qber"] < 0.02, (
        f"Legacy QBER no Eve: expected <0.02, got {qber['qber']:.4f}"
    )


def test_legacy_qber_full_eve():
    """0.23 <= QBER <= 0.27 at attack_prob=1.0 (n=20000)."""
    alice = Alice()
    n = 20000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    ch = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = ch.transmit(states)
    eve = Eve("intercept_resend", attack_prob=1.0)
    eve_states = eve.intercept(ch_states)
    bob = Bob()
    measured = bob.measure(eve_states)
    protocol = BB84Protocol()
    sift = protocol.sift(measured)
    qber = protocol.estimate_qber(sift)
    assert 0.23 <= qber["qber"] <= 0.27, (
        f"Legacy QBER full Eve: expected 0.23-0.27, got {qber['qber']:.4f}"
    )


def test_legacy_skr_at_threshold():
    """compute_skr(1000, 5000, 0.11) == 0.0"""
    skr = compute_skr(1000, 5000, 0.11)
    assert skr == 0.0, f"SKR at threshold: expected 0.0, got {skr}"


def test_legacy_binary_entropy():
    """binary_entropy(0.0)==0.0, binary_entropy(0.5)==1.0"""
    assert binary_entropy(0.0) == 0.0, "H(0.0) should be 0.0"
    assert binary_entropy(0.5) == 1.0, "H(0.5) should be 1.0"


# ===========================================================================
# 2.2 - Migrated from test_comprehensive.py (14 tests)
# ===========================================================================

def test_alice_generation():
    """len(bits)==n, all in [0,1], distribution 40-60%."""
    alice = Alice()
    n = 1000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    assert len(bits) == n, f"Expected {n} bits, got {len(bits)}"
    assert len(bases) == n, f"Expected {n} bases, got {len(bases)}"
    assert all(b in [0, 1] for b in bits), "Bits must be 0 or 1"
    bit_mean = np.mean(bits)
    assert 0.4 < bit_mean < 0.6, (
        f"Bit distribution skewed: mean={bit_mean:.3f}, expected 0.4-0.6"
    )


def test_alice_encoding():
    """4 states, alice_bit/alice_basis/polarization_angle present."""
    alice = Alice()
    bits = np.array([0, 1, 0, 1])
    bases = np.array(["+", "+", "x", "x"])
    states = alice.encode_states(bits, bases)
    assert len(states) == 4, f"Expected 4 states, got {len(states)}"
    for i, state in enumerate(states):
        assert "alice_bit" in state, f"State {i} missing alice_bit"
        assert "alice_basis" in state, f"State {i} missing alice_basis"
        assert "polarization_angle" in state, f"State {i} missing polarization_angle"


def test_channel_transmission():
    """0km detection rate 70-100%, 50km lower than 0km."""
    alice = Alice()
    n = 1000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)

    ch0 = QuantumChannel(distance_km=0, noise_level=0.0)
    transmitted0 = ch0.transmit(states)
    detected0 = sum(1 for s in transmitted0 if s.get("detected", False))
    detection_rate_0 = detected0 / n
    assert 0.70 < detection_rate_0 < 1.0, (
        f"0km detection rate: expected 0.70-1.0, got {detection_rate_0:.3f}"
    )

    ch50 = QuantumChannel(distance_km=50, noise_level=0.0)
    transmitted50 = ch50.transmit(states)
    detected50 = sum(1 for s in transmitted50 if s.get("detected", False))
    detection_rate_50 = detected50 / n
    assert detection_rate_50 < detection_rate_0, (
        f"50km ({detection_rate_50:.3f}) should be lower than 0km ({detection_rate_0:.3f})"
    )


def test_eve_intercept():
    """no Eve: 0 intercepted; full Eve: all intercepted."""
    alice = Alice()
    n = 2000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)

    eve_none = Eve("intercept_resend", attack_prob=0.0)
    eve_states_none = eve_none.intercept(ch_states)
    intercepted_none = sum(1 for s in eve_states_none if s.get("intercepted", False))
    assert intercepted_none == 0, (
        f"No Eve should intercept 0 photons, got {intercepted_none}"
    )

    eve_full = Eve("intercept_resend", attack_prob=1.0)
    eve_states_full = eve_full.intercept(ch_states)
    intercepted_full = sum(1 for s in eve_states_full if s.get("intercepted", False))
    assert intercepted_full == n, (
        f"Full Eve should intercept all {n} photons, got {intercepted_full}"
    )


def test_bob_measurement():
    """4 measurements, bob_basis present."""
    alice = Alice()
    states = alice.encode_states(np.array([0, 1, 0, 1]), np.array(["+", "+", "x", "x"]))
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    eve = Eve("intercept_resend", attack_prob=0.0)
    eve_states = eve.intercept(ch_states)
    bob = Bob()
    measured = bob.measure(eve_states)
    assert len(measured) == 4, f"Expected 4 measurements, got {len(measured)}"
    for m in measured:
        assert "bob_basis" in m, "Measurement missing bob_basis"


def test_protocol_sifting():
    """sifted_count > 0 and <= n."""
    alice = Alice()
    n = 1000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    eve = Eve("intercept_resend", attack_prob=0.0)
    eve_states = eve.intercept(ch_states)
    bob = Bob()
    measured = bob.measure(eve_states)
    protocol = BB84Protocol()
    sift = protocol.sift(measured)
    assert "sifted_count" in sift, "Sift result missing sifted_count"
    assert sift["sifted_count"] > 0, "Should have sifted some bits"
    assert sift["sifted_count"] <= n, (
        f"Sifted count {sift['sifted_count']} exceeds total {n}"
    )


def test_comprehensive_qber_no_eve():
    """QBER < 0.02 (n=5000)."""
    alice = Alice()
    n = 5000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    eve = Eve("intercept_resend", attack_prob=0.0)
    eve_states = eve.intercept(ch_states)
    bob = Bob()
    measured = bob.measure(eve_states)
    protocol = BB84Protocol()
    sift = protocol.sift(measured)
    qber = protocol.estimate_qber(sift)
    assert qber["qber"] < 0.02, (
        f"Comprehensive QBER no Eve: expected <0.02, got {qber['qber']:.4f}"
    )


def test_comprehensive_qber_full_eve():
    """0.20 <= QBER <= 0.30 (n=5000)."""
    alice = Alice()
    n = 5000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    eve = Eve("intercept_resend", attack_prob=1.0)
    eve_states = eve.intercept(ch_states)
    bob = Bob()
    measured = bob.measure(eve_states)
    protocol = BB84Protocol()
    sift = protocol.sift(measured)
    qber = protocol.estimate_qber(sift)
    assert 0.20 <= qber["qber"] <= 0.30, (
        f"Comprehensive QBER full Eve: expected 0.20-0.30, got {qber['qber']:.4f}"
    )


def test_skr_calculation():
    """threshold=0, good>0, bad=0."""
    skr_threshold = compute_skr(1000, 5000, 0.11)
    assert skr_threshold == 0.0, f"SKR at 11% QBER should be 0, got {skr_threshold}"
    skr_good = compute_skr(1000, 5000, 0.05)
    assert skr_good > 0, f"SKR at 5% QBER should be positive, got {skr_good}"
    skr_bad = compute_skr(1000, 5000, 0.15)
    assert skr_bad == 0.0, f"SKR at 15% QBER should be 0, got {skr_bad}"


def test_binary_entropy_comprehensive():
    """H(0)==0, H(1)==0, H(0.5)~1, symmetry."""
    assert binary_entropy(0.0) == 0.0, "H(0) should be 0"
    assert binary_entropy(1.0) == 0.0, "H(1) should be 0"
    assert abs(binary_entropy(0.5) - 1.0) < 0.001, "H(0.5) should be ~1"
    assert abs(binary_entropy(0.3) - binary_entropy(0.7)) < 0.001, "H should be symmetric"


def test_efficiency_calculation():
    """100% sifted -> 1.0 or 100.0, 50% -> 0.5 or 50.0."""
    eff_full = compute_efficiency(1000, 1000)
    assert eff_full == 1.0 or eff_full == 100.0, (
        f"100% sifted should give 100% efficiency, got {eff_full}"
    )
    eff_half = compute_efficiency(500, 1000)
    assert eff_half == 0.5 or eff_half == 50.0, (
        f"50% sifted should give 50% efficiency, got {eff_half}"
    )


def test_wcp_model_comprehensive():
    """photon counts len==n, mean~mu, classify_pulses has vacuum/single/multi."""
    rng = np.random.default_rng(42)
    n = 1000
    mu = 0.2
    photon_counts = poisson_photon_counts(n, mu, rng)
    assert len(photon_counts) == n, f"Expected {n} counts, got {len(photon_counts)}"
    assert all(c >= 0 for c in photon_counts), "Photon counts must be non-negative"
    mean_count = np.mean(photon_counts)
    assert 0.15 < mean_count < 0.25, (
        f"Mean photon count should be ~{mu}, got {mean_count:.4f}"
    )
    stats = classify_pulses(photon_counts)
    assert "vacuum_count" in stats, "Missing vacuum_count in classify_pulses"
    assert "single_count" in stats, "Missing single_count in classify_pulses"
    assert "multi_count" in stats, "Missing multi_count in classify_pulses"


def test_decoy_state_comprehensive():
    """intensities len==n, all in [0,1], multiple unique values."""
    rng = np.random.default_rng(42)
    n = 1000
    intensities = assign_decoy_intensities(n, rng)
    assert len(intensities) == n, f"Expected {n} intensities, got {len(intensities)}"
    assert all(0 <= i <= 1 for i in intensities), "Intensities must be in [0, 1]"
    unique_intensities = len(set(np.round(intensities, 2)))
    assert unique_intensities > 1, "Should have multiple intensity levels"


def test_pns_attack_comprehensive():
    """attacked_states len preserved, pns_stats has blocked_single/split_multi."""
    alice = Alice()
    n = 1000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    eve = Eve("intercept_resend", attack_prob=0.0)
    eve_states = eve.intercept(ch_states)
    rng = np.random.default_rng(42)
    pns = PNSAttack(p_block=0.1, p_split=0.5)
    attacked_states, pns_stats = pns.attack(eve_states, rng)
    assert len(attacked_states) == len(eve_states), (
        f"PNS attack should preserve state count: {len(attacked_states)} != {len(eve_states)}"
    )
    assert "blocked_single" in pns_stats, "Missing blocked_single in pns_stats"
    assert "split_multi" in pns_stats, "Missing split_multi in pns_stats"


# ===========================================================================
# 2.3 - test_qber_no_eve_baseline
# ===========================================================================

@pytest.mark.fast
def test_qber_no_eve_baseline():
    """5 trials, mean QBER < 0.02 at 0km, no noise, no Eve. Seed=42."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=0, noise_level=0.0,
        attack_prob=0.0, attack_strategy="intercept_resend", seed=42
    )
    assert trial.mean_qber < 0.02, (
        f"QBER baseline failed: params=(n_bits=5000, distance_km=0, noise=0.0, attack_prob=0.0), "
        f"measured={trial.mean_qber:.4f}, expected<0.02, std={trial.std_qber:.4f}, n_trials={trial.n_trials}"
    )


# ===========================================================================
# 2.4 - test_qber_noise_only
# ===========================================================================

@pytest.mark.fast
def test_qber_noise_only():
    """5 trials, mean QBER ~ 0.05 +/- 0.03 at noise_level=0.05, no Eve."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=0, noise_level=0.05,
        attack_prob=0.0, attack_strategy="intercept_resend", seed=42
    )
    noise_level = 0.05
    assert abs(trial.mean_qber - noise_level) <= 0.03, (
        f"QBER noise-only failed: params=(noise_level={noise_level}), "
        f"measured={trial.mean_qber:.4f}, expected={noise_level}+/-0.03, std={trial.std_qber:.4f}"
    )


# ===========================================================================
# 2.5 - test_qber_full_eve
# ===========================================================================

@pytest.mark.fast
def test_qber_full_eve():
    """5 trials, mean QBER ~ 0.25 +/- 0.03 at attack_prob=1.0."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=0, noise_level=0.0,
        attack_prob=1.0, attack_strategy="intercept_resend", seed=42
    )
    assert abs(trial.mean_qber - 0.25) <= 0.03, (
        f"QBER full Eve failed: measured={trial.mean_qber:.4f}, expected=0.25+/-0.03, std={trial.std_qber:.4f}"
    )


# ===========================================================================
# 2.6 - test_qber_half_eve
# ===========================================================================

@pytest.mark.fast
def test_qber_half_eve():
    """5 trials, mean QBER ~ 0.125 +/- 0.03 at attack_prob=0.5."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=0, noise_level=0.0,
        attack_prob=0.5, attack_strategy="intercept_resend", seed=42
    )
    assert abs(trial.mean_qber - 0.125) <= 0.03, (
        f"QBER half Eve failed: measured={trial.mean_qber:.4f}, expected=0.125+/-0.03, std={trial.std_qber:.4f}"
    )


# ===========================================================================
# 2.7 - test_threshold_breach_sets_skr_zero
# ===========================================================================

@pytest.mark.fast
def test_threshold_breach_sets_skr_zero():
    """QBER >= 0.11 -> SKR=0, threshold_breached=True."""
    result = run_pipeline(
        n_bits=5000, distance_km=0, noise_level=0.0,
        attack_prob=1.0, attack_strategy="intercept_resend", seed=42
    )
    if result.threshold_breached:
        assert result.skr == 0.0, (
            f"threshold_breach_sets_skr_zero: threshold_breached=True but SKR={result.skr:.6f}, expected=0.0"
        )
    from core.metrics import compute_skr
    assert compute_skr(1000, 5000, 0.11) == 0.0
    assert compute_skr(1000, 5000, 0.15) == 0.0
    assert compute_skr(1000, 5000, 0.50) == 0.0


# ===========================================================================
# 2.8 - test_below_threshold_skr_positive
# ===========================================================================

@pytest.mark.fast
def test_below_threshold_skr_positive():
    """QBER < 0.11 -> SKR > 0."""
    result = run_pipeline(
        n_bits=5000, distance_km=0, noise_level=0.0,
        attack_prob=0.0, attack_strategy="intercept_resend", seed=42
    )
    if not result.threshold_breached:
        assert result.skr > 0.0, (
            f"below_threshold_skr_positive: QBER={result.qber:.4f}<0.11 but SKR={result.skr:.6f}, expected>0"
        )
    from core.metrics import compute_skr
    assert compute_skr(1000, 5000, 0.05) > 0.0
    assert compute_skr(1000, 5000, 0.0) > 0.0


# ===========================================================================
# 2.9 - test_channel_attenuation_0km
# ===========================================================================

@pytest.mark.fast
def test_channel_attenuation_0km():
    """Detection rate ~ 0.85 +/- 0.05 at 0km."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=0, noise_level=0.0,
        attack_prob=0.0, attack_strategy="intercept_resend", seed=42
    )
    mean_survival = sum(r.survival_fraction for r in trial.raw_results) / trial.n_trials
    assert abs(mean_survival - 0.85) <= 0.05, (
        f"channel_attenuation_0km: survival_fraction={mean_survival:.4f}, expected=0.85+/-0.05"
    )


# ===========================================================================
# 2.10 - test_channel_attenuation_50km
# ===========================================================================

@pytest.mark.fast
def test_channel_attenuation_50km():
    """Survival fraction ~ 0.10 +/- 0.03 at 50km."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=50, noise_level=0.0,
        attack_prob=0.0, attack_strategy="intercept_resend", seed=42
    )
    mean_survival = sum(r.survival_fraction for r in trial.raw_results) / trial.n_trials
    assert abs(mean_survival - 0.10) <= 0.03, (
        f"channel_attenuation_50km: survival_fraction={mean_survival:.4f}, expected=0.10+/-0.03"
    )


# ===========================================================================
# 2.11 - test_channel_attenuation_100km
# ===========================================================================

@pytest.mark.fast
def test_channel_attenuation_100km():
    """Survival fraction ~ 0.01 +/- 0.02 at 100km."""
    trial = run_pipeline_trials(
        n_trials=5, n_bits=5000, distance_km=100, noise_level=0.0,
        attack_prob=0.0, attack_strategy="intercept_resend", seed=42
    )
    mean_survival = sum(r.survival_fraction for r in trial.raw_results) / trial.n_trials
    assert abs(mean_survival - 0.01) <= 0.02, (
        f"channel_attenuation_100km: survival_fraction={mean_survival:.4f}, expected=0.01+/-0.02"
    )


# ===========================================================================
# 2.12 - test_channel_monotonic_attenuation
# ===========================================================================

@pytest.mark.slow
def test_channel_monotonic_attenuation():
    """sifted_key_length non-increasing over [0, 10, 50, 100] km."""
    distances = [0, 10, 50, 100]
    mean_sifted = []
    for d in distances:
        trial = run_pipeline_trials(
            n_trials=5, n_bits=5000, distance_km=d, noise_level=0.0,
            attack_prob=0.0, attack_strategy="intercept_resend", seed=42
        )
        mean_sifted.append(trial.mean_sifted_key_length)
    for i in range(len(mean_sifted) - 1):
        assert mean_sifted[i] >= mean_sifted[i + 1], (
            f"channel_monotonic_attenuation: sifted not non-increasing at distances "
            f"{distances[i]}km->{distances[i+1]}km: "
            f"{mean_sifted[i]:.1f} >= {mean_sifted[i+1]:.1f} failed"
        )


# ===========================================================================
# 2.13 - test_p_survive_formula
# ===========================================================================

@pytest.mark.fast
def test_p_survive_formula():
    """channel.p_survive == 10^(-0.2*d/10) for d in [0, 10, 50, 100]."""
    for d in [0, 10, 50, 100]:
        ch = QuantumChannel(distance_km=d, noise_level=0.0)
        expected = 10 ** (-0.2 * d / 10)
        assert abs(ch.p_survive - expected) < 1e-10, (
            f"p_survive_formula: d={d}km, p_survive={ch.p_survive:.8f}, expected={expected:.8f}"
        )


# ===========================================================================
# 2.14 - Binary entropy tests (4 functions)
# ===========================================================================

@pytest.mark.fast
def test_binary_entropy_zero():
    assert binary_entropy(0.0) == 0.0, "H(0.0) should be exactly 0.0"
    assert binary_entropy(1.0) == 0.0, "H(1.0) should be exactly 0.0"


@pytest.mark.fast
def test_binary_entropy_half():
    assert binary_entropy(0.5) == 1.0, f"H(0.5) should be exactly 1.0, got {binary_entropy(0.5)}"


@pytest.mark.fast
def test_binary_entropy_threshold():
    h_threshold = binary_entropy(0.11)
    assert abs(h_threshold - 0.5) <= 0.01, (
        f"H(0.11) should be ~0.5+/-0.01, got {h_threshold:.6f}"
    )


@pytest.mark.fast
def test_binary_entropy_symmetry():
    for q in [0.1, 0.2, 0.3, 0.4]:
        assert abs(binary_entropy(q) - binary_entropy(1 - q)) < 1e-10, (
            f"H({q}) != H({1-q}): {binary_entropy(q):.10f} vs {binary_entropy(1-q):.10f}"
        )


# ===========================================================================
# 2.15 - SKR tests (4 functions)
# ===========================================================================

@pytest.mark.fast
def test_skr_at_threshold():
    assert compute_skr(1000, 5000, 0.11) == 0.0, "SKR at QBER=0.11 should be 0.0"


@pytest.mark.fast
def test_skr_below_threshold():
    sifted, raw, qber = 1000, 5000, 0.05
    expected = (sifted / raw) * (1 - 2 * binary_entropy(qber))
    measured = compute_skr(sifted, raw, qber)
    assert abs(measured - expected) <= 0.01, (
        f"SKR below threshold: measured={measured:.6f}, expected={expected:.6f}+/-0.01"
    )


@pytest.mark.fast
def test_skr_above_threshold_range():
    for qber in [0.11, 0.15, 0.20, 0.30, 0.50]:
        assert compute_skr(1000, 5000, qber) == 0.0, (
            f"SKR should be 0 for QBER={qber}, got {compute_skr(1000, 5000, qber)}"
        )


@pytest.mark.fast
def test_skr_positive_range():
    for qber in [0.0, 0.01, 0.05, 0.09, 0.109]:
        skr = compute_skr(1000, 5000, qber)
        assert skr > 0.0, (
            f"SKR should be >0 for QBER={qber}, got {skr}"
        )
'''

with open('tests/test_physics_benchmarks.py', 'wb') as f:
    f.write(content)
print('wrote', len(content), 'bytes')
