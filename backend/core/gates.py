"""
backend/core/gates.py

Quantum gate transformations for BB84 QKD Simulator.
Applied to photon states per lane after channel transmission,
before Bob's measurement.

All transformations conform to PHYSICS_CONTRACT.md Section 10.

Gates implemented:
  H  — Hadamard
  X  — Pauli-X (bit-flip)
  Y  — Pauli-Y (bit+phase flip)
  Z  — Pauli-Z (phase-flip)
  S  — Phase gate π/2
  T  — Phase gate π/4

Physics reference: PHYSICS_CONTRACT.md Section 10
"""

import numpy as np
from core.constants import POLARIZATION_ANGLES, STATE_LABELS, BASES

# Gate transformation lookup table
# Maps (gate_type, current_basis, current_bit)
# to (new_basis, new_bit, new_angle)
# Conforms exactly to PHYSICS_CONTRACT.md Section 10

GATE_TRANSFORMS = {
    'H': {
        ('+', 0): ('x', 0, 45),   # |0> → |+>
        ('+', 1): ('x', 1, 135),  # |1> → |->
        ('x', 0): ('+', 0, 0),    # |+> → |0>
        ('x', 1): ('+', 1, 90),   # |-> → |1>
    },
    'X': {
        ('+', 0): ('+', 1, 90),   # |0> → |1>
        ('+', 1): ('+', 0, 0),    # |1> → |0>
        ('x', 0): ('x', 0, 45),   # |+> → |+> invariant
        ('x', 1): ('x', 1, 135),  # |-> → |-> invariant
    },
    'Z': {
        ('+', 0): ('+', 0, 0),    # |0> → |0> unchanged
        ('+', 1): ('+', 1, 90),   # |1> → |1> unchanged
        ('x', 0): ('x', 1, 135),  # |+> → |->
        ('x', 1): ('x', 0, 45),   # |-> → |+>
    },
    'Y': {
        ('+', 0): ('+', 1, 90),   # |0> → |1>
        ('+', 1): ('+', 0, 0),    # |1> → |0>
        ('x', 0): ('x', 1, 135),  # |+> → |->
        ('x', 1): ('x', 0, 45),   # |-> → |+>
    },
    'S': {
        ('+', 0): ('+', 0, 0),    # unchanged
        ('+', 1): ('+', 1, 90),   # phase only
        ('x', 0): ('x', 0, 67),   # 45 + 22.5 = 67.5 rounded
        ('x', 1): ('x', 1, 112),  # 135 - 22.5 = 112.5 rounded
    },
    'T': {
        ('+', 0): ('+', 0, 0),    # unchanged
        ('+', 1): ('+', 1, 90),   # phase only
        ('x', 0): ('x', 0, 56),   # 45 + 11.25 = 56.25 rounded
        ('x', 1): ('x', 1, 124),  # 135 - 11.25 = 123.75 rounded
    },
}


def apply_gate(state: dict, gate_type: str) -> dict:
    """
    Apply a quantum gate transformation to a photon state.

    Modifies: bit, basis, state_label, polarization_angle
    Preserves: alice_bit, alice_basis, index, all channel fields

    Args:
        state: photon state dict from channel/eve pipeline
        gate_type: one of 'H','X','Y','Z','S','T'
    Returns:
        modified state dict with gate transformation applied

    Physics reference: PHYSICS_CONTRACT.md Section 10
    """
    # Implementation in Sprint 6
    pass


def apply_gates_to_lane(
    states: list[dict],
    lane_index: int,
    gates: list[dict]
) -> list[dict]:
    """
    Apply ordered list of gates to all photons on a specific lane.

    Gates apply left to right (position order).
    Only photons matching lane_index are affected.

    Args:
        states: full photon state list from eve.intercept()
        lane_index: which lane (0, 1, or 2)
        gates: list of gate dicts [{'type':'H','lane':0,'position':0.3}]
    Returns:
        state list with gate transformations applied to matching lane

    Physics reference: PHYSICS_CONTRACT.md Section 10
    """
    # Implementation in Sprint 6
    pass


# Depends on: core/constants.py
# Used by: routers/simulation.py in Sprint 6
