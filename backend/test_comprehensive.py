"""
Comprehensive physics and functionality tests for BB84 QKD Simulator.
Tests all core modules to ensure physics accuracy and system integrity.

Run with: python test_comprehensive.py (from backend directory with venv active)
"""

import sys
import numpy as np
from core.alice import Alice
from core.bob import Bob
from core.channel import QuantumChannel
from core.eve import Eve
from core.protocol import BB84Protocol
from core.metrics import compute_skr, binary_entropy, compute_efficiency
from core.constants import BASES, STATE_LABELS, POLARIZATION_ANGLES
from core.wcp import poisson_photon_counts, classify_pulses, apply_wcp_to_states
from core.decoy import assign_decoy_intensities, compute_gains, detect_pns_attack
from core.pns import PNSAttack, compute_pns_security

def test_alice_generation():
    """Test Alice bit and basis generation."""
    print("\n[TEST 1] Alice bit and basis generation...")
    alice = Alice()
    n = 1000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    
    assert len(bits) == n, f"Expected {n} bits, got {len(bits)}"
    assert len(bases) == n, f"Expected {n} bases, got {len(bases)}"
    assert all(b in [0, 1] for b in bits), "Bits must be 0 or 1"
    assert all(b in ['+', 'x'] for b in bases), "Bases must be '+' or 'x'"
    
    # Check distribution (should be roughly 50/50)
    bit_mean = np.mean(bits)
    base_plus_ratio = sum(1 for b in bases if b == '+') / n
    assert 0.4 < bit_mean < 0.6, f"Bit distribution skewed: {bit_mean}"
    assert 0.4 < base_plus_ratio < 0.6, f"Basis distribution skewed: {base_plus_ratio}"
    print("  [PASS] Alice generation")

def test_alice_encoding():
    """Test Alice state encoding."""
    print("[TEST 2] Alice state encoding...")
    alice = Alice()
    bits = np.array([0, 1, 0, 1])
    bases = np.array(['+', '+', 'x', 'x'])
    states = alice.encode_states(bits, bases)
    
    assert len(states) == 4, f"Expected 4 states, got {len(states)}"
    for i, state in enumerate(states):
        assert 'alice_bit' in state
        assert 'alice_basis' in state
        assert 'polarization_angle' in state
        assert state['alice_bit'] == bits[i]
        assert state['alice_basis'] == bases[i]
    print("  [PASS] Alice encoding: PASS")

def test_channel_transmission():
    """Test quantum channel transmission with attenuation."""
    print("[TEST 3] Channel transmission and attenuation...")
    alice = Alice()
    
    # Test at 0km with large sample (detector efficiency varies)
    ch0 = QuantumChannel(distance_km=0, noise_level=0.0)
    n_large = 1000
    large_states = alice.encode_states(np.random.randint(0, 2, n_large), np.random.choice(['+', 'x'], n_large))
    transmitted0 = ch0.transmit(large_states)
    detected0 = sum(1 for s in transmitted0 if s.get('detected', False))
    detection_rate = detected0 / n_large
    assert 0.70 < detection_rate < 1.0, f"At 0km, expected reasonable detection rate, got {detection_rate*100:.1f}%"
    
    # Test at 50km (should have lower survival)
    ch50 = QuantumChannel(distance_km=50, noise_level=0.0)
    transmitted50 = ch50.transmit(large_states)
    detected50 = sum(1 for s in transmitted50 if s.get('detected', False))
    survival_rate = detected50 / n_large
    assert survival_rate < detection_rate, f"50km should have lower survival than 0km"
    print(f"  [PASS] Channel transmission: PASS (0km: {detection_rate*100:.1f}%, 50km: {survival_rate*100:.1f}%)")

def test_eve_intercept():
    """Test Eve interception strategies."""
    print("[TEST 4] Eve interception strategies...")
    alice = Alice()
    n = 2000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    
    # Test no Eve
    eve_none = Eve('intercept_resend', attack_prob=0.0)
    eve_states_none = eve_none.intercept(ch_states)
    intercepted_none = sum(1 for s in eve_states_none if s.get('intercepted', False))
    assert intercepted_none == 0, f"No Eve should intercept 0 photons, got {intercepted_none}"
    
    # Test full Eve
    eve_full = Eve('intercept_resend', attack_prob=1.0)
    eve_states_full = eve_full.intercept(ch_states)
    intercepted_full = sum(1 for s in eve_states_full if s.get('intercepted', False))
    assert intercepted_full == n, f"Full Eve should intercept all {n} photons, got {intercepted_full}"
    print("  [PASS] Eve interception: PASS")

