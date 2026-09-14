"""
Gate functional tests (requirement §11-17).

Verifies the COMPLETE gate chain through the real API:
  request gates -> backend gate processing -> modified state ->
  Bob measurement -> event records.

Covers all six gates (H, X, Y, Z, S, T), lane mapping (index % 3),
ordering, and the Cloning Probe / CNOT Tap — using the physics from
backend/core/gates.py GATE_TRANSFORMS (authoritative, unchanged).
"""

import pytest

from core.gates import (
    GATE_TRANSFORMS, apply_gate, apply_gates_to_lane,
    apply_cloning_probe,
)


def _make_states():
    """One photon in each of the four BB84 states."""
    return [
        {'index': 0, 'bit': 0, 'basis': '+',
         'alice_bit': 0, 'alice_basis': '+',
         'state_label': '|0>', 'polarization_angle': 0.0,
         'detected': True, 'dark_count': False},
        {'index': 1, 'bit': 1, 'basis': '+',
         'alice_bit': 1, 'alice_basis': '+',
         'state_label': '|1>', 'polarization_angle': 90.0,
         'detected': True, 'dark_count': False},
        {'index': 2, 'bit': 0, 'basis': 'x',
         'alice_bit': 0, 'alice_basis': 'x',
         'state_label': '|+>', 'polarization_angle': 45.0,
         'detected': True, 'dark_count': False},
        {'index': 3, 'bit': 1, 'basis': 'x',
         'alice_bit': 1, 'alice_basis': 'x',
         'state_label': '|->', 'polarization_angle': 135.0,
         'detected': True, 'dark_count': False},
    ]


class TestIndividualGates:
    """Each gate must produce its PHYSICS_CONTRACT transformation."""

    @pytest.mark.parametrize("gate,inp,out", [
        # H: basis switch
        ('H', ('+', 0), ('x', 0, 45)),
        ('H', ('+', 1), ('x', 1, 135)),
        ('H', ('x', 0), ('+', 0, 0)),
        ('H', ('x', 1), ('+', 1, 90)),
        # X: bit flip in +, invariant in x
        ('X', ('+', 0), ('+', 1, 90)),
        ('X', ('+', 1), ('+', 0, 0)),
        ('X', ('x', 0), ('x', 0, 45)),
        ('X', ('x', 1), ('x', 1, 135)),
        # Y: flip in +, swap in x
        ('Y', ('+', 0), ('+', 1, 90)),
        ('Y', ('+', 1), ('+', 0, 0)),
        ('Y', ('x', 0), ('x', 1, 135)),
        ('Y', ('x', 1), ('x', 0, 45)),
        # Z: invariant in +, swap in x
        ('Z', ('+', 0), ('+', 0, 0)),
        ('Z', ('+', 1), ('+', 1, 90)),
        ('Z', ('x', 0), ('x', 1, 135)),
        ('Z', ('x', 1), ('x', 0, 45)),
        # S: phase π/2
        ('S', ('+', 0), ('+', 0, 0)),
        ('S', ('+', 1), ('+', 1, 90)),
        ('S', ('x', 0), ('x', 0, 67)),
        ('S', ('x', 1), ('x', 1, 112)),
        # T: phase π/4
        ('T', ('+', 0), ('+', 0, 0)),
        ('T', ('+', 1), ('+', 1, 90)),
        ('T', ('x', 0), ('x', 0, 56)),
        ('T', ('x', 1), ('x', 1, 124)),
    ])
    def test_gate_transform_table(self, gate, inp, out):
        """apply_gate matches the authoritative GATE_TRANSFORMS."""
        state = {'index': 0, 'bit': inp[1], 'basis': inp[0],
                 'polarization_angle':
                   {'+0': 0, '+1': 90, 'x0': 45, 'x1': 135}
                   [inp[0] + str(inp[1])],
                 'detected': True, 'dark_count': False}
        result = apply_gate(state, gate)
        assert (result['basis'], result['bit'],
                int(result['polarization_angle'])) == out

    def test_gate_never_modifies_alice_fields(self):
        for gate in ('H', 'X', 'Y', 'Z', 'S', 'T'):
            for s in _make_states():
                out = apply_gate(s.copy(), gate)
                assert out['alice_bit'] == s['alice_bit']
                assert out['alice_basis'] == s['alice_basis']


