"""
backend/core/decoy.py

Decoy State Protocol — countermeasure against PNS attack.
Alice randomly sends pulses with different mean photon numbers.
Comparing single-photon yield statistics reveals PNS attack.

Implementation: Lo, Ma & Chen (2005) PRL 94, 230504.
Computes Y_1 lower bound (Eq. 5) from measured gains at signal and
decoy intensities.

Post-Campaign-1 fix (2026-09-07): the PNS decision rule is now an
uncertainty-aware one-sided exact binomial test on the decoy gain
against its analytic honest-channel value (see detect_pns_attack).
The LMC Y_1 lower-bound estimator is unchanged.  The legacy
suppression threshold 0.6 is retained as a reported (informational)
constant only.

Physics reference: PHYSICS_CONTRACT.md Section 16
"""

import math

import numpy as np
from scipy.stats import binom as _binom_dist

from core.constants import (
    ATTENUATION_COEFF_DB_PER_KM,
    DETECTOR_EFFICIENCY,
    DARK_COUNT_PROB,
)
from core.wcp import theoretical_pulse_fractions

# Default intensity levels
MU_SIGNAL = 0.5   # Signal state intensity
MU_DECOY  = 0.1   # Decoy state intensity
MU_VACUUM = 0.0   # Vacuum state intensity

# Fraction of pulses at each intensity
SIGNAL_FRACTION = 0.70
DECOY_FRACTION  = 0.20
VACUUM_FRACTION = 0.10

# Relative suppression threshold for Y_1-based PNS detection (LEGACY,
# informational only — retained for backward compatibility with existing
# logs/tests; NOT the decision boundary anymore; see detect_pns_attack).
#
# Post-Campaign-1 fix (2026-09-07): Campaign 1 (frozen verification, 766
# preserved runs) demonstrated that comparing the POINT estimate
# Y_1_L / Y_1_expected against 0.6 achieves only ~55% detection sensitivity
# under a full PNS attack (p=0.8) at N=10,000 — because the LMC lower bound
# is a linear combination of binomial gain estimates whose sampling
# uncertainty (dominant coefficient a_d ~ 13.8 on the ~0.2N decoy subset)
# makes per-run suppression straddle the threshold.  The decision rule was
# therefore replaced by an uncertainty-aware one-sided binomial test on the
# decoy gain (see detect_pns_attack docstring).  The LMC estimator itself
# (estimate_y1_lmc), the intensity configuration {0.5, 0.1, 0.0} and the
# assignment probabilities {0.70, 0.20, 0.10} are UNCHANGED.
#
# Any numeric threshold here is an implementation/testing decision, not a
# universal physical or security constant.
PNS_Y1_SUPPRESSION_THRESHOLD = 0.6

# Significance level for the family of one-sided lower-tail binomial tests
# on the decoy and signal gains (detection fires when either adjusted
# p_value < PNS_DETECTION_ALPHA).  0.01 corresponds to the campaign's
# primary 99% confidence level; the per-test level is
# PNS_DETECTION_ALPHA / 2 (Bonferroni correction for the two gain tests).
PNS_DETECTION_ALPHA = 0.01

# Minimum decoy-subset sample size for a statistically meaningful test.
# Below this, detection is suppressed and reported as insufficient sample.
PNS_DETECTION_MIN_DECOY_N = 30

