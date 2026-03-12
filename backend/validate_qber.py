from core.alice import Alice
from core.channel import QuantumChannel
from core.eve import Eve
from core.bob import Bob
from core.protocol import BB84Protocol
import numpy as np
import sys

# Ensure backend directory is in path
import os
sys.path.append(os.getcwd())

n = 500000
alice = Alice()
bits = alice.generate_bits(n)
bases = alice.choose_bases(n)
states = alice.encode_states(bits, bases)

# Test 1: 0km, no noise, full Eve — must be 24-26%
ch = QuantumChannel(distance_km=0, noise_level=0.0)
ch_states = ch.transmit(states)
eve = Eve('intercept_resend', attack_prob=1.0)
eve_states = eve.intercept(ch_states)
bob = Bob()
measured = bob.measure(eve_states)
protocol = BB84Protocol()
sift = protocol.sift(measured)
qber = protocol.estimate_qber(sift)
print(f'Test 1 — 0km, no noise, full Eve:')
print(f'  QBER: {qber["qber"]:.4f} (MUST be 0.24-0.26)')

# Test 2: 10km, no noise, full Eve — must be 24-27%
ch10 = QuantumChannel(distance_km=10, noise_level=0.0)
ch_states10 = ch10.transmit(states)
eve_states10 = eve.intercept(ch_states10)
measured10 = bob.measure(eve_states10)
sift10 = protocol.sift(measured10)
qber10 = protocol.estimate_qber(sift10)
print(f'Test 2 — 10km, no noise, full Eve:')
print(f'  QBER: {qber10["qber"]:.4f} (MUST be 0.24-0.27)')

# Test 3: 0km, no noise, no Eve — must be ~0%
eve_none = Eve('intercept_resend', attack_prob=0.0)
eve_states_none = eve_none.intercept(ch_states)
measured_none = bob.measure(eve_states_none)
sift_none = protocol.sift(measured_none)
qber_none = protocol.estimate_qber(sift_none)
print(f'Test 3 — 0km, no noise, no Eve:')
print(f'  QBER: {qber_none["qber"]:.4f} (MUST be 0.00-0.02)')

# Test 4: verify alice_bit never modified by channel
dark_count_states = [p for p in ch_states10 if p.get('dark_count')]
if dark_count_states:
    sample = dark_count_states[0]
    has_dark_count_bit = 'dark_count_bit' in sample
    bit_unchanged = sample['bit'] == states[sample['index']]['bit']
    print(f'Test 4 — Dark count handling:')
    print(f'  dark_count_bit field exists: {has_dark_count_bit} (MUST be True)')
    print(f'  physical bit unchanged by dark count: {bit_unchanged} (MUST be True)')
else:
    print('Test 4 — No dark counts at 10km (increase n for better test)')
