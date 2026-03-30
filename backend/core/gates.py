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

    Looks up transformation in GATE_TRANSFORMS table.
    Updates bit, basis, state_label, polarization_angle.
    NEVER modifies alice_bit, alice_basis, or any channel fields.

    Args:
        state: photon state dict from channel/eve pipeline
        gate_type: one of 'H','X','Y','Z','S','T'
    Returns:
        modified state dict with gate transformation applied

    Physics reference: PHYSICS_CONTRACT.md Section 10
    """
    if gate_type not in GATE_TRANSFORMS:
        return state  # Unknown gate — pass through unchanged

    current_basis = state.get('basis', '+')
    current_bit = state.get('bit', 0)

    transform_key = (current_basis, current_bit)
    if transform_key not in GATE_TRANSFORMS[gate_type]:
        return state  # No transform defined — pass through

    new_basis, new_bit, new_angle = GATE_TRANSFORMS[gate_type][transform_key]

    new_state = state.copy()
    new_state['basis'] = new_basis
    new_state['bit'] = new_bit
    new_state['polarization_angle'] = float(new_angle)
    new_state['state_label'] = STATE_LABELS.get(
        (new_basis, new_bit),
        state.get('state_label', '|?>')
    )
    new_state['gate_applied'] = gate_type

    return new_state


def apply_gates_to_lane(
    states: list[dict],
    lane_index: int,
    gates: list[dict]
) -> list[dict]:
    """
    Apply ordered list of gates to photons on a specific lane.

    Gates sorted by position (left to right) and applied in order.
    Only photons where (state['index'] % 3 == lane_index) affected.
    Only detected photons are affected — lost photons pass through.

    Args:
        states: photon state list from eve.intercept()
        lane_index: which lane (0, 1, or 2)
        gates: list of gate dicts sorted by position
               [{'type':'H', 'lane':0, 'position':0.3}]
    Returns:
        state list with gate transformations applied

    Physics reference: PHYSICS_CONTRACT.md Section 10
    """
    if not gates:
        return states

    # Sort gates by position — apply left to right
    sorted_gates = sorted(gates, key=lambda g: g.get('position', 0))

    result = []
    for state in states:
        # Check if this photon is on the target lane
        photon_lane = state.get('index', 0) % 3
        if photon_lane != lane_index:
            result.append(state)
            continue

        # Skip lost photons — gates cannot affect them
        if not state.get('detected', True) and not state.get('dark_count', False):
            result.append(state)
            continue

        # Apply each gate in order
        current_state = state.copy()
        for gate in sorted_gates:
            current_state = apply_gate(current_state, gate.get('type', ''))

        result.append(current_state)

    return result

def apply_cloning_probe(
  states: list[dict],
  lane_index: int,
  probe_position: float
) -> list[dict]:
  """
  Apply No-Cloning Theorem probe to photons on a lane.
  
  Simulates Eve's CNOT-based cloning attempt.
  Per PHYSICS_CONTRACT.md Section 11:
  - Input: |psi>|0> — original photon + blank probe
  - Output: entangled state — neither copy equals |psi>
  - Effect: original photon polarization_angle randomized
  - QBER impact: adds ~25% error above baseline
  - Visual signal: sets 'cloning_probe_applied': True
                   sets 'lane_corrupted': True
  
  Only affects photons on lane_index that have been
  detected (not lost).
  
  Args:
      states: photon state list from eve.intercept()
      lane_index: which lane has the cloning probe
      probe_position: position of probe (0.0-1.0)
  Returns:
      state list with cloning probe effects applied
  
  Physics reference: PHYSICS_CONTRACT.md Section 11
  """
  import numpy as np
  
  result = []
  for state in states:
    photon_lane = state.get('index', 0) % 3
    if photon_lane != lane_index:
      result.append(state)
      continue
    
    # Skip lost photons
    if not state.get('detected', True) and \
       not state.get('dark_count', False):
      result.append(state)
      continue
    
    new_state = state.copy()
    
    # CNOT entanglement collapses the original state
    # Neither original nor clone retains |psi>
    # Effect: randomize the physical bit and angle
    # alice_bit and alice_basis are NEVER modified
    new_state['bit'] = int(np.random.randint(0, 2))
    
    # Randomize polarization angle to any of the 4 values
    new_state['polarization_angle'] = float(
      np.random.choice([0.0, 45.0, 90.0, 135.0])
    )
    
    # Update basis and state label to match new angle
    angle_to_state = {
        0.0:   ('+', 0, '|0>'),
        90.0:  ('+', 1, '|1>'),
        45.0:  ('x', 0, '|+>'),
        135.0: ('x', 1, '|->'),
    }
    new_basis, new_bit, new_label = angle_to_state[
      new_state['polarization_angle']
    ]
    new_state['basis'] = new_basis
    new_state['bit'] = new_bit
    new_state['state_label'] = new_label
    
    # Mark for frontend visualization
    new_state['cloning_probe_applied'] = True
    new_state['lane_corrupted'] = True
    
    result.append(new_state)
  
  return result


# Depends on: core/constants.py
# Used by: routers/simulation.py in Sprint 6