# ---------------------------------------------------------------------------
# KNOWN SENSITIVITY LIMITATION AT LONG DISTANCE (audit H2 — characterised,
# NOT "fixed")
# ---------------------------------------------------------------------------
# The exact-binomial decision rule above loses statistical power as the
# fiber distance grows. This is a FUNDAMENTAL sampling limitation, not a
# defect in the criterion, and it is deliberately left in place:
#
#   * The per-pulse click probability falls as P_survive = 10^(-0.2*d/10)
#     (0.01 at 100 km, 0.10 at 50 km).
#   * PNS blocking removes a fixed FRACTION of single-photon pulses, but
#     the resulting ABSOLUTE shift in the observed gain k/n shrinks with
#     that same survival factor. At long distance the shift becomes small
#     relative to the dark-count floor (DARK_COUNT_PROB) and to the
#     binomial sampling noise of the small observed click count.
#   * With the maximum supported N = 10,000 and a full PNS attack
#     (p_block = 0.4), a 100 km session yields only a few expected clicks
#     in the decoy subset, so per-run detection collapses toward chance.
#     A frozen verification campaign observed ~2/10 detections at
#     N=10,000, p_block~0.4, d=100 km.
#
# Therefore: detection is reliable at short/medium distance and degrades
# at long distance FOR FEASIBLE N. Do NOT lower PNS_DETECTION_ALPHA or
# otherwise weaken the test to inflate the long-distance pass rate — that
# would trade a real false-positive budget for an unfixable power problem.
# Operators wanting long-distance sensitivity must raise N or reduce the
# distance. This behaviour is documented in PHYSICS_CONTRACT.md Section 16
# and pinned by a characterisation test (expected long-distance miss).
# ---------------------------------------------------------------------------


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
  Compute gain statistics for signal, decoy, and vacuum states.
  
  Gain Q_mu = fraction of pulses at intensity mu that REGISTER a
  detector click (real detection OR dark count). Uses state['index']
  (the original pulse index set by Alice) to correctly map states
  back to their intensity assignment.

  Vacuum dark counts (audit fix H1)
  ---------------------------------
  A vacuum pulse (mu=0) emits no photon, so channel.transmit() marks
  it 'lost' — but the detector can still fire a spurious DARK COUNT in
  that slot (the documented detector model permits a dark count on any
  slot with no real detection). A registered click therefore counts
  toward the gain even when 'lost' is True. The previous definition
  required ``detected and not lost``, which structurally discarded
  every vacuum dark count and forced Y_0 = Q_vac = 0 even in realistic
  detector mode. The dark-count model itself is unchanged; only the
  gain accounting is corrected. PNS-blocked slots still never count
  (the block forces detected=False).
  
  Args:
    states: photon states (possibly after channel/Eve/Bob losses)
    intensities: intensity array from assign_decoy_intensities,
                 indexed by original pulse index
  Returns:
    dict with signal_gain, decoy_gain, vacuum_gain,
    normalized_signal, normalized_decoy, ratio,
    signal_total, decoy_total
  """
  signal_total    = 0
  signal_detected = 0
  decoy_total     = 0
  decoy_detected  = 0
  vacuum_total    = 0
  vacuum_detected = 0

  for state in states:
    original_index = state.get('index')
    if original_index is None or original_index >= len(intensities):
      continue
    mu = intensities[original_index]
    # A registered detector click counts even on a 'lost' (no-photon)
    # slot, because a dark count is a real detector event. PNS-blocked
    # slots are suppressed (detected is forced False by pns.attack) and
    # must never count. (Audit fix H1.)
    detected = bool(state.get('detected', False)) and \
               not state.get('pns_blocked', False)

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

  # Legacy normalized-gain fields kept for backward compatibility with
  # existing tests/logs — no longer used for PNS detection.
  norm_signal = signal_gain / MU_SIGNAL if MU_SIGNAL > 0 else 0.0
  norm_decoy  = decoy_gain  / MU_DECOY  if MU_DECOY  > 0 else 0.0

  return {
    'signal_gain':       signal_gain,
    'decoy_gain':        decoy_gain,
    'vacuum_gain':       vacuum_gain,
    'normalized_signal': norm_signal,
    'normalized_decoy':  norm_decoy,
    'ratio': norm_signal / norm_decoy if norm_decoy > 0 else 1.0,
    'signal_total':      signal_total,
    'decoy_total':       decoy_total,
  }


def estimate_y1_lmc(
  Q_s:   float,
  Q_d:   float,
  Q_vac: float,
  mu_s:  float = MU_SIGNAL,
  mu_d:  float = MU_DECOY,
) -> tuple[float, float]:
  """
  Lo, Ma & Chen (2005) lower bound on the single-photon yield Y_1.

  Reference: PRL 94, 230504 (2005), Eq. (5).

  Y_1^L = mu_s / (mu_s*mu_d - mu_d^2) * [
      Q_d * exp(mu_d)
    - Q_s * exp(mu_s) * (mu_d/mu_s)^2
    - (mu_s^2 - mu_d^2) / mu_s^2 * Y_0
  ]

  Y_0 (vacuum yield) is taken directly from Q_vac (fraction of vacuum
  pulses that register a click — dominated by dark counts).

  Args:
    Q_s:   raw signal gain (fraction detected at mu_s)
    Q_d:   raw decoy  gain (fraction detected at mu_d)
    Q_vac: raw vacuum gain (fraction detected at mu=0; yields Y_0)
    mu_s:  mean photon number for signal pulses (default: MU_SIGNAL)
    mu_d:  mean photon number for decoy  pulses (default: MU_DECOY)
  Returns:
    (Y_1_L, Y_0): lower bound on single-photon yield, vacuum yield
  """
  Y_0 = Q_vac

  denom = mu_s * mu_d - mu_d ** 2          # mu_d * (mu_s - mu_d)

  if abs(denom) < 1e-15:
    # Degenerate — identical intensities, cannot estimate Y_1
    return 0.0, Y_0

  Y_1_L = (mu_s / denom) * (
    Q_d * np.exp(mu_d)
    - Q_s * np.exp(mu_s) * (mu_d ** 2 / mu_s ** 2)
    - (mu_s ** 2 - mu_d ** 2) / mu_s ** 2 * Y_0
  )

  return float(Y_1_L), float(Y_0)


def expected_single_photon_yield(
  distance_km:    float = 0.0,
  eta:            float = DETECTOR_EFFICIENCY,
  dark_count_prob: float = DARK_COUNT_PROB,
  attenuation:    float = ATTENUATION_COEFF_DB_PER_KM,
) -> float:
  """
  Theoretical Y_1 for a single photon in an honest, unattacked channel.

  Y_1_expected = P_survive(d) * eta + P_dark

  This is the detection probability for a genuinely single-photon pulse
  absent any eavesdropping.  Used as the reference against which
  Y_1_L is compared to infer PNS attack.

  Args:
    distance_km:    fiber distance (km)
    eta:            detector efficiency
    dark_count_prob: per-slot dark count probability
    attenuation:    fiber attenuation (dB/km)
  Returns:
    Expected single-photon yield (float)
  """
  loss_dB  = attenuation * distance_km
  p_survive = 10.0 ** (-loss_dB / 10.0)
  return p_survive * eta + dark_count_prob


def _clean_gain_for_intensity(
  mu: float,
  distance_km: float,
  eta: float,
  dark_count_prob: float,
  attenuation: float = ATTENUATION_COEFF_DB_PER_KM,
) -> float:
  """
  Analytic honest-channel gain for intensity mu (implemented model).

  Q_mu_clean = (1 - e^{-mu}) * P_survive * eta
             + dark_count_prob * (1 - (1 - e^{-mu}) * P_survive * eta)

  This mirrors the implemented per-slot channel model (channel.py):
  a non-vacuum pulse slot clicks with probability P_survive*eta, and a
  slot with no real detection fires a dark count with probability
  dark_count_prob.  Vacuum pulses (mu=0) have only the dark-count term.
  Used as the reference probability of the decoy-gain binomial test.
  """
  p_click = (1.0 - math.exp(-mu)) * (10.0 ** (-(attenuation * distance_km) / 10.0)) * eta
  return p_click + dark_count_prob * (1.0 - p_click)


def detect_pns_attack(
  gains:          dict,
  distance_km:    float = 0.0,
  eta:            float = DETECTOR_EFFICIENCY,
  dark_count_prob: float = DARK_COUNT_PROB,
  mu_s:           float = MU_SIGNAL,
  mu_d:           float = MU_DECOY,
) -> dict:
  """
  Detect PNS attack using Lo, Ma & Chen Y_1 lower-bound estimation
  with an uncertainty-aware decision rule.

  Per PHYSICS_CONTRACT Section 16 / LMC (2005):
  Eve's PNS attack selectively blocks single-photon pulses, depressing
  the observed single-photon yield Y_1 and the decoy-intensity gain
  below their honest-channel expectations.

  ESTIMATOR (unchanged): Y_1_L from estimate_y1_lmc() — LMC (2005) Eq. (5),
  mathematically exact; Y_1_expected from expected_single_photon_yield().

  DECISION RULE (post-Campaign-1 fix, 2026-09-07):
  Family of TWO one-sided lower-tail EXACT BINOMIAL TESTS — on the decoy
  gain and on the signal gain — each against its analytic honest-channel
  value:

    p_decoy  = P(K <= k_d | Binomial(n_d, Q_d_clean))
    p_signal = P(K <= k_s | Binomial(n_s, Q_s_clean))

  where k/n are the observed detections/subset sizes per intensity and
  Q_mu_clean is the analytic honest-channel gain (see
  _clean_gain_for_intensity) for the session's (distance, eta,
  dark_count_prob).  Detection fires when

    min(p_decoy, p_signal) < PNS_DETECTION_ALPHA / 2   (Bonferroni-
                                                          corrected family
                                                          level 0.01)

  with a direction guard (a gain only counts when observed BELOW its
  clean expectation).  Testing both gains is justified because PNS
  blocking depresses both: the decoy gain separates best at short
  distance, the signal gain at long distance (larger n_s, larger
  absolute shift); the corrected family level preserves a family-wise
  false-positive rate of 0.01 on clean channels.

  Scientific justification (see Campaign 1 finding + pre-fix analysis):
  the previous rule compared the POINT estimate
  Y_1_L/Y_1_expected < 0.6, ignoring the sampling uncertainty of the
  LMC linear combination (dominant coefficient ~13.8 on the ~0.2N decoy
  subset).  Under full attack the mean suppression sits ~1 sigma below
  0.6, so per-run values straddle the threshold (~55% sensitivity,
  Campaign 1 DECOY-004).  PNS blocking depresses the decoy gain
  deterministically (k_d is Binomial with a shifted probability), and
  the exact binomial tail test is the statistically appropriate
  decision procedure for a binomial observable.  This is a
  decision-rule change only: the LMC estimator, the intensities, and
  the assignment probabilities are unchanged; no threshold was weakened
  (the family level 0.01 matches the campaign's primary 99% confidence;
  the legacy 0.6 suppression threshold is retained only as a reported
  informational constant).

  Guards:
    - n_d < PNS_DETECTION_MIN_DECOY_N (30): no detection; reported as
      insufficient sample.
    - Direction guard: detection requires Q_d < Q_d_clean.

  NOTE: PNS_Y1_SUPPRESSION_THRESHOLD (0.6) is retained and reported
  (threshold_used) for backward compatibility with existing logs and
  tests.  It is an implementation decision constant, not a universal
  physical or security constant.
  
  Args:
    gains:          dict from compute_gains()
    distance_km:    fiber distance used in the session (km)
    eta:            detector efficiency
    dark_count_prob: per-slot dark count probability
    mu_s:           signal intensity
    mu_d:           decoy  intensity
  Returns:
    dict with:
      pns_detected        – bool (binomial-test decision)
      confidence          – float [0, 1] (1 - p_value, clamped)
      y1_lower_bound      – Y_1_L (computed, LMC Eq. 5, unchanged)
      y1_expected         – Y_1_expected (honest channel)
      y1_suppression      – Y_1_L / Y_1_expected ratio (reported statistic)
      threshold_used      – legacy PNS_Y1_SUPPRESSION_THRESHOLD (informational)
      decision_rule       – description of the active decision rule
      decoy_gain_expected – analytic clean Q_d reference used by the test
      decoy_detections    – k_d observed
      decoy_total         – n_d observed
      p_value             – one-sided binomial tail probability
      signal_gain         – raw Q_s
      decoy_gain          – raw Q_d
      # Legacy fields for backward compat:
      gain_difference     – |norm_signal - norm_decoy| (informational only)
  """
  Q_s   = gains['signal_gain']
  Q_d   = gains['decoy_gain']
  Q_vac = gains['vacuum_gain']
  n_d   = int(gains.get('decoy_total', 0))
  k_d   = int(round(Q_d * n_d)) if n_d > 0 else 0
  n_s   = int(gains.get('signal_total', 0))
  k_s   = int(round(Q_s * n_s)) if n_s > 0 else 0

  Y_1_L, Y_0 = estimate_y1_lmc(Q_s, Q_d, Q_vac, mu_s, mu_d)
  Y_1_exp    = expected_single_photon_yield(distance_km, eta, dark_count_prob)

  suppression = Y_1_L / Y_1_exp if Y_1_exp > 0 else 1.0

  # Uncertainty-aware decision: family of two one-sided exact binomial
  # tests (decoy gain AND signal gain, each vs its analytic clean value),
  # Bonferroni-corrected per-test level PNS_DETECTION_ALPHA/2.
  # Rationale: PNS blocking depresses BOTH gains; the decoy gain carries
  # the strongest separation at short distance, the signal gain at long
  # distance (larger n_s and larger absolute shift).  Testing both with a
  # corrected family level keeps the family-wise false-positive rate at
  # PNS_DETECTION_ALPHA (0.01) while maximizing sensitivity across the
  # distance range.
  Q_d_clean = _clean_gain_for_intensity(mu_d, distance_km, eta,
                                        dark_count_prob)
  Q_s_clean = _clean_gain_for_intensity(mu_s, distance_km, eta,
                                        dark_count_prob)
  insufficient = n_d < PNS_DETECTION_MIN_DECOY_N
  per_test_alpha = PNS_DETECTION_ALPHA / 2.0

  def _lower_tail_p(k, n, q_clean, q_obs):
    if n < PNS_DETECTION_MIN_DECOY_N or q_clean <= 0.0 or q_clean >= 1.0:
      return 1.0
    if not (q_obs < q_clean):
      return 1.0  # direction guard: only significantly-LOW gains count
    return float(_binom_dist.cdf(k, n, q_clean))

  p_decoy   = _lower_tail_p(k_d, n_d, Q_d_clean, Q_d)
  p_signal  = _lower_tail_p(k_s, n_s, Q_s_clean, Q_s)
  p_value   = min(p_decoy, p_signal)  # family p-value (min of the two)
  detected  = (not insufficient) and (p_value < per_test_alpha)

  # Confidence: 1 - family p_value clamped to [0, 1]
  confidence = max(0.0, min(1.0, 1.0 - p_value))

  # Legacy gain_difference field — informational only, NOT used for detection
  legacy_diff = abs(
    gains.get('normalized_signal', 0.0) - gains.get('normalized_decoy', 0.0)
  )

  return {
    'pns_detected':        detected,
    'confidence':          float(confidence),
    'y1_lower_bound':      float(Y_1_L),
    'y1_expected':         float(Y_1_exp),
    'y1_suppression':      float(suppression),
    'threshold_used':      PNS_Y1_SUPPRESSION_THRESHOLD,
    'decision_rule':       ('family of one-sided exact binomial tests on '
                            'decoy and signal gains vs analytic clean '
                            'values; per-test alpha = '
                            f'{PNS_DETECTION_ALPHA}/2 (Bonferroni); LMC '
                            'Y1_L estimator unchanged (reported as '
                            'y1_suppression)'),
    'decoy_gain_expected': float(Q_d_clean),
    'signal_gain_expected': float(Q_s_clean),
    'decoy_detections':    k_d,
    'decoy_total':         n_d,
    'signal_detections':   k_s,
    'signal_total':        n_s,
    'p_value_decoy':       float(p_decoy),
    'p_value_signal':      float(p_signal),
    'p_value':             float(p_value),
    'insufficient_sample': bool(insufficient),
    'signal_gain':         Q_s,
    'decoy_gain':          Q_d,
    # Legacy field kept for backward compat with old test assertions
    'gain_difference':     float(legacy_diff),
  }


# Depends on: core/constants.py, core/wcp.py, numpy
# Used by: routers/simulation.py when decoy_enabled=True
