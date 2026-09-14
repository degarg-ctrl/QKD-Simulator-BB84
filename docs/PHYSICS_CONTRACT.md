# BB84 QKD Simulator â Physics Ground Truth
All simulation code must conform exactly to this document.
Any deviation is a bug, not a design choice.

## 1. Basis System
Two bases: Rectilinear (+) and Diagonal (x)
Alice and Bob each choose basis randomly, probability 0.5 each.
Basis match probability 0.5 â sifting retains ~50% of raw bits.

## 2. Polarization Encoding
Basis | Bit | State | Angle
+     |  0  | |0>   |   0 degrees
+     |  1  | |1>   |  90 degrees
x     |  0  | |+>   |  45 degrees
x     |  1  | |->   | 135 degrees

## 3. Measurement Rules
Correct basis: Bob measures Alice's bit perfectly.
Wrong basis: Bob gets random bit, equal probability 0 or 1.
Only error source in noiseless no-Eve scenario.

## 4. Channel Model

loss_dB   = ATTENUATION_COEFF * distance_km
P_survive = 10^(-loss_dB / 10)
P_click   = P_survive * eta
P_detect  = P_click + P_dark * (1 - P_click)

Detector modes:
  idealized:  eta = 1.0,  P_dark = 0
  realistic:  eta = 0.85, P_dark = 1e-5

The router couples the detector mode to the source model (an
implementation coupling, not a physical necessity):
  wcp_enabled=False -> idealized detector (textbook BB84)
  wcp_enabled=True  -> realistic detector (eta from
                       DETECTOR_EFFICIENCY, dark from
                       DARK_COUNT_PROB)

## 5. Eve Intercept-Resend
Eve intercepts each photon with probability attack_prob.
Eve picks random basis, measures, re-emits in measured state.
Eve basis != Alice basis: 50% chance Bob gets wrong bit.
attack_prob = 1.0 â QBER contribution = 0.25 exactly.
attack_prob = p   â QBER contribution = 0.25 * p.
Eve QBER and channel noise QBER are cumulative.

## 6. QBER
Sample 10% of sifted bits. Sampled bits discarded from final key.
QBER = erroneous_bits / total_sampled_sifted_bits
QBER >= 0.11 â SKR = 0, session aborted, threshold_breached = True

### 6.1 AUTHORITATIVE ANALYTICAL QBER MODEL (single source of truth)
There is exactly ONE analytical QBER equation. It is implemented in
`core/metrics.py:theoretical_qber()` and MUST be used by both the
simulator's validation tests and the chart/theoretical curve
(`metrics.generate_chart_data()`). Competing additive approximations
(e.g. `noise + 0.25*attack + dark`) are NOT permitted (audit fix H4).

Sifted-bit error probability from channel noise pn and intercept-
resend eavesdropping at rate p (multiplicative combination):

    Q_signal = pn + p/4 - (p/2)*pn

  - p/4        Eve mis-guesses the basis with prob 1/2; on a
               mis-guess Bob's sifted bit is wrong with prob 1/2.
  - pn         channel noise flips the physical bit before Eve.
  - -(p/2)*pn  removes the double-counted "both flipped" term.

Dark counts are a separate detection population carrying a uniformly
random bit (50% error). With dark_fraction = P(detection is a dark
count), the populations combine by mixture:

    Q = Q_signal * (1 - dark_fraction) + 0.5 * dark_fraction

Detector modes for the chart use the same coupling as Section 4
(ideal: eta=1, dark=0; realistic: eta=DETECTOR_EFFICIENCY,
dark=DARK_COUNT_PROB).

## 6a. QBER Small-Sample Semantics (audit fix C1, 2026-09-14)

QBER is reported ONLY when the sacrificed sample is large enough to be
meaningful. The sample is SAMPLE_FRACTION_FOR_QBER (0.10) of the sifted
key; the minimum accepted sample is QBER_MIN_SAMPLE_SIZE = 10 sampled
sifted bits, which corresponds to a minimum sifted key of
QBER_MIN_SIFTED_COUNT = ceil(10 / 0.10) = 100 bits.

  sifted_count < 100   ->  qber = None, qber_estimated = False
                           (NOT ESTIMATED; must never be reported as 0.0)
                           no bits are sacrificed
  sifted_count >= 100  ->  qber = errors / sample_size,
                           qber_estimated = True
                           sample bits discarded per Section 6

