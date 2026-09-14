"""
backend/core/channel.py

Quantum channel model for BB84 QKD Simulator.
Models a realistic fiber optic channel with three physical impairments:
- Fiber attenuation: photons lost over distance (Beer-Lambert law)
- Detector efficiency: arriving photons may not be detected
- Dark counts: false detections from thermal/electronic noise

Physics reference: PHYSICS_CONTRACT.md Section 4
"""

import numpy as np
from typing import Optional
from core.constants import (
    ATTENUATION_COEFF_DB_PER_KM,
    DETECTOR_EFFICIENCY,
    DARK_COUNT_PROB,
    STATE_LABELS,
    POLARIZATION_ANGLES,
)
from core.rng import resolve_rng

class QuantumChannel:
    """
    Models a realistic fiber optic quantum channel.
    
    Applies physical impairments in this exact order per photon:
    1. Attenuation: photon survives with P_survive = 10^(-loss_dB/10)
    2. Detector efficiency: surviving photon detected with probability eta
    3. Dark counts: undetected slot fires with probability P_dark

    Randomness is drawn from an injected ``rng`` (the run-level RNG
    threaded by the router); a private generator is used when omitted
    (audit fix H7).
    """

    def __init__(
        self,
        distance_km: float,
        noise_level: float = 0.0,
        attenuation_coeff: float = ATTENUATION_COEFF_DB_PER_KM,
        detector_efficiency: float = DETECTOR_EFFICIENCY,
        dark_count_prob: float = DARK_COUNT_PROB,
        rng: Optional[np.random.Generator] = None,
    ):
        self.distance_km = float(distance_km)
        self.noise_level = float(noise_level)
        self.attenuation_coeff = float(attenuation_coeff)
        self.detector_efficiency = float(detector_efficiency)
        self.dark_count_prob = float(dark_count_prob)
        self.rng = resolve_rng(rng)
        
        self.p_survive = self._compute_survival_probability()

    def _compute_survival_probability(self) -> float:
        loss_dB = self.attenuation_coeff * self.distance_km
        return 10**(-loss_dB / 10)

    def transmit(self, states: list[dict]) -> list[dict]:
        """
        Transmit photon states through the channel using vectorized NumPy ops.

        WCP-aware: vacuum pulses (wcp_lost=True) contain no photon and are
        permanently lost before entering the fiber. They cannot survive
        attenuation, so their fiber_survivals slot is forced to False.
        Dark counts on those slots remain possible (real detector behaviour).

        Event bookkeeping (visualization/inspection only — physics unchanged):
        - 'fiber_survived'    — the photon passed the fiber attenuation draw
                                (False for vacuum pulses: no photon emitted).
        - 'detector_detected' — a REAL photon registered at the detector
                                (efficiency draw passed). Distinct from
                                'detected', which is also True for
                                dark-count-only clicks.
        Downstream stages (Eve/PNS/gates) read 'fiber_survived' to restrict
        their interaction to pulses that physically traversed the channel.
        """
        n = len(states)
        if n == 0:
            return []

        # 1. Attenuation — vacuum pulses have no photon to survive the fiber
        wcp_already_lost = np.array(
            [s.get('wcp_lost', False) for s in states], dtype=bool
        )
        fiber_survivals = self.rng.random(n) < self.p_survive
        fiber_survivals[wcp_already_lost] = False  # enforce: no photon → no survival
        
        # 2. Detector Efficiency (only for those that survived fiber)
        detector_success = np.zeros(n, dtype=bool)
        if n > 0:
            detector_success[fiber_survivals] = self.rng.random(np.sum(fiber_survivals)) < self.detector_efficiency
        
        # 3. Dark Counts (only in slots where NO real photon was successfully detected)
        dark_counts = np.zeros(n, dtype=bool)
        not_detected = ~detector_success
        if np.any(not_detected):
            dark_counts[not_detected] = self.rng.random(np.sum(not_detected)) < self.dark_count_prob
            
        is_detected = detector_success | dark_counts
        
        # 4. Noise flips
        noise_flips = np.zeros(n, dtype=bool)
        if self.noise_level > 0:
            noise_flips[is_detected] = self.rng.random(np.sum(is_detected)) < self.noise_level
            
        # Final bits for dark counts (random)
        dark_bits = self.rng.integers(0, 2, n)
        
        transmitted_states = []
        for i, state in enumerate(states):
            new_state = state.copy()
            new_state['lost'] = not fiber_survivals[i]
            new_state['fiber_survived'] = bool(fiber_survivals[i])
            new_state['dark_count'] = bool(dark_counts[i])
            new_state['detected'] = bool(is_detected[i])
            new_state['detector_detected'] = bool(detector_success[i])
            # Noise flip only takes effect on real (non-dark) detections —
            # dark-count slots resolve to 'dark_count_bit' in bob.measure().
            # Flag reflects the flip that actually applied.
            new_state['noise_flipped'] = bool(
                noise_flips[i] and not dark_counts[i]
            )
            
            if dark_counts[i]:
                new_state['dark_count_bit'] = int(dark_bits[i])
            elif noise_flips[i]:
                # Channel noise is a bit-flip WITHIN the current basis. Keep
                # the canonical quantum-state representation consistent:
                # 'bit', 'state_label' and 'polarization_angle' must all
                # describe the same BB84 state after the flip (audit fix H6).
                new_state['bit'] = 1 - new_state['bit']
                basis_key = new_state.get('basis', '+')
                state_key = (basis_key, new_state['bit'])
                new_state['state_label'] = STATE_LABELS.get(
                    state_key, new_state.get('state_label', '|?>')
                )
                new_state['polarization_angle'] = float(
                    POLARIZATION_ANGLES.get(
                        state_key, new_state.get('polarization_angle', 0.0)
                    )
                )
                
            transmitted_states.append(new_state)
            
        return transmitted_states

# Depends on: core/constants.py
# Used by: simulation pipeline
