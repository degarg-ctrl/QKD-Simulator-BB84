from pydantic import BaseModel, Field, model_validator
from typing import Literal

class SimulationRequest(BaseModel):
    n_bits: int = Field(default=1000, ge=1, le=10000)
    distance_km: float = Field(ge=0, le=150)
    noise_level: float = Field(ge=0.0, le=1.0)
    attack_prob: float = Field(ge=0.0, le=1.0)
    attack_strategy: Literal['intercept_resend', 'partial', 'burst', 'pns']
    gates: list[dict] = Field(
        default=[],
        description="List of quantum gates placed on lanes. "
                    "Each gate: {'type': str, 'lane': int, 'position': float}"
    )

    experiment_mode: str = Field(
        default='free',
        description="Experiment mode: 'free'|'exp1'|'exp2'|"
                    "'exp3'|'exp4'|'exp5'|'exp6'"
    )

    alice_bits: list[int] | None = Field(
        default=None,
        description="User-defined bits for Exp 2 and 4. "
                    "Max 300 values, each 0 or 1."
    )

    alice_bases: list[str] | None = Field(
        default=None,
        description="User-defined bases for Exp 2 and 4. "
                    "Max 300 values, each '+' or 'x'."
    )

    # WCP and PNS attack settings
    wcp_enabled: bool = Field(
        default=False,
        description="Enable Weak Coherent Pulse model. "
                    "Uses Poisson photon distribution instead "
                    "of ideal single photons."
    )
    mean_photon_number: float = Field(
        default=0.2,
        ge=0.05, le=0.5,
        description="Mean photon number per pulse (mu). "
                    "Only used when wcp_enabled=True. "
                    "Typical range: 0.1 to 0.5"
    )
    decoy_enabled: bool = Field(
        default=False,
        description="Enable decoy state protocol. "
                    "Detects PNS attack via gain statistics. "
                    "Requires wcp_enabled=True."
    )

    seed: int | None = Field(
        default=None,
        description="Optional RNG seed for deterministic replay. When set, "
                    "the whole pipeline is driven by one numpy Generator "
                    "seeded with this value, so identical seeds reproduce "
                    "identical simulations. None -> fresh stochastic run. "
                    "Pseudo-random only (not cryptographic / not a QRNG)."
    )

    @model_validator(mode='after')
    def validate_user_input(self):
        if self.experiment_mode in ('exp2', 'exp4'):
            if self.alice_bits is None or self.alice_bases is None:
                raise ValueError(
                    'alice_bits and alice_bases required for exp2/exp4'
                )
            if len(self.alice_bits) != len(self.alice_bases):
                raise ValueError(
                    'alice_bits and alice_bases must have same length'
                )
            if len(self.alice_bits) > 300:
                raise ValueError(
                    'Maximum 300 photons for user input experiments'
                )
            if not all(b in (0, 1) for b in self.alice_bits):
                raise ValueError('alice_bits must be 0 or 1')
            if not all(b in ('+', 'x') for b in self.alice_bases):
                raise ValueError("alice_bases must be '+' or 'x'")
        return self