Rules:
  - "Not estimated" MUST NOT be coerced to 0.0 anywhere (core, API
    schema, or frontend). The API exposes qber (float | None) and
    qber_estimated (bool); the frontend distinguishes the two.
  - When qber is None, SKR = 0 (security cannot be certified) and key
    extraction aborts — but this is an UNKNOWN QBER, not a measured 0.
  - threshold_breached is False for an unestimated QBER only in the sense
    that no threshold decision was made; consumers MUST consult
    qber_estimated before treating a session as secure.
  - A QBER of exactly 0.0 is only ever reported for a sufficient sample
    that genuinely contained zero errors.

This supersedes the historical behaviour in which
sample_size = floor(0.10 * sifted_count) could be 0 for sifted_count < 10,
silently reporting qber = 0.0. Historical Campaign 1 results predate this
change and remain historical evidence; they are not retroactively
restated as if the fix had existed during Campaign 1.

## 7. SKR
H(Q) = -Q*log2(Q) - (1-Q)*log2(1-Q)
R    = S * (1 - 2 * H(Q))
QBER >= 0.11: R = 0 unconditionally

## 8. Validation Benchmarks
No Eve, 0km, noise=0.00 â QBER ~0%
No Eve, 0km, noise=0.05 â QBER ~5%
Eve attack_prob=1.0     â QBER ~25%
Eve attack_prob=0.5     â QBER ~12.5%
distance=50km           â P_survive ~10%
distance=100km          â P_survive ~1%

## 9. Authoritative Constants
ATTENUATION_COEFF_DB_PER_KM = 0.2
DETECTOR_EFFICIENCY         = 0.85
DARK_COUNT_PROB             = 1e-5
QBER_SECURITY_THRESHOLD     = 0.11
SAMPLE_FRACTION_FOR_QBER    = 0.10
QBER_MIN_SAMPLE_SIZE        = 10    # min sampled sifted bits for an estimate
QBER_MIN_SIFTED_COUNT       = 100   # = ceil(10 / 0.10); below -> not estimated

## 10. Quantum Gate Transformations
Applied to photon polarization states per lane in order.
Gates are applied AFTER channel transmission, BEFORE Bob measures.

Lane identity (audit M14). "Lane" is a deterministic VISUALIZATION
partition, not a physical per-lane channel: photon i is drawn on lane
`i % 3` (frontend `visualEncoding.laneForIndex`, backend
`apply_gates_to_lane`/`apply_cloning_probe`). All pulses travel the same
physical fiber. Drag-and-drop gate/probe placement selects a subset of
pulses by this partition, so a gate on lane L acts exactly on the pulses
with `index % 3 == L`. This is a UX affordance for demonstrating a gate/
probe on part of the traffic; it does not imply three independent fibers.

H (Hadamard):
  |0> ? |+>  (0° ? 45°)
  |1> ? |->  (90° ? 135°)
  |+> ? |0>  (45° ? 0°)
  |-> ? |1>  (135° ? 90°)

X (Pauli-X / Bit-flip):
  |0> ? |1>  (0° ? 90°)
  |1> ? |0>  (90° ? 0°)
  |+> ? |+>  (45° ? 45°, invariant)
  |-> ? |->  (135° ? 135°, invariant)

Z (Pauli-Z / Phase-flip):
  |0> ? |0>  (0° unchanged)
  |1> ? |1>  (90° unchanged, global phase only)
  |+> ? |->  (45° ? 135°)
  |-> ? |+>  (135° ? 45°)

Y (Pauli-Y / Bit+Phase flip):
  |0> ? |1>  (0° ? 90°)
  |1> ? |0>  (90° ? 0°)
  |+> ? |->  (45° ? 135°)
  |-> ? |+>  (135° ? 45°)

