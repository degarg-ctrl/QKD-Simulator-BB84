"""
backend/core/events.py

Event model for BB84 QKD Simulator.

Converts the internal per-pulse state dicts produced by the simulation
pipeline (Alice -> Channel -> Eve -> PNS -> Gates -> Bob) into
serialized PhotonRecord objects, and computes full-simulation
transmission accounting from the COMPLETE state arrays.

Design rules (see docs/PHYSICS_CONTRACT.md "Event Model & Animation"):
1. The backend is the source of truth: every event field reflects an
   actual simulated outcome. The frontend visualizes these fields and
   must never invent scientifically meaningful state.
2. Transmission accounting is computed from the complete arrays —
   NEVER from the truncated bit_stream/event_stream samples.
3. event_stream sampling is DETERMINISTIC given the event records
   (pure stride + deterministic rare-category augmentation), even
   though the simulation itself is stochastic/unseeded.

This module performs no physics: it only reads fields written by
alice.py, channel.py, eve.py, pns.py, wcp.py, gates.py and bob.py.
"""

import math
from typing import Callable

from models.schemas import PhotonRecord

# Maximum number of event records serialized in event_stream.
# Mirrors the historical bit_stream cap (~500) for response size.
EVENT_STREAM_CAP = 500


def build_event_record(state: dict) -> PhotonRecord:
    """
    Build a serialized PhotonRecord from one internal pipeline state.

    Field mapping (all values come from the simulated state — nothing
    is invented here):

      index                     state['index']
      alice_bit / alice_basis   Alice's original choices (never mutated
                                by Eve/gates)
      bob_basis / bob_bit       Bob's measurement (None until measured)
      match                     bob_basis == alice_basis
      polarization_angle        FINAL state angle at Bob (post-Eve,
                                post-gates) — backward compatible
      alice_polarization_angle  Alice's original encoding angle
      alice_state_label         Alice's original state label
      fiber_survived            photon passed the fiber attenuation draw
                                (False for vacuum pulses)
      detector_detected         REAL photon detection (efficiency draw
                                passed, not PNS-blocked, not dark-only)
      dark_count                spurious detector click (no real
                                detection in the slot)
      noise_flipped             channel noise flipped the detected bit
      intercepted / eve_*       Eve intercept-resend outcome
      wcp_*                     photon-number statistics for the pulse
      pns_* / eve_has_copy      PNS attack outcome
      sifted                    entered the sifted key (measured AND
                                basis match)

    Args:
        state: one pulse dict from bob.measure() output
    Returns:
        PhotonRecord ready for JSON serialization
    """
    measured = bool(state.get('measured', False))
    bob_basis = state.get('bob_basis')
    alice_basis = state.get('alice_basis')
    basis_match = (bob_basis is not None and bob_basis == alice_basis)

    pns_blocked = bool(state.get('pns_blocked', False))
    # PNS-blocked pulses never reach the detector. pns.attack() marks
    # them with detected=False / lost=True, but it does NOT clear the
    # channel-stage 'detector_detected' flag, so reconcile here: a
    # blocked pulse can never be a real detection.
    detector_detected = bool(state.get('detector_detected', False)) \
        and not pns_blocked
    # Detector loss uses the same semantics as
    # compute_transmission_accounting(): pulse reached the detector
    # region (survived fiber, not blocked) but the efficiency draw
    # failed. Legacy measured-only records (no channel fields) are not
    # detector losses.
    if state.get('fiber_survived') is None \
            and state.get('detector_detected') is None:
        detector_loss = False
    else:
        detector_loss = (
            not pns_blocked
            and bool(state.get('fiber_survived', True))
            and not detector_detected
        )
    # A dark-count draw only becomes a REGISTERED click if Bob actually
    # measured the slot (a draw on a PNS-blocked slot is suppressed by
    # the block and never registers — do not visualize it as a click).
    dark_count_registered = bool(state.get('dark_count', False)) and measured

    return PhotonRecord(
        index=state.get('index', 0),
        alice_bit=state.get('alice_bit', 0),
        alice_basis=alice_basis or '+',
        bob_basis=bob_basis or '',
        bob_bit=state.get('bob_bit'),
        match=basis_match,
        intercepted=bool(state.get('intercepted', False)),
        lost=bool(state.get('lost', False)),
        polarization_angle=float(state.get('polarization_angle', 0.0)),
        alice_polarization_angle=(
            float(state['alice_polarization_angle'])
            if state.get('alice_polarization_angle') is not None
            else None
        ),
        alice_state_label=state.get('alice_state_label'),
        fiber_survived=bool(state.get('fiber_survived', True)),
        detector_detected=detector_detected,
        detector_loss=detector_loss,
        dark_count=dark_count_registered,
        noise_flipped=bool(state.get('noise_flipped', False)),
        eve_basis=state.get('eve_basis'),
        eve_bit=(
            int(state['eve_bit'])
            if state.get('eve_bit') is not None else None
        ),
        eve_basis_match=(
            bool(state['eve_basis_match'])
            if state.get('eve_basis_match') is not None else None
        ),
        eve_resend_angle=(
            float(state['eve_resend_angle'])
            if state.get('eve_resend_angle') is not None else None
        ),
        wcp_photon_count=(
            int(state['wcp_photon_count'])
            if state.get('wcp_photon_count') is not None else None
        ),
        wcp_vacuum=(
            bool(state['wcp_vacuum'])
            if state.get('wcp_vacuum') is not None else None
        ),
        wcp_single=(
            bool(state['wcp_single'])
            if state.get('wcp_single') is not None else None
        ),
        wcp_multi=(
            bool(state['wcp_multi'])
            if state.get('wcp_multi') is not None else None
        ),
        pns_split=bool(state.get('pns_split', False)),
        pns_blocked=pns_blocked,
        eve_has_copy=bool(state.get('eve_has_copy', False)),
        sifted=bool(measured and basis_match),
    )


