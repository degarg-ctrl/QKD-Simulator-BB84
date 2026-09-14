"""
backend/routers/simulation.py

FastAPI router for BB84 QKD Simulator.
Single endpoint: POST /api/simulate

Pipeline order (actual, as implemented by run_simulation):
1. Alice generates bits/bases and encodes states (or user input for
   exp2/exp4)
2. WCP model (optional): Poisson photon numbers / decoy intensities
   are attached to the states BEFORE the channel
3. QuantumChannel transmits states. Fiber attenuation, detector
   efficiency and dark counts are all applied HERE, i.e. BEFORE Eve,
   PNS and gates. Vacuum pulses are forced lost at this stage.
4. Eve intercepts (intercept_resend / partial / burst). She only
   interacts with pulses that physically reached her
   (fiber_survived=True).
5. PNS attack (optional): operates POST-channel on the already
   channel-processed pulses, blocking single photons and splitting
   multi-photon pulses (see core/pns.py and PHYSICS_CONTRACT Section 15).
6. Quantum gates + cloning probes (optional) are applied per lane
   AFTER Eve/PNS, BEFORE Bob.
7. Bob measures the surviving states.
8. BB84Protocol sifts, estimates QBER, extracts key.
9. Metrics computes SKR, efficiency, chart data.
10. Assemble and return SimulationResponse (including the event model).
"""

from fastapi import APIRouter, HTTPException
from models.schemas import (
    SimulationRequest,
    SimulationResponse,
    PhotonRecord,
    TransmissionAccounting,
)
from core.alice import Alice
from core.channel import QuantumChannel
from core.eve import Eve
from core.bob import Bob
from core.protocol import BB84Protocol
from core.metrics import compute_skr, compute_efficiency, generate_chart_data
from core.constants import DETECTOR_EFFICIENCY, DARK_COUNT_PROB
from core.wcp import (poisson_photon_counts, 
                      classify_pulses, 
                      apply_wcp_to_states)
from core.pns import PNSAttack, compute_pns_security
from core.decoy import (assign_decoy_intensities,
                        compute_gains, detect_pns_attack)
from core.rng import create_rng
import numpy as np

router = APIRouter()