S (Phase gate p/2):
  |0> ? |0>  (unchanged)
  |1> ? |1>  (unchanged: bit/basis preserved; S has no effect on a
               rectilinear |1> measurement outcome)
  |+> ? polarization_angle += 22.5°
  |-> ? polarization_angle -= 22.5°

T (Phase gate p/4):
  |0> ? |0>  (unchanged)
  |1> ? |1>  (unchanged: bit/basis preserved; T has no effect on a
               rectilinear |1> measurement outcome)
  |+> ? polarization_angle += 11.25°
  |-> ? polarization_angle -= 11.25°

S and T are PHASE-ONLY gates (audit M3). They do not change the
measured bit/basis for rectilinear states and therefore add no QBER by
themselves; only the diagonal-basis polarization_angle rotates (rounded
to 67/112 for S and 56/124 for T in GATE_TRANSFORMS). The angle rotation
is the visual indication; no separate photon color tint is applied.

Gate application rule:
  - Gates apply only to photons on the matching lane (`index % 3`,
    Section 10 lane identity)
  - Multiple gates on same lane apply left to right
  - Gate transformations update both 'bit', 'basis', 
    'state_label' and 'polarization_angle' fields
  - 'alice_bit' and 'alice_basis' are NEVER modified by gates

## 11. No-Cloning Theorem (Exp 6)
A quantum state cannot be perfectly duplicated.
Eve cloning attempt via CNOT entanglement (control = photon, target =
blank probe |0>). Reference implementation: `core/gates.py:
apply_cloning_probe()`.

CNOT outcome per BB84 state:
  Rectilinear '+' states are CNOT eigenstates and INVARIANT:
      |0>|0> -> |0>|0>       (0 degrees, no added error)
      |1>|0> -> |1>|1>       (90 degrees, no added error)
  Diagonal 'x' states become entangled:
      |+>|0> -> (|00>+|11>)/sqrt(2)
      |->|0> -> (|00>-|11>)/sqrt(2)
    The photon's reduced state is maximally mixed, so its sifted bit
    is uniformly random in the diagonal basis (50% error).

  QBER impact: adds ~25% error above channel baseline
    = P(x basis) * 50% = 0.5 * 0.5 = 0.25 exactly.
  Visual: lane color shifts red after Cloning Probe position;
          the entangled (diagonal-basis) photon polarization_angle is
          randomized (45/135); Bob receives a degraded state.

This is a simplified two-state CNOT demonstration of the no-cloning
theorem, NOT an optimal universal (1->2) cloner and NOT a claim of a
standard cryptographic attack. It must NOT be implemented as a
full-randomization tap over all four BB84 states (that yields ~50%
disturbance and is physically incorrect for the CNOT model; audit
fix H3).

## 12. Single Photon Mode
  n_bits = 1 triggers single photon transmission mode
  Full pipeline applies to exactly 1 photon
  QBER estimation skipped  insufficient sample size

  Step-by-step journey (audit M8): there is NO separate `journey`/`log`
  key in the API response. The per-pulse journey is carried by the
  event model: every pulse in `event_stream` (and the legacy
  detected-only `bit_stream`) is a PhotonRecord whose fields describe
  the whole path, in order:
    - index, alice_bit, alice_basis, alice_polarization_angle,
      alice_state_label            (Alice encoding)
    - fiber_survived, wcp_*        (channel survival / loss, WCP n)
    - intercepted, eve_basis, eve_bit, eve_basis_match,
      eve_resend_angle             (Eve, if active)
    - pns_split / pns_blocked / eve_has_copy   (PNS, if active)
    - detector_detected, detector_loss, dark_count, noise_flipped
                                   (detector outcome)
    - bob_basis, bob_bit, match, sifted        (Bob measurement/result)
  The frontend Photon Inspector renders exactly these fields; it does
  not invent journey steps.