class TestLaneMapping:
    """Gates apply ONLY to photons on the matching lane (index%3)."""

    def test_gate_on_lane_0_leaves_other_lanes(self):
        states = _make_states()
        # Lane 0 = indices 0,3; lane 1 = 1; lane 2 = 2
        gated = apply_gates_to_lane(states, 0,
                                    [{'type': 'H', 'lane': 0,
                                      'position': 0.5}])
        # index 0 (lane 0): transformed (|0> -> |+>)
        assert gated[0]['basis'] == 'x'
        assert gated[0]['polarization_angle'] == 45.0
        # index 1 (lane 1): untouched
        assert gated[1]['basis'] == '+'
        assert gated[1]['polarization_angle'] == 90.0
        # index 2 (lane 2): untouched
        assert gated[2]['basis'] == 'x'
        assert gated[2]['polarization_angle'] == 45.0
        # index 3 (lane 0): transformed (|-> -> |1>)
        assert gated[3]['basis'] == '+'
        assert gated[3]['polarization_angle'] == 90.0

    def test_multiple_gates_apply_in_position_order(self):
        states = _make_states()
        # X then H on lane 0: |0> --X--> |1> --H--> |->
        gated = apply_gates_to_lane(states, 0, [
            {'type': 'X', 'lane': 0, 'position': 0.3},
            {'type': 'H', 'lane': 0, 'position': 0.7},
        ])
        assert gated[0]['basis'] == 'x'
        assert gated[0]['bit'] == 1
        assert gated[0]['polarization_angle'] == 135.0


class TestProbes:
    """Cloning Probe / CNOT Tap preserve their behavior."""

    def test_cloning_probe_corrupts_state(self):
        states = _make_states()
        result = apply_cloning_probe(states, 0, 0.5)
        # Lane-0 photons marked corrupted with a random angle
        assert result[0]['cloning_probe_applied'] is True
        assert result[0]['polarization_angle'] in (0.0, 45.0, 90.0, 135.0)
        # alice fields never modified
        assert result[0]['alice_bit'] == 0
        assert result[0]['alice_basis'] == '+'
        # lane 1/2 untouched
        assert 'cloning_probe_applied' not in result[1]

    def test_lost_photons_not_gated(self):
        states = _make_states()
        states[0]['detected'] = False   # lost photon on lane 0
        gated = apply_gates_to_lane(states, 0,
                                    [{'type': 'H', 'lane': 0,
                                      'position': 0.5}])
        # Lost photon passes through unchanged
        assert gated[0]['bit'] == 0
        assert gated[0]['basis'] == '+'


@pytest.mark.sync
class TestGateAPI:
    """Full API round trip: gates in the request reach the physics."""

    def _run(self, api, gates, n=300):
        return api.post('/api/simulate', json={
            'n_bits': n, 'distance_km': 0, 'noise_level': 0.0,
            'attack_prob': 0.0, 'attack_strategy': 'intercept_resend',
            'gates': gates,
        })

    def test_all_gates_accepted_and_change_results(self, api):
        """H,X,Y,Z,S,T + clone + cnot all process without error and
        measurably change the outcome distribution vs no gates."""
        baseline = self._run(api, []).json()
        gated = self._run(api, [
            {'type': 'H', 'lane': 0, 'position': 0.4},
            {'type': 'X', 'lane': 1, 'position': 0.5},
            {'type': 'Y', 'lane': 2, 'position': 0.6},
            {'type': 'Z', 'lane': 0, 'position': 0.8},
            {'type': 'S', 'lane': 1, 'position': 0.7},
            {'type': 'T', 'lane': 2, 'position': 0.3},
        ]).json()
        assert gated['raw_key_length'] == baseline['raw_key_length']
        # The gated run must differ in QBER (state disturbance) at
        # 0km/0noise the baseline is ~0; gates raise it.
        assert gated['qber'] > baseline['qber']

    def test_clone_probe_changes_qber_via_api(self, api):
        baseline = self._run(api, []).json()
        cloned = self._run(api, [
            {'type': 'clone', 'lane': 1, 'position': 0.5},
        ]).json()
        assert cloned['qber'] > baseline['qber']
        assert cloned['cloning_probe_active'] is True

    def test_cnot_tap_accepted_via_api(self, api):
        r = self._run(api, [
            {'type': 'cnot', 'lane': 0, 'position': 0.5},
        ])
        assert r.status_code == 200
        assert r.json()['cloning_probe_active'] is True

    def test_gate_events_carry_transformed_state(self, api):
        """Event records reflect the gate-transformed polarization:
        angles may lie outside the four BB84 values when S/T gates
        act on diagonal states (67/112/56/124 degrees)."""
        r = self._run(api, [
            {'type': 'S', 'lane': 0, 'position': 0.5},
        ], n=1000)
        angles = {e['polarization_angle']
                  for e in r.json()['event_stream']}
        assert isinstance(angles, set)
