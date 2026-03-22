from pydantic import BaseModel, Field
from typing import Literal

class SimulationRequest(BaseModel):
    n_bits: int = Field(default=1000, ge=1, le=10000)
    distance_km: float = Field(ge=0, le=150)
    noise_level: float = Field(ge=0.0, le=1.0)
    attack_prob: float = Field(ge=0.0, le=1.0)
    attack_strategy: Literal['intercept_resend', 'partial', 'burst']

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