## 13. One-Time Pad (OTP) Encryption
The BB84 sifted key is used as a one-time pad key.
XOR encryption: C = M XOR K (ciphertext = message XOR key)
XOR decryption: M = C XOR K (identical operation)
Perfect secrecy conditions (Shannon, 1949) — as they apply to this
SIMULATOR's demonstration:
  1. Key must be random — here: pseudorandom (NumPy PRNG), which is
     suitable for statistical simulation but is NOT a cryptographic
     RNG. Real deployments require a quantum RNG.
  2. Key must be used only once - enforced by resetting
  3. Key must be at least as long as the message
  4. Key must be secret — within the simulated threat model (QBER
     below threshold, no PNS compromise). This simulator does not
     prove real-world unconditional security; it demonstrates the
     protocol mechanics.
ASCII encoding: each character = 8 bits
Maximum message length = floor(sifted_key_bits / 8)
## 14. Weak Coherent Pulse (WCP) Model
Real photon sources emit Poisson-distributed photon numbers.
Ideal single-photon sources do not exist in practice.
Laser pulses attenuated to mean photon number mu (mu).

Poisson distribution:
  P(n|mu) = e^(-mu) * mu^n / n!
  where n = number of photons in pulse, mu = mean photon number

Typical values:
  mu = 0.1 -> P(0)=90.5%, P(1)=9.0%, P(2+)=0.5%
  mu = 0.2 -> P(0)=81.9%, P(1)=16.4%, P(2+)=1.8%
  mu = 0.5 -> P(0)=60.7%, P(1)=30.3%, P(2+)=9.0%

Default simulator value: mu = 0.2
Configurable range: 0.05 to 0.5

Multi-photon probability (PNS vulnerability):
  P(n>=2|mu) = 1 - e^(-mu) - mu*e^(-mu)
  At mu=0.2: P(multi) ~ 1.75%

Vacuum pulses and the vacuum yield Y_0:
  A vacuum pulse (n=0) emits no photon, so it does not enter the
  fiber. The detector may STILL register a spurious dark-count click
  in its time slot (Section 4 detector model). Therefore, in realistic
  detector mode, the vacuum gain Q_vac = Y_0 is the dark-count
  probability (~DARK_COUNT_PROB), NOT structurally zero. Gain
  accounting must count a registered dark-count click on a vacuum slot
  (audit fix H1). The dark-count physical model is unchanged.

WCP effect on SKR:
  Effective single-photon rate: S_wcp = S * mu * e^(-mu)
  Multi-photon fraction increases PNS vulnerability

## 15. PNS Attack (Photon Number Splitting)
Exploits multi-photon pulses in WCP sources.
Eve performs Quantum Non-Demolition (QND) measurement
to count photons without measuring polarization.

Pipeline placement (audit M7): in this simulator PNS is a
POST-CHANNEL process. It runs after fiber attenuation, detector
efficiency/dark counts and (for non-PNS strategies) after Eve, on the
already channel-processed pulses. It blocks single-photon pulses and
splits multi-photon pulses on the states that physically reached Eve's
tap (fiber_survived=True); pulses absorbed in the fiber are untouched.
Reference implementation: core/pns.py PNSAttack.attack().

Attack procedure:
  Single-photon pulses (n=1):
    Eve blocks with probability p_block
    Bob sees increased channel loss
  Multi-photon pulses (n>=2):
    Eve splits one photon, stores in quantum memory
    Forwards remaining photons to Bob via lossless channel
    After basis reconciliation: Eve measures in correct basis

Critical property: QBER ~ 0% -- UNDETECTABLE by threshold
Eve gains complete information on split photons.

Detection: ONLY via decoy state protocol (Section 16)
Standard 11% QBER threshold CANNOT detect PNS attack.

Simulation parameters:
  p_block: probability Eve blocks single-photon pulses (0-1)
  p_split: probability Eve splits multi-photon pulses (0-1)
  Eve's information gain (per transmitted pulse):
      leaked_information = p_split * P(n>=2|mu)
  This is already a per-transmitted-pulse fraction; it is NOT divided
  by total_bits again (audit C2).

