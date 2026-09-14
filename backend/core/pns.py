"""
backend/core/pns.py

Photon Number Splitting (PNS) attack simulation.
Eve exploits multi-photon pulses in WCP sources.
Performs QND measurement, blocks single photons,
splits multi-photon pulses — introduces ZERO QBER.

Critical: PNS attack is UNDETECTABLE by QBER threshold.
Standard BB84 security threshold cannot detect this attack.
Only decoy state protocol can reveal PNS attack.

Pipeline placement (audit M7): PNS is a POST-CHANNEL process. The
router applies it after channel transmission (attenuation, detector
efficiency, dark counts) and after Eve, on the already channel-processed
pulses. Only pulses that physically reached Eve (fiber_survived=True)
can be blocked/split; pulses absorbed in the fiber are untouched.

Physics reference: PHYSICS_CONTRACT.md Section 15
"""

import numpy as np
from typing import Optional

class PNSAttack:
  """
  Simulates Eve's Photon Number Splitting attack.
  
  Attack procedure per PHYSICS_CONTRACT Section 15:
  1. Eve performs QND measurement on each pulse
  2. Single-photon pulses: blocked with probability p_block
  3. Multi-photon pulses: split with probability p_split
     - One photon stored in quantum memory
     - Remaining photons forwarded to Bob
  4. After basis reconciliation: Eve measures stored photons
  
  Result: QBER ~ 0% — completely undetectable by threshold
  """

  def __init__(
    self,
    p_block: float = 0.3,
    p_split: float = 0.9,
  ):
    """
    Args:
      p_block: probability Eve blocks single-photon pulses
      p_split: probability Eve splits multi-photon pulses
    """
    self.p_block = p_block
    self.p_split = p_split

  def attack(
    self,
    states: list[dict],
    rng: Optional[np.random.Generator] = None
  ) -> tuple[list[dict], dict]:
    """
    Apply PNS attack to photon states.
    
    Per PHYSICS_CONTRACT Section 15:
    - Single photons blocked with p_block
    - Multi photons split with p_split
    - Split photons: Eve stores copy, Bob gets rest
    - QBER contribution: ~0% (no basis error introduced)
    - Information leaked = fraction of split photons

    Event semantics (pipeline-order guard, physics unchanged):
    Eve performs her QND measurement on pulses that physically reach
    her tap inside the fiber. Slots with fiber_survived=False were
    absorbed in the fiber BEFORE Eve's position — she can neither
    block nor split them. Without this guard, blocked_single would
    count photons that died naturally in the fiber (already lost /
    undetected), inflating the apparent attack footprint and making
    per-event visualization impossible to defend.

    Args:
      states: photon states with wcp fields from wcp.py
      rng: numpy random generator
    Returns:
      tuple of (modified_states, attack_statistics)
    """
    if rng is None:
      rng = np.random.default_rng()

    result = []
    stats = {
      'blocked_single': 0,
      'split_multi':    0,
      'passed_through': 0,
      'eve_info_bits':  0,
      'total':          len(states)
    }

    # Denominator bookkeeping for the leakage metric (audit C2).
    #
    # All security rates in this simulator are normalised *per transmitted
    # pulse*: SKR = (sifted / raw_transmitted) * (1 - 2*H(Q))  (see
    # core.metrics.compute_skr). Leakage must use the SAME denominator or
    # the subtraction is dimensionally meaningless.
    #
    # We therefore count multi-photon pulses over the whole transmitted
    # stream (not only the ones that reached Eve and were actually split).
    # The documented PHYSICS_CONTRACT Section 15 model is
    #     leaked_information = p_split * P(n>=2 | mu)
    # i.e. an *expected* per-transmitted-pulse leak, independent of fiber
    # survival. `multi_transmitted / total_transmitted` is the empirical
    # estimate of P(n>=2 | mu) for the sampled pulse stream.
    total_transmitted = len(states)
    multi_transmitted = sum(1 for s in states if s.get('wcp_multi', False))

    for state in states:
      new_state = state.copy()
      new_state['pns_attacked']  = False
      new_state['pns_blocked']   = False
      new_state['pns_split']     = False
      new_state['eve_has_copy']  = False

      is_multi  = state.get('wcp_multi', False)
      is_single = state.get('wcp_single', True)
      is_vacuum = state.get('wcp_vacuum', False)
      # Physical reachability: pulse must have survived the fiber
      # up to Eve's tap to be attackable at all.
      reached_eve = state.get('fiber_survived', True)

      if is_vacuum or not reached_eve:
        # Vacuum pulse or pulse absorbed before Eve — nothing to attack
        result.append(new_state)
        continue

      if is_single:
        # Single photon — Eve may block it
        if rng.random() < self.p_block:
          new_state['pns_attacked'] = True
          new_state['pns_blocked']  = True
          new_state['detected']     = False
          new_state['lost']         = True
          stats['blocked_single']  += 1
        else:
          stats['passed_through'] += 1

      elif is_multi:
        # Multi-photon — Eve may split it
        if rng.random() < self.p_split:
          new_state['pns_attacked'] = True
          new_state['pns_split']    = True
          new_state['eve_has_copy'] = True
          # Bob still receives pulse (reduced count)
          # No QBER introduced — Eve measures AFTER
          # basis reconciliation with correct basis
          # alice_bit and alice_basis unchanged
          stats['split_multi']    += 1
          stats['eve_info_bits']  += 1
        else:
          stats['passed_through'] += 1

      result.append(new_state)

    # Leaked information, normalised PER TRANSMITTED PULSE (audit C2).
    #
    # `leaked_fraction_per_transmitted_pulse` is the quantity that is
    # dimensionally comparable to `skr` and is the only leakage value
    # consumed by compute_pns_security(). It is the expected split
    # probability applied to the transmitted multi-photon fraction:
    #     p_split * (multi_transmitted / total_transmitted)
    # which is the empirical form of the documented
    #     p_split * P(n>=2 | mu).
    stats['total_transmitted'] = total_transmitted
    stats['multi_transmitted'] = multi_transmitted
    stats['leaked_fraction_per_transmitted_pulse'] = (
      self.p_split * (multi_transmitted / max(1, total_transmitted))
    )

    # Backward-compatible legacy key. NOTE: this is per DETECTED pulse and
    # MUST NOT be subtracted from the per-transmitted-pulse SKR. Kept only
    # so existing consumers/diagnostics that read `leak_fraction` keep
    # working; it is informational and deprecated. Use
    # `leaked_fraction_per_transmitted_pulse` for any security arithmetic.
    total_detected = sum(
      1 for s in result 
      if s.get('detected', True) and not s.get('lost', False)
    )
    stats['leak_fraction'] = (
      stats['eve_info_bits'] / max(1, total_detected)
    )

    return result, stats