def test_bob_measurement():
    """Test Bob measurement."""
    print("[TEST 5] Bob measurement...")
    alice = Alice()
    states = alice.encode_states(np.array([0, 1, 0, 1]), np.array(['+', '+', 'x', 'x']))
    
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    
    eve = Eve('intercept_resend', attack_prob=0.0)
    eve_states = eve.intercept(ch_states)
    
    bob = Bob()
    measured = bob.measure(eve_states)
    
    assert len(measured) == 4, f"Expected 4 measurements, got {len(measured)}"
    for m in measured:
        assert 'bob_basis' in m
        assert 'bob_bit' in m or m['bob_bit'] is None
    print("  [PASS] Bob measurement: PASS")

def test_protocol_sifting():
    """Test BB84 protocol sifting."""
    print("[TEST 6] BB84 protocol sifting...")
    alice = Alice()
    n = 1000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    
    eve = Eve('intercept_resend', attack_prob=0.0)
    eve_states = eve.intercept(ch_states)
    
    bob = Bob()
    measured = bob.measure(eve_states)
    
    protocol = BB84Protocol()
    sift = protocol.sift(measured)
    
    assert 'sifted_count' in sift, "Sift result missing sifted_count"
    assert sift['sifted_count'] > 0, "Should have sifted some bits"
    assert sift['sifted_count'] <= n, f"Sifted count {sift['sifted_count']} exceeds total {n}"
    print(f"  [PASS] Protocol sifting: PASS (sifted {sift['sifted_count']}/{n} bits)")

def test_qber_no_eve():
    """Test QBER with no Eve (should be 0-2%)."""
    print("[TEST 7] QBER with no Eve (expect 0-2%)...")
    alice = Alice()
    n = 5000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    
    eve = Eve('intercept_resend', attack_prob=0.0)
    eve_states = eve.intercept(ch_states)
    
    bob = Bob()
    measured = bob.measure(eve_states)
    
    protocol = BB84Protocol()
    sift = protocol.sift(measured)
    qber = protocol.estimate_qber(sift)
    
    assert qber['qber'] < 0.02, f"QBER without Eve should be <2%, got {qber['qber']*100:.2f}%"
    print(f"  [PASS] QBER no Eve: PASS ({qber['qber']*100:.2f}%)")

def test_qber_full_eve():
    """Test QBER with full Eve (should be 23-27% but allow variance)."""
    print("[TEST 8] QBER with full Eve (expect 23-27%)...")
    alice = Alice()
    n = 5000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    
    eve = Eve('intercept_resend', attack_prob=1.0)
    eve_states = eve.intercept(ch_states)
    
    bob = Bob()
    measured = bob.measure(eve_states)
    
    protocol = BB84Protocol()
    sift = protocol.sift(measured)
    qber = protocol.estimate_qber(sift)
    
    # Allow wider range due to randomness
    assert 0.20 <= qber['qber'] <= 0.30, f"QBER with full Eve should be 20-30%, got {qber['qber']*100:.2f}%"
    print(f"  [PASS] QBER full Eve: PASS ({qber['qber']*100:.2f}%)")

def test_skr_calculation():
    """Test SKR calculation."""
    print("[TEST 9] SKR calculation...")
    
    # At threshold (11% QBER), SKR should be 0
    skr_threshold = compute_skr(1000, 5000, 0.11)
    assert skr_threshold == 0.0, f"SKR at 11% QBER should be 0, got {skr_threshold}"
    
    # Below threshold (5% QBER), SKR should be positive
    skr_good = compute_skr(1000, 5000, 0.05)
    assert skr_good > 0, f"SKR at 5% QBER should be positive, got {skr_good}"
    
    # Above threshold (15% QBER), SKR should be 0
    skr_bad = compute_skr(1000, 5000, 0.15)
    assert skr_bad == 0.0, f"SKR at 15% QBER should be 0, got {skr_bad}"
    
    print(f"  [PASS] SKR calculation: PASS (threshold=0, good={skr_good:.6f}, bad=0)")