SKR under PNS attack (all quantities per TRANSMITTED pulse):
  R_pns = S * (1 - 2*H(Q)) - leaked_information
  leaked_information = p_split * P(n>=2|mu)
  If leaked_information >= R_pns: session compromised

Unit rule (audit C2): the SKR S*(1-2*H(Q)) is normalised per
transmitted pulse (sifted/raw). The leakage subtracted from it must use
the SAME denominator. core/pns.py exposes
`leaked_fraction_per_transmitted_pulse` for this; the legacy
`leak_fraction` (per detected pulse) is informational only and MUST NOT
be subtracted from the per-transmitted SKR.

## 16. Decoy State Protocol
Countermeasure against PNS attack.
Alice randomly sends pulses with different mean photon numbers.

Three intensity levels:
  Signal states:  mu_s = 0.5  (most pulses, ~70%)
  Decoy states:   mu_d = 0.1  (random subset ~20%)
  Vacuum states:  mu_v = 0.0  (random subset ~10%)

Single-photon yield estimator (reported statistic):
  Y_1 lower bound via Lo, Ma & Chen (2005) PRL 94, 230504, Eq. (5),
  using the measured signal/decoy/vacuum gains.

DECISION RULE (active, post-Campaign-1 fix 2026-09-07):
Family of TWO one-sided lower-tail EXACT BINOMIAL TESTS — on the
decoy gain and on the signal gain — each against its analytic
honest-channel value Q_mu_clean:

  p_decoy  = P(K <= k_d | Binomial(n_d, Q_d_clean))
  p_signal = P(K <= k_s | Binomial(n_s, Q_s_clean))

PNS is detected when
  min(p_decoy, p_signal) < PNS_DETECTION_ALPHA / 2
with PNS_DETECTION_ALPHA = 0.01 (Bonferroni-corrected family level),
a direction guard (only significantly-LOW gains count), and a
minimum decoy sample size (n_d >= 30).

The legacy rule "Y1_L / Y1_expected < 0.6" is RETIRED as a decision
criterion (insufficient sensitivity, Campaign 1 finding). The 0.6
constant remains only as a reported informational threshold
(threshold_used). It must NOT be presented as the current scientific
decision criterion.

Reference implementation: core/decoy.py detect_pns_attack().

KNOWN SENSITIVITY LIMITATION AT LONG DISTANCE (audit H2):
The binomial decision rule loses statistical power as distance grows.
This is a FUNDAMENTAL sampling limitation, not a defect, and it is
deliberately NOT "fixed" by weakening the criterion. At distance d the
per-pulse click probability is scaled by P_survive = 10^(-0.2*d/10)
(0.10 at 50 km, 0.01 at 100 km). PNS blocking removes a fixed fraction
of single-photon pulses, but the resulting ABSOLUTE shift in the
observed gain shrinks by the same survival factor, becoming small
relative to the dark-count floor and to the binomial noise of the few
observed clicks. With the maximum supported N=10,000 and a full PNS
attack (p_block~0.4), a 100 km session yields few expected clicks in
the decoy subset, so per-run detection collapses toward chance
(observed ~2/10 in a frozen campaign). Detection is reliable at
short/medium distance and degrades at long distance for feasible N.
Do NOT reduce PNS_DETECTION_ALPHA or otherwise weaken the test to
inflate the long-distance pass rate. Use a larger N or a shorter
distance for long-distance sensitivity. Pinned by a characterisation
test that expects the long-distance miss.

## 17. Event Model (v0.5.0)

The API serializes per-pulse event records reflecting the ACTUAL
simulated outcome of every pipeline stage. The frontend animation is
a VISUALIZATION of these records — it must never invent scientifically
meaningful state.

