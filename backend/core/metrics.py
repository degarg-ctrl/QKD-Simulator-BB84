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
    qber: float | None
) -> float:
    """
    Compute Secret Key Rate per PHYSICS_CONTRACT Section 7.
    
    Formula: R = S * (1 - 2 * H(Q))
    where S = sifted_key_length / raw_key_length (sifting rate)
    """
    if raw_key_length <= 0:
        return 0.0
    
    if qber is None:
        # QBER not estimated (insufficient sample): security cannot be
        # certified, so no secret-key rate is claimed. This is NOT a measured
        # QBER of zero — callers must read qber_estimated to distinguish
        # "unestimated" from "measured 0.0". (C1 fix — no silent None->0.)
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

def theoretical_qber(
    noise_level: float,
    attack_prob: float,
    dark_fraction: float = 0.0
) -> float:
    """
    Authoritative analytical QBER model (PHYSICS_CONTRACT Section 6).

    This is the SINGLE model shared by the chart/theoretical curve and
    validated against the simulator; there must be no competing
    equation (audit fix H4).

    Channel bit-flip noise pn and intercept-resend eavesdropping at
    rate p combine multiplicatively on sifted bits, not additively:

        Q_signal = pn + p/4 - (p/2)*pn

    where:
      * p/4         - Eve's contribution: she mis-guesses the basis
                      with probability 1/2, and on a mis-guess Bob's
                      sifted bit is wrong with probability 1/2.
      * pn          - channel noise flips the physical bit before Eve.
      * -(p/2)*pn   - removes the double-counted "both flipped" term.

    Dark-count clicks are a separate population of registered
    detections carrying a uniformly random bit (50% error). With
    ``dark_fraction`` the probability that a detection is a dark
    count, the two populations combine by mixture:

        Q = Q_signal * (1 - dark_fraction) + 0.5 * dark_fraction

    Args:
        noise_level:   channel bit-flip probability pn, in [0, 1]
        attack_prob:   intercept-resend probability p, in [0, 1]
        dark_fraction: fraction of detections that are dark counts
    Returns:
        QBER clamped to [0, 0.5]
    """
    q_signal = noise_level + 0.25 * attack_prob \
        - 0.5 * attack_prob * noise_level
    q = q_signal * (1.0 - dark_fraction) + 0.5 * dark_fraction
    return float(min(0.5, max(0.0, q)))

def generate_chart_data(
    noise_level: float,
    attack_prob: float,
    attack_strategy: str,
    n_points: int = 10,
    detector_efficiency: float = DETECTOR_EFFICIENCY,
    dark_count_prob: float = DARK_COUNT_PROB,
) -> dict:
    """
    Generate QBER and SKR as functions of distance for chart display.

    QBER uses the authoritative analytical model ``theoretical_qber``
    (PHYSICS_CONTRACT Section 6) — the same equation the simulator is
    validated against — with the analytic dark-count fraction for the
    selected detector mode (ideal: eta=1, dark=0; realistic:
    eta=DETECTOR_EFFICIENCY, dark=DARK_COUNT_PROB).
    """
    distances = np.linspace(0, 100, n_points)
    qber_vs_distance = []
    skr_vs_distance = []
    
    for d in distances:
        # Fiber loss: survival prob = 10^(-loss_dB / 10)
        loss_db = ATTENUATION_COEFF_DB_PER_KM * d
        survival_prob = 10**(-loss_db / 10)
        
        # Detection prob per slot
        p_click = survival_prob * detector_efficiency
        p_detect = p_click + dark_count_prob * (1 - p_click)
        
        # Fraction of registered detections that are dark counts.
        # A dark count fires only in a slot with no real detection, and
        # carries a uniformly random bit (50% error).
        if p_detect > 0:
            dark_fraction = (dark_count_prob * (1 - p_click)) / p_detect
        else:
            dark_fraction = 0.0

        q = theoretical_qber(noise_level, attack_prob, dark_fraction)
        
        # SKR = P_detect * Sifting_Efficiency * (1 - 2*H(QBER))
        # Sifting efficiency is 0.5 for BB84
        if q < QBER_SECURITY_THRESHOLD:
            theoretical_skr = p_detect * 0.5 * (1 - 2 * binary_entropy(q))
        else:
            theoretical_skr = 0.0
            
        qber_vs_distance.append({
            "distance": float(d),
            "qber": float(q)
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
