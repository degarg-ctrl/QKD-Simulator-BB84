"""
backend/core/metrics.py

Security metrics computation for BB84 QKD Simulator.
Pure mathematical functions — no randomness, no simulation state.

Computes:
- Binary entropy H(Q) used in SKR formula
- Secret Key Rate R = S * (1 - 2*H(Q))
- Sifting and detection efficiency
- Chart data: QBER and SKR as functions of distance

Physics reference: PHYSICS_CONTRACT.md Section 7
"""

import numpy as np
from core.constants import (
    QBER_SECURITY_THRESHOLD,
    ATTENUATION_COEFF_DB_PER_KM,
    DETECTOR_EFFICIENCY,
    DARK_COUNT_PROB
)

def binary_entropy(q: float) -> float:
    """
    Compute binary entropy H(Q) = -Q*log2(Q) - (1-Q)*log2(1-Q)
    
    Per PHYSICS_CONTRACT Section 7.
    Edge cases:
    - q=0: H(0) = 0 (no uncertainty)
    - q=1: H(1) = 0 (no uncertainty)  
    - q=0.5: H(0.5) = 1 (maximum uncertainty)
    - q outside [0,1]: raise ValueError
    """
    if q < 0.0 or q > 1.0:
        raise ValueError(f"Entropy input q={q} must be in range [0, 1]")
    
    if q == 0.0 or q == 1.0:
        return 0.0
    
    return -q * np.log2(q) - (1 - q) * np.log2(1 - q)

def compute_skr(
    sifted_key_length: int,
    raw_key_length: int,
    qber: float
) -> float:
    """
    Compute Secret Key Rate per PHYSICS_CONTRACT Section 7.
    
    Formula: R = S * (1 - 2 * H(Q))
    where S = sifted_key_length / raw_key_length (sifting rate)
    """
    if raw_key_length <= 0:
        return 0.0
    
    if qber >= QBER_SECURITY_THRESHOLD:
        return 0.0
    
    s_rate = sifted_key_length / raw_key_length
    h_q = binary_entropy(qber)
    
    skr = s_rate * (1 - 2 * h_q)
    
    return max(0.0, float(skr))

def compute_efficiency(
    sifted_key_length: int,
    raw_key_length: int
) -> float:
    """
    Compute sifting and detection efficiency percentage.
    """
    if raw_key_length <= 0:
        return 0.0
    
    return float((sifted_key_length / raw_key_length) * 100)

def generate_chart_data(
    noise_level: float,
    attack_prob: float,
    attack_strategy: str,
    n_points: int = 10
) -> dict:
    """
    Generate QBER and SKR as functions of distance for chart display.
    
    Analytical model per PHYSICS_CONTRACT Section 7.
    """
    distances = np.linspace(0, 100, n_points)
    qber_vs_distance = []
    skr_vs_distance = []
    
    for d in distances:
        # Fiber loss: survival prob = 10^(-loss_dB / 10)
        loss_db = ATTENUATION_COEFF_DB_PER_KM * d
        survival_prob = 10**(-loss_db / 10)
        
        # Detection prob per slot
        # Includes detector efficiency and dark counts (approx binary model)
        p_click = survival_prob * DETECTOR_EFFICIENCY
        p_detect = p_click + DARK_COUNT_PROB * (1 - p_click)
        
        # QBER contribution from dark counts:
        # Prob(error | dark_count) = 0.5
        # Prob(dark_count | detect) = (DARK_COUNT * (1-click)) / p_detect
        if p_detect > 0:
            dark_contribution = (DARK_COUNT_PROB * (1 - p_click) * 0.5) / p_detect
        else:
            dark_contribution = 0.5
            
        # Total QBER = intrinsic noise + Eve's contribution + channel dark counts
        # Eve introduces 25% errors relative to total stream on basis matches
        theoretical_qber = noise_level + (0.25 * attack_prob) + dark_contribution
        theoretical_qber = min(0.5, theoretical_qber)
        
        # SKR = P_detect * Sifting_Efficiency * (1 - 2*H(QBER))
        # Sifting efficiency is 0.5 for BB84
        if theoretical_qber < QBER_SECURITY_THRESHOLD:
            theoretical_skr = p_detect * 0.5 * (1 - 2 * binary_entropy(theoretical_qber))
        else:
            theoretical_skr = 0.0
            
        qber_vs_distance.append({
            "distance": float(d),
            "qber": float(theoretical_qber)
        })
        skr_vs_distance.append({
            "distance": float(d),
            "skr": max(0.0, float(theoretical_skr))
        })
        
    return {
        "qber_vs_distance": qber_vs_distance,
        "skr_vs_distance": skr_vs_distance
    }

# Depends on: core/constants.py
# Used by: routers/simulation.py to build SimulationResponse
