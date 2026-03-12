from fastapi import APIRouter
from models.schemas import SimulationRequest

router = APIRouter()

@router.post("/simulate")
def simulate(request: SimulationRequest):
    # Simulation logic will be wired here in Sprint 1
    return {"status": "router ready"}