def test_binary_entropy():
    """Test binary entropy function."""
    print("[TEST 10] Binary entropy function...")
    
    assert binary_entropy(0.0) == 0.0, "H(0) should be 0"
    assert binary_entropy(1.0) == 0.0, "H(1) should be 0"
    assert abs(binary_entropy(0.5) - 1.0) < 0.001, "H(0.5) should be 1"
    
    # Entropy should be symmetric
    assert abs(binary_entropy(0.3) - binary_entropy(0.7)) < 0.001, "H should be symmetric"
    
    print("  [PASS] Binary entropy: PASS")

def test_efficiency():
    """Test efficiency calculation."""
    print("[TEST 11] Efficiency calculation...")
    
    # 100% sifted should give 100% efficiency (or 100.0 if percentage)
    eff_full = compute_efficiency(1000, 1000)
    assert eff_full == 1.0 or eff_full == 100.0, f"100% sifted should give 100% efficiency, got {eff_full}"
    
    # 50% sifted should give 50% efficiency
    eff_half = compute_efficiency(500, 1000)
    assert eff_half == 0.5 or eff_half == 50.0, f"50% sifted should give 50% efficiency, got {eff_half}"
    
    print("  [PASS] Efficiency calculation: PASS")

def test_wcp_model():
    """Test Weak Coherent Pulse model."""
    print("[TEST 12] WCP model...")
    
    rng = np.random.default_rng(42)
    n = 1000
    mu = 0.2
    
    photon_counts = poisson_photon_counts(n, mu, rng)
    assert len(photon_counts) == n, f"Expected {n} counts, got {len(photon_counts)}"
    assert all(c >= 0 for c in photon_counts), "Photon counts must be non-negative"
    
    # Mean should be close to mu
    mean_count = np.mean(photon_counts)
    assert 0.15 < mean_count < 0.25, f"Mean photon count should be ~{mu}, got {mean_count}"
    
    stats = classify_pulses(photon_counts)
    assert 'vacuum_count' in stats and 'single_count' in stats and 'multi_count' in stats, "Missing pulse classifications"
    
    print(f"  [PASS] WCP model: PASS (mean={mean_count:.3f}, vacuum={stats['vacuum_count']}, single={stats['single_count']}, multi={stats['multi_count']})")

def test_decoy_state():
    """Test decoy state protocol."""
    print("[TEST 13] Decoy state protocol...")
    
    rng = np.random.default_rng(42)
    n = 1000
    
    intensities = assign_decoy_intensities(n, rng)
    assert len(intensities) == n, f"Expected {n} intensities, got {len(intensities)}"
    assert all(0 <= i <= 1 for i in intensities), "Intensities must be in [0, 1]"
    
    # Should have mix of intensities
    unique_intensities = len(set(np.round(intensities, 2)))
    assert unique_intensities > 1, "Should have multiple intensity levels"
    
    print(f"  [PASS] Decoy state: PASS (unique intensities: {unique_intensities})")

def test_pns_attack():
    """Test PNS attack simulation."""
    print("[TEST 14] PNS attack...")
    
    alice = Alice()
    n = 1000
    bits = alice.generate_bits(n)
    bases = alice.choose_bases(n)
    states = alice.encode_states(bits, bases)
    
    channel = QuantumChannel(distance_km=0, noise_level=0.0)
    ch_states = channel.transmit(states)
    
    eve = Eve('intercept_resend', attack_prob=0.0)
    eve_states = eve.intercept(ch_states)
    
    rng = np.random.default_rng(42)
    pns = PNSAttack(p_block=0.1, p_split=0.5)
    attacked_states, pns_stats = pns.attack(eve_states, rng)
    
    assert len(attacked_states) == len(eve_states), "PNS attack should preserve state count"
    assert 'blocked_single' in pns_stats and 'split_multi' in pns_stats, "Missing PNS statistics"
    
    print(f"  [PASS] PNS attack: PASS (blocked={pns_stats['blocked_single']}, split={pns_stats['split_multi']})")

def run_all_tests():
    """Run all tests."""
    print("=" * 60)
    print("BB84 QKD SIMULATOR - COMPREHENSIVE TEST SUITE")
    print("=" * 60)
    
    tests = [
        test_alice_generation,
        test_alice_encoding,
        test_channel_transmission,
        test_eve_intercept,
        test_bob_measurement,
        test_protocol_sifting,
        test_qber_no_eve,
        test_qber_full_eve,
        test_skr_calculation,
        test_binary_entropy,
        test_efficiency,
        test_wcp_model,
        test_decoy_state,
        test_pns_attack,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"  [FAIL] FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"  [FAIL] ERROR: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
