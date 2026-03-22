"""
backend/routers/simulation.py

FastAPI router for BB84 QKD Simulator.
Single endpoint: POST /api/simulate

Pipeline order (must follow exactly):
1. Alice generates bits, bases, encodes states
2. QuantumChannel transmits states (applies attenuation, noise, dark counts)
3. Eve intercepts (applies attack strategy)
4. Bob measures received states
5. BB84Protocol sifts, estimates QBER, extracts key
6. Metrics computes SKR, efficiency, chart data
7. Assemble and return SimulationResponse
"""

from fastapi import APIRouter, HTTPException
from models.schemas import SimulationRequest, SimulationResponse, PhotonRecord
from core.alice import Alice
from core.channel import QuantumChannel
from core.eve import Eve
from core.bob import Bob
from core.protocol import BB84Protocol
from core.metrics import compute_skr, compute_efficiency, generate_chart_data

router = APIRouter()

@router.post("/simulate", response_model=SimulationResponse)
def run_simulation(request: SimulationRequest) -> SimulationResponse:
    """
    Run complete BB84 QKD simulation and return results.
    
    Executes the full pipeline:
    Alice → Channel → Eve → Bob → Protocol → Metrics
    
    All physics conform to PHYSICS_CONTRACT.md.
    All parameters validated by Pydantic before reaching this function.
    
    Args:
        request: SimulationRequest with simulation parameters
    Returns:
        SimulationResponse with all metrics, bit stream, and chart data
    Raises:
        HTTPException 500: if simulation fails unexpectedly
    """
    try:
        # Step 1: Alice — random or user-defined
        alice = Alice()
        if request.experiment_mode in ('exp2', 'exp4') \
            and request.alice_bits is not None \
            and request.alice_bases is not None:
            # User-defined bits and bases
            states = alice.encode_user_input(
                request.alice_bits,
                request.alice_bases
            )
            bits = [s['alice_bit'] for s in states]
            bases = [s['alice_basis'] for s in states]
            # n_bits follows user input length
            n_bits_actual = len(states)
        else:
            # Random generation for all other modes
            n_bits_actual = request.n_bits
            bits = alice.generate_bits(n_bits_actual)
            bases = alice.choose_bases(n_bits_actual)
            states = alice.encode_states(bits, bases)

        # Step 2: Channel
        channel = QuantumChannel(
            distance_km=request.distance_km,
            noise_level=request.noise_level
        )
        channel_states = channel.transmit(states)

        # Step 3: Eve
        eve = Eve(
            attack_strategy=request.attack_strategy,
            attack_prob=request.attack_prob
        )
        eve_states = eve.intercept(channel_states)

        # Step 3.5: Apply quantum gates and probes per lane
        from core.gates import apply_gates_to_lane, apply_cloning_probe
        if request.gates:
          gates_by_lane = {}
          clone_probes = []
          
          for gate in request.gates:
            if gate.get('type') in ('clone', 'cnot'):
              clone_probes.append(gate)
            else:
              lane = gate.get('lane', 0)
              if lane not in gates_by_lane:
                gates_by_lane[lane] = []
              gates_by_lane[lane].append(gate)
          
          # Apply regular gates lane by lane
          for lane_index, lane_gates in gates_by_lane.items():
            eve_states = apply_gates_to_lane(
              eve_states, lane_index, lane_gates
            )
          
          # Apply cloning probes
          for probe in clone_probes:
            eve_states = apply_cloning_probe(
              eve_states,
              probe.get('lane', 0),
              probe.get('position', 0.5)
            )

        # Step 4: Bob
        bob = Bob()
        measured_states = bob.measure(eve_states)

        # Step 5: Protocol
        protocol = BB84Protocol()
        sift_result = protocol.sift(measured_states)
        qber_result = protocol.estimate_qber(sift_result)
        key_result = protocol.extract_key(qber_result)

        # Step 6: Metrics
        skr = compute_skr(
            sifted_key_length=sift_result['sifted_count'],
            raw_key_length=n_bits_actual,
            qber=qber_result['qber']
        )
        efficiency = compute_efficiency(
            sifted_key_length=sift_result['sifted_count'],
            raw_key_length=n_bits_actual
        )
        chart_data = generate_chart_data(
            noise_level=request.noise_level,
            attack_prob=request.attack_prob,
            attack_strategy=request.attack_strategy
        )

        # Step 7: Assemble bit_stream for frontend
        # Include only detected photons, capped at 500 for response size
        bit_stream = []
        detected_states = [p for p in measured_states if p.get('measured')]
        for p in detected_states[:500]:
            bit_stream.append(PhotonRecord(
                index=p['index'],
                alice_bit=p['alice_bit'],
                alice_basis=p['alice_basis'],
                bob_basis=p['bob_basis'] or '',
                bob_bit=p['bob_bit'] if p['bob_bit'] is not None else 0,
                match=p['bob_basis'] == p['alice_basis'],
                intercepted=p.get('intercepted', False),
                lost=p.get('lost', False),
                polarization_angle=float(p.get('polarization_angle', 0.0))
            ))

        return SimulationResponse(
            qber=round(qber_result['qber'], 6),
            skr=round(skr, 6),
            sifted_key_length=sift_result['sifted_count'],
            raw_key_length=n_bits_actual,
            efficiency=round(efficiency, 4),
            bit_stream=bit_stream,
            qber_vs_distance=chart_data['qber_vs_distance'],
            skr_vs_distance=chart_data['skr_vs_distance'],
            secure_threshold_breached=qber_result['threshold_breached'],
            cloning_probe_active=any(
              g.get('type') in ('clone', 'cnot') 
              for g in request.gates
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Simulation failed: {str(e)}"
        )

from core.experiments import get_all_experiments, get_experiment_preset

@router.get("/experiments")
def list_experiments():
    """
    Return all experiment preset configurations.
    Used by frontend to populate experiment modals.
    """
    return {"experiments": get_all_experiments()}

@router.get("/experiments/{exp_id}")
def get_experiment(exp_id: str):
    """
    Return a single experiment preset by ID.
    """
    preset = get_experiment_preset(exp_id)
    if not preset:
        raise HTTPException(
            status_code=404,
            detail=f"Experiment '{exp_id}' not found"
        )
    return preset