@router.post("/simulate", response_model=SimulationResponse)
def run_simulation(request: SimulationRequest) -> SimulationResponse:
    """
    Run complete BB84 QKD simulation and return results.

    Executes the full pipeline:
    Alice → WCP → Channel → Eve → PNS → Gates/Probes → Bob
          → Protocol → Metrics → Response

    Detector efficiency and dark counts are part of Channel transmission
    (step 3), so they occur before Eve/PNS/gates; gates therefore act on
    already channel-processed states.

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
        # Single controlled RNG for the whole run (audit fix H7).
        # Seeded when request.seed is set -> deterministic replay;
        # otherwise a fresh stochastic generator.
        rng = create_rng(request.seed)

        # Step 1: Alice — random or user-defined
        alice = Alice(rng=rng)
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
        # Ideal mode (wcp_enabled=False): perfect detectors — eta=1.0, no dark counts.
        # This gives the textbook BB84 result: 100% detection at 0km, ~50% sifted key.
        # Realistic mode (wcp_enabled=True): physical detector — eta=0.85, dark counts active.
        channel = QuantumChannel(
            distance_km=request.distance_km,
            noise_level=request.noise_level,
            detector_efficiency=DETECTOR_EFFICIENCY if request.wcp_enabled else 1.0,
            dark_count_prob=DARK_COUNT_PROB if request.wcp_enabled else 0.0,
            rng=rng,
        )

        # Step 1.5: WCP model — apply Poisson photon distribution
        wcp_stats = {}
        decoy_intensities = None
        if request.wcp_enabled:
          if request.decoy_enabled:
            # Assign varying intensities for decoy protocol
            decoy_intensities = assign_decoy_intensities(
              n_bits_actual, rng
            )
            # Generate photon counts per intensity
            photon_counts = np.array([
              rng.poisson(mu) 
              for mu in decoy_intensities
            ])
          else:
            # Uniform mean photon number
            photon_counts = poisson_photon_counts(
              n_bits_actual, 
              request.mean_photon_number, 
              rng
            )
          
          states = apply_wcp_to_states(states, photon_counts)
          wcp_stats = classify_pulses(photon_counts)

        channel_states = channel.transmit(states)

        # Step 3: Eve
        eve = Eve(
            attack_strategy=request.attack_strategy if request.attack_strategy != 'pns' else 'intercept_resend',
            attack_prob=request.attack_prob if request.attack_strategy != 'pns' else 0.0,
            rng=rng,
        )
        eve_states = eve.intercept(channel_states)

        # Step 3.2: PNS attack
        pns_stats = {}
        pns_security = {}
        if (request.wcp_enabled and 
            request.attack_strategy == 'pns'):
          pns = PNSAttack(
            p_block=request.attack_prob * 0.5,
            p_split=request.attack_prob
          )
          eve_states, pns_stats = pns.attack(
            eve_states, rng
          )

        # Step 3.5: Apply quantum gates and probes on the single transmission lane
        from core.gates import apply_gates_to_lane, apply_cloning_probe
        if request.gates:
          regular_gates = []
          clone_probes = []
          
          for gate in request.gates:
            if gate.get('type') in ('clone', 'cnot'):
              clone_probes.append(gate)
            else:
              regular_gates.append(gate)
          
          # Apply regular gates to the transmission lane
          if regular_gates:
            eve_states = apply_gates_to_lane(
              eve_states, 0, regular_gates
            )
          
          # Apply cloning probes to the transmission lane
          for probe in clone_probes:
            eve_states = apply_cloning_probe(
              eve_states,
              0,
              probe.get('position', 0.5),
              rng=rng,
            )

        # Step 4: Bob
        bob = Bob(rng=rng)
        measured_states = bob.measure(eve_states)

        # Step 5: Protocol
        protocol = BB84Protocol(rng=rng)
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
            attack_strategy=request.attack_strategy,
            # Chart uses the same detector mode as the simulation so the
            # theoretical curve and the measured QBER share one model.
            detector_efficiency=(
                DETECTOR_EFFICIENCY if request.wcp_enabled else 1.0
            ),
            dark_count_prob=(
                DARK_COUNT_PROB if request.wcp_enabled else 0.0
            ),
        )

        # PNS security assessment
        if pns_stats:
          pns_security = compute_pns_security(
            pns_stats, 
            qber_result['qber'], 
            skr
          )

        # Decoy state analysis
        decoy_results = {}
        if request.decoy_enabled and \
           decoy_intensities is not None:
          gains = compute_gains(
            measured_states, decoy_intensities
          )
          decoy_results = detect_pns_attack(
            gains,
            distance_km=request.distance_km,
            eta=DETECTOR_EFFICIENCY if request.wcp_enabled else 1.0,
            dark_count_prob=DARK_COUNT_PROB if request.wcp_enabled else 0.0,
          )

        # Step 7: Assemble event model for the frontend.
        #
        # bit_stream  — detected-only view (backward compatible, cap 500).
        #               Its length must NOT be interpreted as N.
        # event_stream — representative sample of ALL pulse outcomes
        #               (detected, fiber-lost, vacuum, PNS-blocked, dark
        #               counts), deterministically strided when N > cap.
        # transmission — full-simulation accounting computed from the
        #               COMPLETE measured_states array (never from the
        #               truncated samples above).
        from core.events import (
            build_event_record,
            compute_transmission_accounting,
            select_event_stream_indices,
        )

        bit_stream = [
            build_event_record(p)
            for p in measured_states if p.get('measured')
        ][:500]

        selected_indices = select_event_stream_indices(measured_states)
        event_stream = [
            build_event_record(measured_states[i])
            for i in selected_indices
        ]
        transmission_counts = compute_transmission_accounting(
            measured_states
        )
        transmission = TransmissionAccounting(**transmission_counts)
        transmission.event_stream_truncated = (
            len(event_stream) < len(measured_states)
        )

        # QBER may be None (insufficient sample -> not estimated). Preserve
        # None explicitly — never coerce to 0.0 — and expose the estimation
        # state so the frontend can distinguish it from a measured QBER=0.
        qber_value = qber_result['qber']
        qber_estimated = bool(qber_result.get('qber_estimated', False))

        return SimulationResponse(
            qber=(round(qber_value, 6) if qber_value is not None else None),
            qber_estimated=qber_estimated,
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
            ),
            wcp_enabled=request.wcp_enabled,
            wcp_stats=wcp_stats,
            pns_stats=pns_stats,
            # PNS security assessment (post-Campaign-1 fix: serialize the
            # previously-discarded compute_pns_security() result; None when
            # PNS disabled / not computed)
            pns_compromised=pns_security.get('pns_compromised') if pns_security else None,
            effective_skr=round(pns_security['effective_skr'], 6) if pns_security and 'effective_skr' in pns_security else None,
            qber_misleading=pns_security.get('qber_misleading') if pns_security else None,
            decoy_results=decoy_results,
            event_stream=event_stream,
            transmission=transmission,
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