PhotonRecord event fields (all backend-authoritative):
  alice_bit / alice_basis / alice_polarization_angle
      Alice's original encoding (frozen before Eve/gates).
  fiber_survived
      The photon passed the fiber attenuation draw (False for WCP
      vacuum pulses — no photon was emitted).
  detector_detected
      A REAL photon detection (efficiency draw passed; excludes
      PNS-blocked pulses and dark-count-only clicks).
  dark_count
      A REGISTERED spurious detector click (no real detection in
      the slot). Bob's bit for such slots is random.
  noise_flipped
      Channel noise flipped the detected bit.
  intercepted / eve_basis / eve_bit / eve_basis_match /
  eve_resend_angle
      Eve's intercept-resend outcome. eve_resend_angle is the
      polarization Eve actually re-emits — the frontend renders
      exactly this value after the photon passes Eve.
  wcp_photon_count / wcp_vacuum / wcp_single / wcp_multi
      Photon-number statistics of the WCP pulse (ideal mode: null).
  pns_split / pns_blocked / eve_has_copy
      PNS outcomes. Split pulses continue to Bob with an Eve-retained
      copy; blocked pulses never reach Bob.
  sifted
      The pulse entered the sifted key (measured AND basis match,
      before QBER sample sacrifice).

Event semantics guard: Eve (intercept-resend) and PNS only interact
with pulses that physically reached Eve's position — slots with
fiber_survived=False were absorbed in the fiber BEFORE Eve and can
be neither intercepted, blocked, nor split. Attack probabilities
are unchanged; this is a pipeline-order reachability constraint.

Streams:
  bit_stream    — legacy detected-only view (cap 500). Its length
                  must NOT be interpreted as N.
  event_stream  — representative sample of ALL pulse outcomes
                  (ABSOLUTE cap 500, deterministic stride with
                  capacity reserved for rare-category rescue, so the
                  cap can never be exceeded — audit fix H5). Used by
                  the animation and inspector.
  transmission  — full-simulation accounting (see Section 18).

## 18. Transmission Accounting

Computed on the backend from the COMPLETE pulse arrays — never from
the truncated bit_stream/event_stream samples. Invariants:

  generated        = vacuum_pulses + fiber_survived + fiber_lost
  fiber_survived   = real_detections + detector_loss + pns_blocked
  total_detections = real_detections + dark_counts
  sifted          <= total_detections

Category semantics:
  vacuum_pulses    WCP pulses with n=0 (ideal mode: 0)
  fiber_lost       photons absorbed in the fiber (excludes vacuum)
  real_detections  photons that actually registered at the detector
  detector_loss    photons that reached Bob but failed the
                   efficiency draw (a dark count may still fire in
                   such a slot — counted separately)
  dark_counts      registered spurious clicks (suppressed on
                   PNS-blocked slots, which force detected=False)
  pns_blocked      single photons blocked by Eve

The frontend Transmission HUD and Transmission panel display these
backend counts; playback counters only indicate animation progress.

## 19. Visualization Rules

1. BACKEND = SOURCE OF TRUTH. Every scientifically meaningful
   visual property (state, basis, polarization, survival, detection,
   attack outcomes, noise) comes from backend event records. The
   frontend must not randomize physics.

2. The three canvas lanes are PURELY VISUAL — they represent ONE
   physical channel, split only so particles remain readable. Lane
   assignment (index % 3) is deterministic and matches the backend
   gate-lane mapping. No physics depends on the lane.

3. The particle representation is SYMBOLIC: a circular body with a
   polarization line indicating the BB84 state angle. It is not a
   quantum wavefunction render. WCP multiplicity is shown as
   orbiting satellite dots (a pulse cluster, not literal photons).

4. Deterministic visual-only derivations are permitted (lane
   assignment, fiber-loss position fraction, cosmetic phases) and
   must be stable functions of the event records. The fiber-loss
   detach point and the diagonal exit trajectory are VISUALIZATION
   representations of the backend fiber_survived outcome — they are
   not physical position measurements. A fiber-lost photon detaches
   from its lane at the deterministic position and drifts out of the
   channel envelope while fading; a detector-loss photon stays on
   its lane and terminates at Bob without a detection flash.

5. The animation is a PLAYBACK of completed simulation events, not
   a live physics engine: backend completes → frontend schedules →
   visual playback with staggered, overlap-free launches.

6. Aggregate numbers shown to the user (HUD, panels) come from the
   backend transmission accounting, never from counting rendered
   particles.