def compute_pns_security(
  pns_stats: dict,
  qber: float | None,
  skr: float
) -> dict:
  """
  Compute security metrics under PNS attack.
  
  Per PHYSICS_CONTRACT Section 15:
  R_pns = S*(1-2*H(Q)) - leaked_information
  If leaked_information >= R_pns: session compromised

  Unit consistency (audit C2): `skr` is normalised per transmitted pulse
  (sifted/raw_transmitted * (1 - 2*H(Q))). The leakage subtracted here is
  therefore taken from `leaked_fraction_per_transmitted_pulse`, which uses
  the same per-transmitted-pulse denominator. The legacy per-detected
  `leak_fraction` is deliberately NOT used.

  Args:
    pns_stats: statistics from PNSAttack.attack()
    qber: estimated QBER from protocol
    skr: secret key rate from metrics (per transmitted pulse)
  Returns:
    dict with pns_compromised, leaked_fraction, 
    effective_skr, detection_possible
  """
  # Default 0.0 (not the legacy per-detected leak_fraction) so a stats dict
  # that predates the C2 fix can never re-introduce the unit mismatch.
  leaked = pns_stats.get('leaked_fraction_per_transmitted_pulse', 0.0)
  effective_skr = max(0.0, skr - leaked)
  compromised = leaked >= skr

  return {
    'pns_compromised':  compromised,
    'leaked_fraction':  leaked,
    'effective_skr':    effective_skr,
    'detection_possible': False,  # Cannot detect via QBER
    'requires_decoy_states': True,
    'qber_shows':       qber,
    # QBER can only "mislead" (look safe) when it was actually estimated.
    # When qber is None (insufficient sample) it is unknown, not low.
    'qber_misleading':  (qber is not None and qber < 0.11 and compromised),
  }

# Depends on: numpy
# Used by: routers/simulation.py when attack_strategy='pns'

# Usage example:
# pns = PNSAttack(p_block=0.3, p_split=0.9)
# attacked_states, stats = pns.attack(wcp_states)
# print(f"QBER after PNS: ~0% (undetectable)")
# print(f"Leaked info: {stats['leak_fraction']:.2%}")
