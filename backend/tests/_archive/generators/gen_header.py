# This script generates tests/test_physics_benchmarks.py
import textwrap

HEADER = textwrap.dedent('''
    import sys
    from pathlib import Path
    import numpy as np
    import pytest

    _BACKEND_DIR = Path(__file__).parent.parent
    if str(_BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(_BACKEND_DIR))

    from tests.conftest import run_pipeline, run_pipeline_trials, PipelineResult, TrialResult
    from core.metrics import binary_entropy, compute_skr, compute_efficiency
    from core.channel import QuantumChannel
    from core.constants import DETECTOR_EFFICIENCY, ATTENUATION_COEFF_DB_PER_KM
    from core.alice import Alice
    from core.bob import Bob
    from core.eve import Eve
    from core.protocol import BB84Protocol
    from core.wcp import poisson_photon_counts, classify_pulses
    from core.decoy import assign_decoy_intensities
    from core.pns import PNSAttack
''').lstrip()

with open('tests/test_physics_benchmarks.py', 'w', encoding='utf-8') as f:
    f.write(HEADER)
print('Done')
