from pydantic import BaseModel, Field, model_validator
from typing import Literal

class SimulationRequest(BaseModel):
    n_bits: int = Field(default=1000, ge=1, le=10000)
    distance_km: float = Field(ge=0, le=150)
    noise_level: float = Field(ge=0.0, le=1.0)
    attack_prob: float = Field(ge=0.0, le=1.0)
    attack_strategy: Literal['intercept_resend', 'partial', 'burst']
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
                    "Max 20 values, each 0 or 1."
    )

    alice_bases: list[str] | None = Field(
        default=None,
        description="User-defined bases for Exp 2 and 4. "
                    "Max 20 values, each '+' or 'x'."
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
            if len(self.alice_bits) > 20:
                raise ValueError(
                    'Maximum 20 photons for user input experiments'
                )
            if not all(b in (0, 1) for b in self.alice_bits):
                raise ValueError('alice_bits must be 0 or 1')
            if not all(b in ('+', 'x') for b in self.alice_bases):
                raise ValueError("alice_bases must be '+' or 'x'")
        return self

class PhotonRecord(BaseModel):
    index: int
    alice_bit: int
    alice_basis: str
    bob_basis: str
    bob_bit: int
    match: bool
    intercepted: bool
    lost: bool
    polarization_angle: float

class SimulationResponse(BaseModel):
    qber: float
    skr: float
    sifted_key_length: int
    raw_key_length: int
    efficiency: float
    bit_stream: list[PhotonRecord]
    qber_vs_distance: list[dict]
    skr_vs_distance: list[dict]
    secure_threshold_breached: bool
    cloning_probe_active: bool = False
