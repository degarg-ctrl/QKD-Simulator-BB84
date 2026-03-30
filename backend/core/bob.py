"""
backend/core/bob.py

Bob module for BB84 QKD Simulator.
Bob is the receiver. He randomly selects a measurement basis for each
incoming photon and records the measured bit.

Critical physics — measurement rules per PHYSICS_CONTRACT Section 3:
- Correct basis (Bob == Alice): Bob measures the correct bit perfectly
- Wrong basis (Bob != Alice):   Bob gets a random bit (0 or 1, prob 0.5)
- Dark count photons:           Bob gets a random bit (no real state to measure)
- Lost photons:                 Bob records nothing (no measurement possible)
  UNLESS it was a dark count — dark counts produce a random bit regardless

Physics reference: PHYSICS_CONTRACT.md Sections 1, 2, 3
"""

import numpy as np
from core.constants import BASES, POLARIZATION_ANGLES, STATE_LABELS

class Bob:
    """
    Represents Bob, the photon receiver in the BB84 protocol.
    Bob measures each incoming photon in a randomly chosen basis.
    Only photons that were detected (detected=True) are measured.
    Lost photons with no dark count are skipped entirely.
    """

    def choose_bases(self, n: int) -> np.ndarray:
        """
        Choose n random measurement bases.
        Each basis is '+' or 'x' with equal probability 0.5.
        Independent of Alice's basis choices — Bob has no prior knowledge.
        
        Args:
            n: number of bases to choose
        Returns:
            numpy array of n strings, each '+' or 'x'
        """
        return np.random.choice(BASES, n)

    def measure(self, states: list[dict]) -> list[dict]:
        """
        Measure each detected photon in a randomly chosen basis.
        
        Processing rules per PHYSICS_CONTRACT Section 3:
        1. If state['detected'] is False (lost, no dark count):
           - Skip — Bob cannot measure what he did not receive
           - Add fields: bob_basis=None, bob_bit=None, measured=False
        
        2. If state['dark_count'] is True:
           - Bob detects a spurious photon with no real polarization
           - Bob still picks a random basis
           - Bob records a random bit (0 or 1, equal probability)
           - Add fields: bob_basis=random, bob_bit=random, measured=True
        
        3. If state['detected'] is True and dark_count is False:
           - Bob picks a random measurement basis
           - If bob_basis == state['basis']:
               bob_bit = state['bit']  (or eve_bit if intercepted)
           - If bob_basis != state['basis']:
               bob_bit = random (0 or 1, equal probability)
           - Add fields: bob_basis, bob_bit, measured=True
        
        IMPORTANT: When Eve has intercepted (state['intercepted']=True),
        the photon state has already been updated by Eve with her re-emitted
        polarization. Bob measures the RE-EMITTED state, not Alice's original.
        Use state['basis'] (already updated by Eve if intercepted) and
        state['bit'] (already updated by Eve if intercepted) for measurement.
        
        Args:
            states: list of photon dicts from eve.intercept() or 
                    channel.transmit() if no Eve
        Returns:
            list of dicts with all original fields plus:
            {
              'bob_basis': str or None,
              'bob_bit': int or None,
              'measured': bool
            }
        """
        n = len(states)
        if n == 0:
            return []
            
        bob_bases = self.choose_bases(n)
        measured_states = []
        
        # Pre-generate random bits for mismatches and dark counts to speed up
        random_bits = np.random.randint(0, 2, n)
        
        for i, state in enumerate(states):
            new_state = state.copy()
            bob_basis = str(bob_bases[i])
            
            if not state.get('detected', False):
                # Slot undetected (lost and no dark count)
                new_state.update({
                    'bob_basis': None,
                    'bob_bit': None,
                    'measured': False
                })
            elif state.get('dark_count', False):
                # Dark count trigger
                bob_bit = state.get('dark_count_bit', int(random_bits[i]))
                new_state.update({
                    'bob_basis': bob_basis,
                    'bob_bit': bob_bit,
                    'measured': True
                })
            else:
                # Real photon detection
                # Measure against state['basis'] which is the physical state at Bob
                if bob_basis == state['basis']:
                    bob_bit = state['bit']
                else:
                    bob_bit = random_bits[i]
                
                new_state.update({
                    'bob_basis': bob_basis,
                    'bob_bit': int(bob_bit),
                    'measured': True
                })
            
            measured_states.append(new_state)
            
        return measured_states

# Depends on: core/constants.py
# Used by: simulation pipeline, after eve.py
