"""
backend/core/protocol.py

Classical post-processing for BB84 QKD Simulator.
Handles sifting, QBER estimation, and key extraction.

After quantum transmission, Alice and Bob communicate classically
(publicly) to compare which bases they used. They keep only the
bits where their bases matched — this is the sifted key.
A sample of the sifted key is then sacrificed to estimate QBER.

Physics reference: PHYSICS_CONTRACT.md Sections 1, 6
"""

import numpy as np
from typing import Optional
from core.constants import (
    QBER_SECURITY_THRESHOLD,
    SAMPLE_FRACTION_FOR_QBER,
    QBER_MIN_SAMPLE_SIZE,
    QBER_MIN_SIFTED_COUNT,
)
from core.rng import resolve_rng

class BB84Protocol:
    """
    Implements BB84 classical post-processing.
    
    Pipeline:
    1. sift()          → compare bases, discard mismatches
    2. estimate_qber() → sample sifted key, compute error rate
    3. extract_key()   → return remaining bits after QBER sampling

    The QBER sample shuffle uses the injected run-level ``rng`` so that
    a seeded simulation is fully reproducible; a private generator is
    used when omitted (audit fix H7).
    """

    def __init__(self, rng: Optional[np.random.Generator] = None):
        self.rng = resolve_rng(rng)

    def sift(self, measured_states: list[dict]) -> dict:
        """
        Perform basis sifting — the core of BB84 key agreement.
        
        Rules per PHYSICS_CONTRACT Section 1:
        - Only consider photons where measured=True
        - Keep photons where bob_basis == alice_basis
        - Discard all photons where bases do not match
        - Discard all photons where measured=False
        
        Args:
            measured_states: list of photon dicts from bob.measure()
        Returns:
            dict with sifting results and statistics.
        """
        sifted_states = []
        alice_bits = []
        bob_bits = []
        sifted_indices = []
        
        raw_count = len(measured_states)
        measured_count = sum(1 for p in measured_states if p.get('measured'))
        
        for i, state in enumerate(measured_states):
            # We compare Bob's basis with Alice's original basis
            alice_basis = state.get('alice_basis')
            
            if state.get('measured') and state.get('bob_basis') == alice_basis:
                sifted_states.append(state)
                # Ensure we use original alice bit for comparison
                alice_bit = state.get('alice_bit')
                
                alice_bits.append(alice_bit)
                bob_bits.append(state.get('bob_bit'))
                sifted_indices.append(i)
                
        sifted_count = len(sifted_states)
        sift_efficiency = sifted_count / measured_count if measured_count > 0 else 0.0
        
        return {
            'sifted_states': sifted_states,
            'alice_bits': alice_bits,
            'bob_bits': bob_bits,
            'sifted_indices': sifted_indices,
            'raw_count': raw_count,
            'sifted_count': sifted_count,
            'sift_efficiency': sift_efficiency
        }

    def estimate_qber(
        self,
        sift_result: dict,
        sample_fraction: float = SAMPLE_FRACTION_FOR_QBER
    ) -> dict:
        """
        Estimate QBER by sampling a fraction of the sifted key.

        Small-sample semantics (audit fix C1)
        -------------------------------------
        QBER is only reported when the sacrificed sample is large enough to
        be meaningful (>= QBER_MIN_SAMPLE_SIZE sampled sifted bits). When the
        sifted key is too short to yield such a sample, QBER is explicitly
        reported as NOT ESTIMATED:

            qber            = None
            qber_estimated  = False

        This replaces the previous behaviour where ``floor(0.10 * sifted_count)``
        could produce a zero-size sample and silently report ``qber = 0.0``
        with ``threshold_breached = False`` — which is scientifically
        misleading (an unmeasured key must not be presented as error-free).

        When the sample IS sufficient:

            qber            = errors_found / sample_size
            qber_estimated  = True

        No bits are sacrificed when QBER is not estimated.

        Physics reference: PHYSICS_CONTRACT.md Section 6.
        """
        sifted_count = sift_result['sifted_count']
        alice_bits = np.array(sift_result['alice_bits'])
        bob_bits = np.array(sift_result['bob_bits'])
        sifted_states = sift_result['sifted_states']

        # Insufficient-sample path: not enough sifted bits to form a
        # meaningful QBER sample. Report NOT ESTIMATED — never 0.0.
        if sifted_count < QBER_MIN_SIFTED_COUNT:
            return {
                'qber': None,
                'qber_estimated': False,
                'sample_size': 0,
                'errors_found': 0,
                'threshold_breached': False,
                # No sacrifice: without an estimate we keep every sifted bit.
                'remaining_states': list(sifted_states),
                'remaining_alice_bits': [int(b) for b in alice_bits],
                'remaining_bob_bits': [int(b) for b in bob_bits],
            }
            
        sample_size = int(np.floor(sample_fraction * sifted_count))
        indices = np.arange(sifted_count)
        self.rng.shuffle(indices)
        
        sample_indices = indices[:sample_size]
        remaining_indices = indices[sample_size:]
        
        sample_alice = alice_bits[sample_indices]
        sample_bob = bob_bits[sample_indices]
        
        errors_found = int(np.sum(sample_alice != sample_bob))
        qber = errors_found / sample_size if sample_size > 0 else 0.0
        
        threshold_breached = qber >= QBER_SECURITY_THRESHOLD
        
        remaining_states = [sifted_states[i] for i in remaining_indices]
        remaining_alice = [int(alice_bits[i]) for i in remaining_indices]
        remaining_bob = [int(bob_bits[i]) for i in remaining_indices]
        
        return {
            'qber': float(qber),
            'qber_estimated': True,
            'sample_size': sample_size,
            'errors_found': errors_found,
            'threshold_breached': threshold_breached,
            'remaining_states': remaining_states,
            'remaining_alice_bits': remaining_alice,
            'remaining_bob_bits': remaining_bob
        }

    def extract_key(self, qber_result: dict) -> dict:
        """
        Extract the final secure key from remaining sifted bits.

        When QBER could not be estimated (insufficient sample), security
        cannot be certified, so no key is extracted. This is distinct from a
        measured QBER below threshold — callers must not read "not estimated"
        as "error-free". (Audit fix C1.)
        """
        if not qber_result.get('qber_estimated', False):
            return {
                'key': [],
                'key_length': 0,
                'session_aborted': True,
                'abort_reason': (
                    "QBER not estimated (insufficient sifted-key sample)"
                )
            }

        if qber_result['threshold_breached']:
            return {
                'key': [],
                'key_length': 0,
                'session_aborted': True,
                'abort_reason': f"QBER {qber_result['qber']:.2%} exceeds threshold {QBER_SECURITY_THRESHOLD:.2%}"
            }
            
        key = qber_result['remaining_bob_bits']
        
        return {
            'key': key,
            'key_length': len(key),
            'session_aborted': False,
            'abort_reason': ""
        }

# Depends on: core/constants.py
# Used by: simulation pipeline, after bob.py, feeds into metrics.py