def compute_transmission_accounting(states: list[dict]) -> dict:
    """
    Compute full-simulation transmission accounting.

    Computed from the COMPLETE per-pulse state list (all N pulses),
    never from a truncated sample. Invariants (verified by tests):

      generated       = vacuum_pulses + fiber_survived + fiber_lost
      fiber_survived  = real_detections + detector_loss + pns_blocked
      total_detections = real_detections + dark_counts
      sifted         <= total_detections

    Category semantics:
      vacuum_pulses   WCP pulses with n=0 photons — nothing entered
                      the fiber (ideal mode: always 0)
      fiber_survived  pulses whose photon passed the attenuation draw
      fiber_lost      pulses whose photon was absorbed in the fiber
                      (excludes vacuum pulses)
      real_detections photons that actually registered at the detector
                      (efficiency draw passed; excludes PNS-blocked)
      detector_loss   photons that reached the detector region but
                      failed the efficiency draw (a dark count may
                      still occur in such a slot — counted separately)
      dark_counts     spurious detector clicks with no real detection
      pns_blocked     single photons blocked by Eve (never reach Bob)

    Args:
        states: complete measured-state list from bob.measure()
    Returns:
        dict of integer counts (kwargs for TransmissionAccounting)
    """
    generated = len(states)
    vacuum = 0
    fiber_survived = 0
    real_detections = 0
    detector_loss = 0
    dark_counts = 0
    intercepted = 0
    pns_split = 0
    pns_blocked = 0
    eve_copies = 0
    noise_flipped = 0
    sifted = 0

    for s in states:
        is_vacuum = bool(s.get('wcp_vacuum', False))
        survived = bool(s.get('fiber_survived', True))
        blocked = bool(s.get('pns_blocked', False))
        # Reconciled real detection (see build_event_record)
        detected_real = bool(s.get('detector_detected', False)) \
            and not blocked
        dark = bool(s.get('dark_count', False))
        measured = bool(s.get('measured', False))
        bob_basis = s.get('bob_basis')

        if is_vacuum:
            vacuum += 1
        elif survived:
            fiber_survived += 1
            if blocked:
                pns_blocked += 1
            elif detected_real:
                real_detections += 1
            else:
                detector_loss += 1
        # else: absorbed in fiber — only counted in fiber_lost below

        if dark and measured:
            # Registered dark-count click. A dark draw on a PNS-blocked
            # slot is suppressed by the block (detected forced False in
            # pns.attack) and never reaches Bob — not counted.
            dark_counts += 1
        if s.get('intercepted'):
            intercepted += 1
        if s.get('pns_split'):
            pns_split += 1
        if s.get('eve_has_copy'):
            eve_copies += 1
        if s.get('noise_flipped'):
            noise_flipped += 1
        if measured and bob_basis == s.get('alice_basis'):
            sifted += 1

    fiber_lost = generated - vacuum - fiber_survived
    total_detections = real_detections + dark_counts

    return {
        'generated': generated,
        'vacuum_pulses': vacuum,
        'fiber_survived': fiber_survived,
        'fiber_lost': fiber_lost,
        'real_detections': real_detections,
        'detector_loss': detector_loss,
        'dark_counts': dark_counts,
        'total_detections': total_detections,
        'intercepted': intercepted,
        'pns_split': pns_split,
        'pns_blocked': pns_blocked,
        'eve_copies': eve_copies,
        'noise_flipped': noise_flipped,
        'sifted': sifted,
    }


