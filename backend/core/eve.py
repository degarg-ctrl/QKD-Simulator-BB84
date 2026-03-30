"""
backend/core/eve.py

Eve (eavesdropper) module for BB84 QKD Simulator.
Implements intercept-resend attack on the quantum channel.

CRITICAL PHYSICS — intercept-resend attack mechanics:
When Eve intercepts a photon:
1. She randomly chooses a measurement basis (+) or (x), prob 0.5 each
2. She measures — this collapses the quantum state
3. She re-emits a NEW photon in her measured state toward Bob
4. If Eve's basis == Alice's basis: she gets the right bit, Bob unaffected
5. If Eve's basis != Alice's basis: her measurement is random (0 or 1, 50/50)
   Bob then measures Eve's re-emitted photon, which may disagree with Alice
   This introduces exactly 25% errors in the sifted key when attack_prob=1.0

Physics reference: PHYSICS_CONTRACT.md Section 5
"""

import numpy as np
from typing import Literal
from core.constants import BASES, POLARIZATION_ANGLES, STATE_LABELS

class Eve:
    """
    Represents Eve, the eavesdropper in the BB84 protocol.
    
    Supported attack strategies:
    - intercept_resend: intercepts each photon with attack_prob,
      measures in random basis, re-emits toward Bob
    - partial: same as intercept_resend but only on a random 
      subset of photons determined by attack_prob
    - burst: intercepts a contiguous block of photons 
      (first attack_prob fraction of the stream)
    """

    def __init__(
        self,
        attack_strategy: Literal['intercept_resend', 'partial', 'burst'],
        attack_prob: float
    ):
        """
        Args:
            attack_strategy: which attack Eve performs
            attack_prob: probability/fraction of photons intercepted (0-1)
        """
        self.attack_strategy = attack_strategy
        self.attack_prob = float(attack_prob)

    def _intercept_single(self, state: dict) -> dict:
        """
        Perform intercept-resend on a single photon.
        
        Steps per PHYSICS_CONTRACT Section 5:
        1. Eve randomly chooses basis from BASES with equal probability
        2. If eve_basis == state['basis']: 
           - Eve measures correctly, re-emits same state
        3. If eve_basis != state['basis']:
           - Eve measures random bit (0 or 1, equal probability)
           - Re-emits new photon encoded with (eve_basis, eve_bit)
        
        Returns:
            Modified state dict with added fields.
        """
        new_state = state.copy()
        eve_basis = np.random.choice(BASES)
        
        basis_mismatch = (eve_basis != state['basis'])
        
        if not basis_mismatch:
            # Basis match: Eve gets correct bit, state remains same
            eve_bit = state['bit']
        else:
            # Basis mismatch: Eve gets random bit, state collapses to Eve's basis
            eve_bit = np.random.randint(0, 2)
            key = (eve_basis, eve_bit)
            new_state['polarization_angle'] = float(POLARIZATION_ANGLES[key])
            new_state['state_label'] = STATE_LABELS[key]
            new_state['bit'] = int(eve_bit)
            new_state['basis'] = str(eve_basis)
            
        new_state.update({
            'intercepted': True,
            'eve_basis': eve_basis,
            'eve_bit': int(eve_bit),
            'basis_mismatch': basis_mismatch
        })
        
        return new_state

    def intercept(self, states: list[dict]) -> list[dict]:
        """
        Apply Eve's attack strategy to the photon stream.
        """
        n = len(states)
        if n == 0:
            return []

        intercepted_indices = np.zeros(n, dtype=bool)
        
        if self.attack_strategy in ['intercept_resend', 'partial']:
            intercepted_indices = np.random.random(n) < self.attack_prob
        elif self.attack_strategy == 'burst':
            num_intercept = int(np.floor(self.attack_prob * n))
            intercepted_indices[:num_intercept] = True
            
        result = []
        for i, state in enumerate(states):
            if intercepted_indices[i]:
                result.append(self._intercept_single(state))
            else:
                new_state = state.copy()
                new_state.update({
                    'intercepted': False,
                    'eve_basis': None,
                    'eve_bit': None,
                    'basis_mismatch': False
                })
                result.append(new_state)
                
        return result

# Depends on: core/constants.py
# Used by: simulation pipeline, after channel.py, before bob.py
