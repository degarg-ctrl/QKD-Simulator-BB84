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
from core.constants import (
    ATTENUATION_COEFF_DB_PER_KM,
    DETECTOR_EFFICIENCY,
    DARK_COUNT_PROB
)

class QuantumChannel:
    """
    Models a realistic fiber optic quantum channel.
    
    Applies physical impairments in this exact order per photon:
    1. Attenuation: photon survives with P_survive = 10^(-loss_dB/10)
    2. Detector efficiency: surviving photon detected with probability eta
    3. Dark counts: undetected slot fires with probability P_dark
    """

    def __init__(
        self,
        distance_km: float,
        noise_level: float = 0.0,
        attenuation_coeff: float = ATTENUATION_COEFF_DB_PER_KM,
        detector_efficiency: float = DETECTOR_EFFICIENCY,
        dark_count_prob: float = DARK_COUNT_PROB
    ):
        self.distance_km = float(distance_km)
        self.noise_level = float(noise_level)
        self.attenuation_coeff = float(attenuation_coeff)
        self.detector_efficiency = float(detector_efficiency)
        self.dark_count_prob = float(dark_count_prob)
        
        self.p_survive = self._compute_survival_probability()

    def _compute_survival_probability(self) -> float:
        loss_dB = self.attenuation_coeff * self.distance_km
        return 10**(-loss_dB / 10)

    def transmit(self, states: list[dict]) -> list[dict]:
        """
        Transmit photon states through the channel using vectorized NumPy ops.
        """
        n = len(states)
        if n == 0:
            return []

        # 1. Attenuation
        fiber_survivals = np.random.random(n) < self.p_survive
        
        # 2. Detector Efficiency (only for those that survived fiber)
        detector_success = np.zeros(n, dtype=bool)
        if n > 0:
            detector_success[fiber_survivals] = np.random.random(np.sum(fiber_survivals)) < self.detector_efficiency
        
        # 3. Dark Counts (only in slots where NO real photon was successfully detected)
        dark_counts = np.zeros(n, dtype=bool)
        not_detected = ~detector_success
        if np.any(not_detected):
            dark_counts[not_detected] = np.random.random(np.sum(not_detected)) < self.dark_count_prob
            
        is_detected = detector_success | dark_counts
        
        # 4. Noise flips
        noise_flips = np.zeros(n, dtype=bool)
        if self.noise_level > 0:
            noise_flips[is_detected] = np.random.random(np.sum(is_detected)) < self.noise_level
            
        # Final bits for dark counts (random)
        dark_bits = np.random.randint(0, 2, n)
        
        transmitted_states = []
        for i, state in enumerate(states):
            new_state = state.copy()
            new_state['lost'] = not fiber_survivals[i]
            new_state['dark_count'] = bool(dark_counts[i])
            new_state['detected'] = bool(is_detected[i])
            new_state['noise_flipped'] = bool(noise_flips[i])
            
            if dark_counts[i]:
                new_state['bit'] = int(dark_bits[i])
            elif noise_flips[i]:
                new_state['bit'] = 1 - new_state['bit']
                
            transmitted_states.append(new_state)
            
        return transmitted_states

# Depends on: core/constants.py
# Used by: simulation pipeline