# Visual lane count. A pulse's schematic lane is `index % _NUM_LANES`
# (frontend visualEncoding.laneForIndex and backend gates.apply_gates_to_lane
# both use this mapping). Sampling must respect it because a single global
# stride can land entirely on one residue class (audit C3).
_NUM_LANES = 3

# Rare event categories that must remain representable in the sampled
# event_stream whenever they occurred in the full simulation. If the
# deterministic stride misses every instance of a category that exists,
# the first occurrence is added back (deterministically).
_RARE_EVENT_PREDICATES: list[Callable[[dict], bool]] = [
    lambda s: bool(s.get('pns_split', False)),
    lambda s: bool(s.get('pns_blocked', False)),
    lambda s: bool(s.get('dark_count', False)),
    lambda s: bool(s.get('intercepted', False)),
]


def select_event_stream_indices(
    states: list[dict],
    cap: int = EVENT_STREAM_CAP
) -> list[int]:
    """
    Select a deterministic, representative sample of pulse indices for
    the event_stream.

    Selection procedure (audit fixes H5 — cap is ABSOLUTE — and C3 —
    lane-aware sampling):
    1. n <= cap: every pulse is included (no sampling).
    2. n > cap: reserve capacity for rare-category rescue first —
       take the first occurrence of each rare category present in the
       full stream (PNS split, PNS block, dark count, interception),
       at most len(_RARE_EVENT_PREDICATES) indices.
    3. The remaining stride budget (cap - reserved) is split across the
       _NUM_LANES visual lanes (index % _NUM_LANES) and each lane is
       strided *within itself*; the per-lane picks are then merged.
       A single global stride is NOT used: with lane = index % 3 it can
       select only one residue class (e.g. n=1500, cap=500 -> step=3 ->
       every index % 3 == 0), collapsing the stream onto lane 0 and
       leaving lanes 1/2 visually empty (audit C3). Per-lane striding
       cannot do this and keeps every lane represented whenever it has
       events.

    The total is bounded: per-lane samples <= lane budgets, whose sum is
    (cap - reserved), plus <= reserved rescue indices, so len <= cap
    always. The result is deterministic given the event records: the
    same state list always yields the same index list.

    Args:
        states: complete per-pulse state list
        cap: maximum number of indices to return (hard contract)
    Returns:
        sorted list of selected state indices, len <= cap
    """
    n = len(states)
    if n == 0:
        return []
    if n <= cap:
        return list(range(n))

    # Reserve capacity: first occurrence of each rare category that
    # actually occurred. Deterministic and order-preserving.
    rescue = []
    for predicate in _RARE_EVENT_PREDICATES:
        for i, s in enumerate(states):
            if predicate(s):
                rescue.append(i)
                break

    reserved = len(rescue)
    stride_budget = max(1, cap - reserved)

    # Lane-aware striding: split the stride budget across the visual
    # lanes and stride within each lane's own index sequence. This keeps
    # all lanes represented no matter how n relates to the budget.
    lane_counts = [
        len(range(lane, n, _NUM_LANES)) for lane in range(_NUM_LANES)
    ]
    active_lanes = [l for l in range(_NUM_LANES) if lane_counts[l] > 0]

    selected = set()
    if active_lanes:
        base = stride_budget // len(active_lanes)
        extra = stride_budget - base * len(active_lanes)
        for pos, lane in enumerate(active_lanes):
            budget = base + (1 if pos < extra else 0)
            count = lane_counts[lane]
            if budget <= 0:
                continue
            if budget >= count:
                positions = range(count)
            else:
                step = math.ceil(count / budget)
                positions = range(0, count, step)
            selected.update(lane + _NUM_LANES * p for p in positions)

    selected.update(rescue)

    # Safety net: the bound above guarantees len(selected) <= cap;
    # if it were ever violated, drop stride-only indices (never the
    # rescue indices) so the cap remains absolute.
    if len(selected) > cap:
        keep = set(rescue)
        for i in sorted(selected):
            if len(keep) >= cap:
                break
            keep.add(i)
        selected = keep

    return sorted(selected)

# Depends on: models/schemas.py
# Used by: routers/simulation.py (event model assembly)
