"""
backend/core/alice.py

Alice module for BB84 QKD Simulator.
Alice is the sender. She generates random bits, selects random bases,
and encodes each bit as a quantum state (polarization) per BB84 rules.

Physics reference: PHYSICS_CONTRACT.md Sections 1, 2, 3
"""

import numpy as np
from core.constants import (
    BASES,
    STATE_LABELS,
    POLARIZATION_ANGLES
)

class Alice:
    """
    Represents Alice, the photon sender in the BB84 protocol.
    
    All encoding follows BB84 rules:
    - Rectilinear basis (+): |0> at 0deg, |1> at 90deg
    - Diagonal basis (x):    |+> at 45deg, |-> at 135deg
    """

    def generate_bits(self, n: int) -> np.ndarray:
        """
        Generate n random classical bits.
        Each bit is 0 or 1 with equal probability 0.5.
        These are the secret bits Alice wants to share with Bob.
        
        Args:
            n: number of bits to generate
        Returns:
            numpy array of n integers, each 0 or 1
        """
        return np.random.randint(0, 2, n)

    def choose_bases(self, n: int) -> np.ndarray:
        """
        Choose n random polarization bases.
        Each basis is '+' (rectilinear) or 'x' (diagonal)
        with equal probability 0.5 per PHYSICS_CONTRACT Section 1.
        
        Args:
            n: number of bases to choose
        Returns:
            numpy array of n strings, each '+' or 'x'
        """
        return np.random.choice(BASES, n)

    def encode_states(
        self, 
        bits: np.ndarray, 
        bases: np.ndarray
    ) -> list[dict]:
        """
        Encode each bit-basis pair into a quantum state dict.
        Uses STATE_LABELS and POLARIZATION_ANGLES from constants.
        
        Per PHYSICS_CONTRACT Section 2:
        (+', 0) -> |0>  at 0deg
        (+', 1) -> |1>  at 90deg
        ('x', 0) -> |+>  at 45deg
        ('x', 1) -> |->  at 135deg
        
        Args:
            bits:  numpy array of bits from generate_bits()
            bases: numpy array of bases from choose_bases()
        Returns:
            list of dicts, one per photon:
            {
              'index': int,
              'bit': int,
              'basis': str,
              'state_label': str,
              'polarization_angle': float
            }
        """
        states = []
        for i in range(len(bits)):
            bit = int(bits[i])
            basis = str(bases[i])
            key = (basis, bit)
            
            states.append({
                'index': i,
                'bit': bit,
                'basis': basis,
                'alice_bit': bit,
                'alice_basis': basis,
                'state_label': STATE_LABELS[key],
                'polarization_angle': float(POLARIZATION_ANGLES[key])
            })
        return states

    def encode_user_input(
        self,
        bits: list[int],
        bases: list[str]
    ) -> list[dict]:
        """
        Encode user-provided bits and bases into quantum states.
        
        Used for Exp 2 and Exp 4 where the user manually defines
        each photon's bit value and polarization basis.
        
        Applies the same BB84 encoding rules as encode_states()
        but uses user-provided values instead of random generation.
        
        Args:
            bits:  list of ints, each 0 or 1 (max 20)
            bases: list of str, each '+' or 'x' (max 20)
        Returns:
            list of state dicts identical in structure to
            encode_states() output — fully compatible with
            the rest of the BB84 pipeline
        
        Physics reference: PHYSICS_CONTRACT.md Section 2
        """
        import numpy as np
        bits_array = np.array(bits, dtype=int)
        bases_array = np.array(bases)
        return self.encode_states(bits_array, bases_array)

# Depends on: core/constants.py
# Used by: routers/simulation.py via the main BB84 pipeline
