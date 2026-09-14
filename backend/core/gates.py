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
from typing import Optional
from core.constants import POLARIZATION_ANGLES, STATE_LABELS
from core.rng import resolve_rng

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
    "Lane" is the deterministic visualization partition (index % 3),
    not a physical per-lane channel — see PHYSICS_CONTRACT.md Section 10
    lane identity (audit M14).
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
        # Check if this photon is on the target lane (default single lane 0)
        photon_lane = state.get('lane', 0)
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
  probe_position: float,
  rng: Optional[np.random.Generator] = None,
) -> list[dict]:
  """
  Apply No-Cloning Theorem probe to photons on a lane.

  Simulates Eve's CNOT-based cloning attempt at the level of the
  BB84 states actually in flight. Per PHYSICS_CONTRACT.md Section 11:

  - Input:  |psi>|0>  (original photon + blank probe qubit)
  - Output: entangled state  (neither copy equals |psi>)

  CNOT mechanics (control = photon, target = probe |0>):

  * Computational (rectilinear '+') states are eigenstates of the
    CNOT control operation and are left INVARIANT:
        |0>|0>  ->  |0>|0>
        |1>|0>  ->  |1>|1>
    so a '+' photon carries no added error.

  * Diagonal ('x') states become entangled with the probe:
        |+>|0>  ->  (|00> + |11>)/sqrt(2)
        |->|0>  ->  (|00> - |11>)/sqrt(2)
    The photon's reduced state is maximally mixed, so Bob's outcome
    for such a photon is a uniformly random bit in the diagonal basis
    (50% error on the sifted key).

  Net QBER contribution: P(x basis)=1/2 times 50% error = ~25% above
  the channel baseline, exactly as required by the contract. The
  previous implementation instead randomized every affected photon
  over all four BB84 states, which produced ~50% disturbance and
  contradicted the documented ~25% model (audit fix H3).

  NOTE: this is a simplified two-state CNOT demonstration of the
  no-cloning theorem, not an optimal universal (1->2) cloner and not
  a claim of a standard cryptographic attack.

  Visual signal: sets 'cloning_probe_applied': True and
                 'lane_corrupted': True on affected photons.
  Applies to every photon on lane_index whose slot reached the
  detector region (detected, including dark-count slots); pulses lost
  before/at the detector are passed through unchanged.

  Args:
      states: photon state list from eve.intercept()
      lane_index: which lane has the cloning probe
      probe_position: schematic placement of the probe along the lane
          (0.0-1.0). Accepted for call/UI compatibility but currently
          has NO physical effect: the CNOT model is applied uniformly
          to the whole intercepted segment.
      rng: run-level numpy random generator (optional)
  Returns:
      state list with cloning probe effects applied

  Physics reference: PHYSICS_CONTRACT.md Section 11
  """
  rng = resolve_rng(rng)

  result = []
  for state in states:
    photon_lane = state.get('lane', 0)
    if photon_lane != lane_index:
      result.append(state)
      continue

    # Skip lost photons
    if not state.get('detected', True) and \
       not state.get('dark_count', False):
      result.append(state)
      continue

    new_state = state.copy()

    # alice_bit and alice_basis are NEVER modified.
    if new_state.get('basis', '+') == 'x':
      # Diagonal state -> maximally mixed reduced state after CNOT.
      # Represent the collapsed outcome as a uniform diagonal-basis bit.
      new_bit = int(rng.integers(0, 2))
      state_key = ('x', new_bit)
      new_state['bit'] = new_bit
      new_state['state_label'] = STATE_LABELS[state_key]
      new_state['polarization_angle'] = float(
        POLARIZATION_ANGLES[state_key]
      )
    # else: '+' state is CNOT-invariant — polarization unchanged.

    # Mark for frontend visualization
    new_state['cloning_probe_applied'] = True
    new_state['lane_corrupted'] = True

    result.append(new_state)

  return result


# Depends on: core/constants.py
# Used by: routers/simulation.py in Sprint 6
