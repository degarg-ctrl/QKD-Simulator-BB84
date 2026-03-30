"""
backend/core/decoy.py

Decoy State Protocol — countermeasure against PNS attack.
Alice randomly sends pulses with different mean photon numbers.
Comparing gain statistics reveals PNS attack.

Physics reference: PHYSICS_CONTRACT.md Section 16
"""

import numpy as np
from core.wcp import theoretical_pulse_fractions

# Default intensity levels
MU_SIGNAL = 0.5   # Signal state intensity
MU_DECOY  = 0.1   # Decoy state intensity
MU_VACUUM = 0.0   # Vacuum state intensity

# Fraction of pulses at each intensity
SIGNAL_FRACTION = 0.70
DECOY_FRACTION  = 0.20
VACUUM_FRACTION = 0.10

# Detection threshold for PNS attack
PNS_DETECTION_EPSILON = 0.05

def assign_decoy_intensities(
  n_pulses: int,
  rng: np.random.Generator = None
) -> np.ndarray:
  """
  Randomly assign intensity levels to pulses.
  
  Per PHYSICS_CONTRACT Section 16:
  70% signal (mu=0.5), 20% decoy (mu=0.1), 10% vacuum (mu=0)
  
  Args:
    n_pulses: total number of pulses
    rng: numpy random generator
  Returns:
    array of mean photon numbers per pulse
  """
  if rng is None:
    rng = np.random.default_rng()

  intensities = rng.choice(
    [MU_SIGNAL, MU_DECOY, MU_VACUUM],
    size=n_pulses,
    p=[SIGNAL_FRACTION, DECOY_FRACTION, VACUUM_FRACTION]
  )
  return intensities

def compute_gains(
  states: list[dict],
  intensities: np.ndarray
) -> dict:
  """
  Compute gain statistics for signal and decoy states.
  
  Gain Q_mu = fraction of pulses detected at intensity mu.
  Under PNS attack: Q_signal/mu_s significantly > Q_decoy/mu_d
  Under normal: Q_signal/mu_s ~ Q_decoy/mu_d
  
  Args:
    states: photon states with detection information
    intensities: intensity array from assign_decoy_intensities
  Returns:
    dict with signal_gain, decoy_gain, vacuum_gain,
    normalized_signal, normalized_decoy, ratio
  """
  signal_total    = 0
  signal_detected = 0
  decoy_total     = 0
  decoy_detected  = 0
  vacuum_total    = 0
  vacuum_detected = 0

  for i, state in enumerate(states):
    if i >= len(intensities):
      break
    mu = intensities[i]
    detected = state.get('detected', False) and \
               not state.get('lost', False)

    if mu == MU_SIGNAL:
      signal_total    += 1
      signal_detected += int(detected)
    elif mu == MU_DECOY:
      decoy_total     += 1
      decoy_detected  += int(detected)
    elif mu == MU_VACUUM:
      vacuum_total    += 1
      vacuum_detected += int(detected)

  signal_gain = signal_detected / max(1, signal_total)
  decoy_gain  = decoy_detected  / max(1, decoy_total)
  vacuum_gain = vacuum_detected / max(1, vacuum_total)

  # Normalized gains — should be equal under no attack
  norm_signal = signal_gain / MU_SIGNAL if MU_SIGNAL > 0 else 0
  norm_decoy  = decoy_gain  / MU_DECOY  if MU_DECOY  > 0 else 0

  return {
    'signal_gain':      signal_gain,
    'decoy_gain':       decoy_gain,
    'vacuum_gain':      vacuum_gain,
    'normalized_signal': norm_signal,
    'normalized_decoy':  norm_decoy,
    'ratio': norm_signal / norm_decoy if norm_decoy > 0 else 1.0,
    'signal_total':    signal_total,
    'decoy_total':     decoy_total,
  }

def detect_pns_attack(gains: dict) -> dict:
  """
  Determine if PNS attack is present from gain statistics.
  
  Per PHYSICS_CONTRACT Section 16:
  PNS detected when:
  |Q_signal/mu_s - Q_decoy/mu_d| > epsilon
  
  Args:
    gains: dict from compute_gains()
  Returns:
    dict with pns_detected, confidence, 
    gain_difference, threshold_used
  """
  diff = abs(
    gains['normalized_signal'] - gains['normalized_decoy']
  )
  detected = diff > PNS_DETECTION_EPSILON

  # Confidence: how far above threshold
  confidence = min(1.0, diff / PNS_DETECTION_EPSILON) \
               if PNS_DETECTION_EPSILON > 0 else 0.0

  return {
    'pns_detected':    detected,
    'confidence':      float(confidence),
    'gain_difference': float(diff),
    'threshold_used':  PNS_DETECTION_EPSILON,
    'signal_gain':     gains['signal_gain'],
    'decoy_gain':      gains['decoy_gain'],
  }

# Depends on: core/wcp.py, numpy
# Used by: routers/simulation.py when decoy_enabled=True