class PhotonRecord(BaseModel):
    """
    Per-pulse event record serialized to the frontend.

    Core fields (index..polarization_angle) are backward compatible
    with the v0.4.0 API. All additional fields describe the actual
    simulated event outcome — the frontend must use these instead of
    inventing visual physics:

      alice_polarization_angle / alice_state_label
          Alice's ORIGINAL encoding, captured before Eve/gates can
          transform the state.
      fiber_survived
          True when the pulse traversed the channel model without
          being absorbed (vacuum pulses are always False).
      detector_detected
          True for a REAL photon detection (detector efficiency pass).
          A dark-count-only click has detector_detected=False.
      detector_loss
          True when the pulse survived the fiber and was not blocked
          by Eve, but the detector efficiency draw failed (no real
          detection). Same semantics as TransmissionAccounting's
          `detector_loss` count; a dark count may still fire in such a
          slot (that is tracked separately by `dark_count`).
      dark_count
          True when the detector slot fired spuriously (no real
          detection). Bob's bit for such slots is random.
      noise_flipped
          True when channel noise flipped the detected bit.
      eve_basis / eve_bit / eve_basis_match / eve_resend_angle
          Eve's actual measurement outcome and the polarization she
          re-emitted (backend-authoritative; the frontend must never
          randomize the post-Eve state).
      wcp_photon_count / wcp_vacuum / wcp_single / wcp_multi
          Weak-coherent-pulse photon-number statistics for the slot.
      pns_split / pns_blocked / eve_has_copy
          PNS attack outcomes — split pulses continue to Bob with an
          Eve-retained copy; blocked pulses never reach Bob.
      sifted
          True when the pulse entered the sifted key (detected AND
          basis match; before QBER sample sacrifice).
    """
    # ── Core identity (backward compatible) ──────────────────
    index: int
    alice_bit: int
    alice_basis: str
    bob_basis: str
    bob_bit: int | None = None
    match: bool
    intercepted: bool = False
    lost: bool = False
    polarization_angle: float

    # ── Alice's original encoding (pre-Eve, pre-gates) ───────
    alice_polarization_angle: float | None = None
    alice_state_label: str | None = None

    # ── Channel & detector outcome ───────────────────────────
    fiber_survived: bool | None = None
    detector_detected: bool | None = None
    detector_loss: bool | None = None
    dark_count: bool | None = None
    noise_flipped: bool | None = None

    # ── Eve intercept-resend outcome ─────────────────────────
    eve_basis: str | None = None
    eve_bit: int | None = None
    eve_basis_match: bool | None = None
    eve_resend_angle: float | None = None

    # ── WCP pulse statistics ─────────────────────────────────
    wcp_photon_count: int | None = None
    wcp_vacuum: bool | None = None
    wcp_single: bool | None = None
    wcp_multi: bool | None = None

    # ── PNS attack outcome ───────────────────────────────────
    pns_split: bool | None = None
    pns_blocked: bool | None = None
    eve_has_copy: bool | None = None

    # ── Sifting ──────────────────────────────────────────────
    sifted: bool | None = None

class TransmissionAccounting(BaseModel):
    """
    Full-simulation transmission accounting, computed on the backend
    from the COMPLETE pulse arrays — never from the truncated
    bit_stream/event_stream samples.

    Identities (testable invariants):
      generated            = vacuum_pulses + fiber_survived + fiber_lost
      fiber_survived       = real_detections + detector_loss + pns_blocked
      total_detections     = real_detections + dark_counts
      sifted              <= total_detections

    Notes:
      - fiber_lost counts only pulses that entered the fiber and were
        absorbed (vacuum pulses are counted separately, since no
        photon was ever emitted for them).
      - detector_loss counts pulses that survived the fiber, were not
        blocked by Eve, and failed detector efficiency.
      - dark_counts may occur on any undetected slot (fiber-lost,
        vacuum, or detector-loss slots) — a spurious detector click.
    """
    generated: int
    vacuum_pulses: int = 0
    fiber_survived: int
    fiber_lost: int
    real_detections: int
    detector_loss: int
    dark_counts: int
    total_detections: int
    intercepted: int = 0
    pns_split: int = 0
    pns_blocked: int = 0
    eve_copies: int = 0
    noise_flipped: int = 0
    sifted: int
    event_stream_truncated: bool = False

class SimulationResponse(BaseModel):
    # QBER is None when it could not be estimated (insufficient sifted-key
    # sample). qber_estimated disambiguates "measured 0.0" from
    # "not estimated" so that None is never silently read as 0.0.
    qber: float | None = None
    qber_estimated: bool = False
    skr: float
    sifted_key_length: int
    raw_key_length: int
    efficiency: float
    bit_stream: list[PhotonRecord]
    qber_vs_distance: list[dict]
    skr_vs_distance: list[dict]
    secure_threshold_breached: bool
    cloning_probe_active: bool = False

    # WCP statistics
    wcp_enabled: bool = False
    wcp_stats: dict = Field(default_factory=dict)
    # PNS attack statistics
    pns_stats: dict = Field(default_factory=dict)
    # PNS security assessment (post-Campaign-1 fix: previously computed in
    # the router but never serialized — dead code in the online path).
    # None = not computed (PNS disabled); values otherwise come from
    # core.pns.compute_pns_security().
    pns_compromised: bool | None = None
    effective_skr: float | None = None
    qber_misleading: bool | None = None
    # Decoy state results
    decoy_results: dict = Field(default_factory=dict)

    # ── Event model (v0.5.0) ─────────────────────────────────
    # Representative sample of ALL pulse outcomes (detected, lost,
    # vacuum, blocked, dark counts...), deterministically strided
    # when n > cap. Used by the animation and the Photon Inspector.
    # bit_stream remains the detected-only view for backward
    # compatibility; its length must NOT be interpreted as N.
    event_stream: list[PhotonRecord] = Field(default_factory=list)
    # Full-simulation transmission accounting (complete counts).
    transmission: TransmissionAccounting | None = None
