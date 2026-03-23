"""
backend/core/wcp.py

Weak Coherent Pulse (WCP) model for BB84 QKD Simulator.
Models realistic photon sources using Poisson distribution.
Real laser sources emit pulses with varying photon numbers
unlike ideal single-photon sources assumed in standard BB84.

Physics reference: PHYSICS_CONTRACT.md Section 14
"""

import numpy as np
from typing import Optional
from core.constants import DETECTOR_EFFICIENCY, DARK_COUNT_PROB

# Default mean photon number per pulse
DEFAULT_MEAN_PHOTON_NUMBER = 0.2

def poisson_photon_counts(
  n_pulses: int,
  mu: float = DEFAULT_MEAN_PHOTON_NUMBER,
  rng: Optional[np.random.Generator] = None
) -> np.ndarray:
  """
  Generate Poisson-distributed photon counts per pulse.
  
  Per PHYSICS_CONTRACT Section 14:
  P(n|mu) = e^(-mu) * mu^n / n!
  
  Args:
    n_pulses: number of laser pulses
    mu: mean photon number per pulse (0.05-0.5)
    rng: numpy random generator (optional)
  Returns:
    array of photon counts per pulse (0, 1, 2, ...)
  """
  if rng is None:
    rng = np.random.default_rng()
  return rng.poisson(mu, n_pulses)

def classify_pulses(
  photon_counts: np.ndarray
) -> dict:
  """
  Classify pulses by photon number.
  
  Returns counts of vacuum, single, and multi-photon pulses.
  
  Args:
    photon_counts: array from poisson_photon_counts()
  Returns:
    dict with vacuum_count, single_count, multi_count,
    total, vacuum_fraction, single_fraction, multi_fraction
  """
  vacuum = int(np.sum(photon_counts == 0))
  single = int(np.sum(photon_counts == 1))
  multi  = int(np.sum(photon_counts >= 2))
  total  = len(photon_counts)
  return {
    'vacuum_count':    vacuum,
    'single_count':    single,
    'multi_count':     multi,
    'total':           total,
    'vacuum_fraction': vacuum / total,
    'single_fraction': single / total,
    'multi_fraction':  multi / total,
  }

def theoretical_pulse_fractions(mu: float) -> dict:
  """
  Compute theoretical Poisson fractions analytically.
  
  Per PHYSICS_CONTRACT Section 14:
  P(0|mu) = e^(-mu)
  P(1|mu) = mu * e^(-mu)
  P(>=2|mu) = 1 - e^(-mu) - mu*e^(-mu)
  
  Args:
    mu: mean photon number
  Returns:
    dict with p_vacuum, p_single, p_multi
  """
  p_vacuum = np.exp(-mu)
  p_single = mu * np.exp(-mu)
  p_multi  = 1.0 - p_vacuum - p_single
  return {
    'p_vacuum': float(p_vacuum),
    'p_single': float(p_single),
    'p_multi':  max(0.0, float(p_multi)),
    'mu':       mu
  }

def apply_wcp_to_states(
  states: list[dict],
  photon_counts: np.ndarray
) -> list[dict]:
  """
  Apply WCP photon counts to encoded photon states.
  
  Modifies states based on how many photons are in each pulse:
  - Vacuum pulse (n=0): photon never sent, mark as wcp_lost
  - Single photon (n=1): normal BB84 state, no change
  - Multi-photon (n>=2): vulnerable to PNS, mark as wcp_multi
  
  Args:
    states: list of photon state dicts from alice.encode_states()
    photon_counts: array from poisson_photon_counts()
  Returns:
    modified state list with wcp fields added
  """
  result = []
  for i, state in enumerate(states):
    count = int(photon_counts[i]) if i < len(photon_counts) else 1
    new_state = state.copy()
    new_state['wcp_photon_count'] = count
    new_state['wcp_vacuum']       = count == 0
    new_state['wcp_single']       = count == 1
    new_state['wcp_multi']        = count >= 2
    # Vacuum pulses are immediately lost — no photon sent
    if count == 0:
      new_state['wcp_lost']    = True
      new_state['detected']    = False
      new_state['lost']        = True
    else:
      new_state['wcp_lost']    = False
    result.append(new_state)
  return result

# Depends on: core/constants.py, numpy
# Used by: routers/simulation.py when wcp_enabled=True

# Usage example:
# counts = poisson_photon_counts(1000, mu=0.2)
# stats = classify_pulses(counts)
# print(f"Multi-photon: {stats['multi_fraction']:.2%}")
# → Multi-photon: ~1.75% at mu=0.2
