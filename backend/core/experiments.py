"""
backend/core/experiments.py

Experiment preset configurations for BB84 QKD Simulator.
Each experiment has a description, default parameters,
and constraints that override the SimulationRequest.

Experiments:
  exp1 — Random bits, no Eve
  exp2 — User input bits, no Eve  
  exp3 — Random bits + Eve interception
  exp4 — User input bits + Eve
  exp5 — Quantum gate transmission
  exp6 — No-cloning theorem demonstration
"""

EXPERIMENT_PRESETS = {
  'exp1': {
    'name': 'Experiment 1',
    'title': 'Random Bit Generation — Clean Channel',
    'description': (
      'Alice generates random bits and sends them through '
      'a clean quantum channel to Bob. No eavesdropping. '
      'Observe how basis sifting produces a shared secret key.'
    ),
    'learning_objective': (
      'Understand the baseline BB84 protocol. See how ~50% '
      'of bits are discarded during sifting and how QBER '
      'stays near zero without an attacker.'
    ),
    'default_params': {
      'n_bits': 1000,
      'distance_km': 10,
      'noise_level': 0.0,
      'attack_prob': 0.0,
      'attack_strategy': 'intercept_resend',
      'gates': []
    },
    'locked_params': ['attack_prob'],
    'user_input': False,
  },

  'exp2': {
    'name': 'Experiment 2',
    'title': 'Manual Photon Encoding — Clean Channel',
    'description': (
      'You control exactly which bits Alice sends and which '
      'polarization basis she uses for each photon. '
      'No Eve. Observe precisely how your choices flow '
      'through the BB84 protocol.'
    ),
    'learning_objective': (
      'See the direct relationship between polarization basis, '
      'bit value, and the final sifted key. Understand why '
      'basis mismatches cause bits to be discarded.'
    ),
    'default_params': {
      'n_bits': 8,
      'distance_km': 0,
      'noise_level': 0.0,
      'attack_prob': 0.0,
      'attack_strategy': 'intercept_resend',
      'gates': []
    },
    'locked_params': ['attack_prob', 'n_bits'],
    'user_input': True,
    'max_photons': 20,
  },

  'exp3': {
    'name': 'Experiment 3',
    'title': 'Random Bits — Eve Intercepts',
    'description': (
      'Alice generates random bits. Eve intercepts photons '
      'using the intercept-resend attack. Watch the QBER '
      'spike above the 11% security threshold as Eve '
      'introduces detectable errors.'
    ),
    'learning_objective': (
      'Understand how quantum eavesdropping is detected. '
      'See that Eve cannot copy quantum states without '
      'disturbing them — the foundation of QKD security.'
    ),
    'default_params': {
      'n_bits': 1000,
      'distance_km': 10,
      'noise_level': 0.0,
      'attack_prob': 1.0,
      'attack_strategy': 'intercept_resend',
      'gates': []
    },
    'locked_params': [],
    'user_input': False,
  },

  'exp4': {
    'name': 'Experiment 4',
    'title': 'Manual Photon Encoding — Eve Active',
    'description': (
      'You define each photon manually. Eve intercepts '
      'the transmission. See exactly which of your photons '
      'were intercepted, how Eve changed their states, '
      'and how this creates errors in the sifted key.'
    ),
    'learning_objective': (
      'Trace exactly what happens to specific photons '
      'when Eve intercepts them. See the direct connection '
      'between interception and QBER elevation.'
    ),
    'default_params': {
      'n_bits': 8,
      'distance_km': 0,
      'noise_level': 0.0,
      'attack_prob': 1.0,
      'attack_strategy': 'intercept_resend',
      'gates': []
    },
    'locked_params': ['n_bits'],
    'user_input': True,
    'max_photons': 20,
  },

  'exp5': {
    'name': 'Experiment 5',
    'title': 'Quantum Gate Transmission',
    'description': (
      'Place quantum gates (H, X, Y, Z, S, T) on the '
      'channel lanes. Watch how each gate transforms the '
      'polarization state of photons passing through it. '
      'Observe the effect on QBER and the sifted key.'
    ),
    'learning_objective': (
      'Understand how quantum gates transform polarization '
      'states. See how a Hadamard gate switches between '
      'bases, and how unexpected transformations introduce '
      'errors that look like eavesdropping.'
    ),
    'default_params': {
      'n_bits': 500,
      'distance_km': 0,
      'noise_level': 0.0,
      'attack_prob': 0.0,
      'attack_strategy': 'intercept_resend',
      'gates': []
    },
    'locked_params': [],
    'user_input': False,
    'requires_gates': True,
  },

  'exp6': {
    'name': 'Experiment 6',
    'title': 'No-Cloning Theorem',
    'description': (
      'Place the Cloning Probe on a channel lane. '
      'The probe attempts to copy photon states using '
      'CNOT entanglement. Watch the channel turn red '
      'as the original state collapses — proving that '
      'quantum states cannot be perfectly copied.'
    ),
    'learning_objective': (
      'Demonstrate the quantum no-cloning theorem. '
      'Neither the original photon nor Eve\'s copy '
      'retains the correct state. QBER spikes instantly, '
      'showing that cloning attempts are always detectable.'
    ),
    'default_params': {
      'n_bits': 500,
      'distance_km': 0,
      'noise_level': 0.0,
      'attack_prob': 0.0,
      'attack_strategy': 'intercept_resend',
      'gates': []
    },
    'locked_params': [],
    'user_input': False,
    'requires_cloning_probe': True,
  },

  'exp7': {
    'name': 'Experiment 7',
    'title': 'PNS Attack — Undetectable Eavesdropping',
    'description': (
      'Real laser sources emit pulses with varying photon '
      'numbers (Weak Coherent Pulses). Eve exploits '
      'multi-photon pulses using the PNS attack — '
      'introducing ZERO detectable QBER. Standard BB84 '
      'security threshold cannot detect this attack.'
    ),
    'learning_objective': (
      'Understand why ideal single-photon sources matter. '
      'See that QBER staying at 0% does NOT guarantee '
      'security when using real laser sources. '
      'Eve can steal complete key information silently.'
    ),
    'default_params': {
      'n_bits': 2000,
      'distance_km': 10,
      'noise_level': 0.0,
      'attack_prob': 0.8,
      'attack_strategy': 'pns',
      'gates': [],
      'wcp_enabled': True,
      'mean_photon_number': 0.2,
      'decoy_enabled': False,
    },
    'locked_params': ['attack_strategy', 'wcp_enabled'],
    'user_input': False,
  },

  'exp8': {
    'name': 'Experiment 8',
    'title': 'Decoy State Protocol — Detecting PNS',
    'description': (
      'Alice sends pulses at three different intensities. '
      'By comparing detection rates between signal and '
      'decoy states, Alice and Bob can detect whether '
      'Eve is performing a PNS attack — even though '
      'QBER appears normal.'
    ),
    'learning_objective': (
      'Understand the decoy state protocol. See how '
      'comparing gain statistics between signal and '
      'decoy intensities reveals PNS attack that '
      'standard QBER analysis cannot detect.'
    ),
    'default_params': {
      'n_bits': 2000,
      'distance_km': 10,
      'noise_level': 0.0,
      'attack_prob': 0.8,
      'attack_strategy': 'pns',
      'gates': [],
      'wcp_enabled': True,
      'mean_photon_number': 0.5,
      'decoy_enabled': True,
    },
    'locked_params': ['attack_strategy', 
                      'wcp_enabled', 'decoy_enabled'],
    'user_input': False,
  },
}

def get_experiment_preset(exp_id: str) -> dict:
  """
  Get experiment preset configuration by ID.
  
  Args:
      exp_id: experiment identifier e.g. 'exp1'
  Returns:
      experiment preset dict or None if not found
  """
  return EXPERIMENT_PRESETS.get(exp_id)

def get_all_experiments() -> list[dict]:
  """
  Get all experiment presets as a list.
  Returns list of dicts with id added to each.
  """
  return [
    {'id': k, **v} 
    for k, v in EXPERIMENT_PRESETS.items()
  ]

# Depends on: nothing
# Used by: routers/simulation.py, frontend via /api/experiments
