from core.alice import Alice
from core.channel import QuantumChannel
from core.eve import Eve
from core.bob import Bob
from core.protocol import BB84Protocol
from core.metrics import compute_skr, binary_entropy

n = 20000
alice = Alice()
bits = alice.generate_bits(n)
bases = alice.choose_bases(n)
states = alice.encode_states(bits, bases)

# Test 1: No Eve, 0km — QBER must be 0-2%
ch = QuantumChannel(distance_km=0, noise_level=0.0)
ch_states = ch.transmit(states)
eve = Eve('intercept_resend', attack_prob=0.0)
eve_states = eve.intercept(ch_states)
bob = Bob()
measured = bob.measure(eve_states)
protocol = BB84Protocol()
sift = protocol.sift(measured)
qber1 = protocol.estimate_qber(sift)
print(f'Test 1 QBER (expect 0-2%): {qber1["qber"]:.4f}')
assert qber1['qber'] < 0.02, f'FAIL: {qber1["qber"]}'

# Test 2: Full Eve — QBER must be 23-27%
eve_full = Eve('intercept_resend', attack_prob=1.0)
eve_states2 = eve_full.intercept(ch_states)
measured2 = bob.measure(eve_states2)
sift2 = protocol.sift(measured2)
qber2 = protocol.estimate_qber(sift2)
print(f'Test 2 QBER (expect 23-27%): {qber2["qber"]:.4f}')
assert 0.23 <= qber2['qber'] <= 0.27, f'FAIL: {qber2["qber"]}'

# Test 3: SKR at threshold
skr = compute_skr(1000, 5000, 0.11)
print(f'Test 3 SKR at 11% (expect 0.0): {skr}')
assert skr == 0.0, f'FAIL: {skr}'

# Test 4: Binary entropy
assert binary_entropy(0.0) == 0.0
assert binary_entropy(0.5) == 1.0
print('Test 4 binary entropy: PASS')

print('ALL PHYSICS REGRESSION TESTS PASSED')
