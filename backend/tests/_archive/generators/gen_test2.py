# Generator script for test_physics_benchmarks.py
content = r"""
\"\"\"
tests/test_physics_benchmarks.py

Physics benchmark validation tests for the BB84 QKD Simulator.
Validates QBER, channel attenuation, SKR, and binary entropy against
PHYSICS_CONTRACT.md benchmarks.

Migrates all tests from test_physics.py (4 tests) and test_comprehensive.py
(14 tests) into proper pytest functions with descriptive assert messages.

All stochastic tests use 5 independent trials and compare the mean against
the expected value.
\"\"\"

import sys
from pathlib import Path

import numpy as np
import pytest

# Ensure backend root is on sys.path
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
"""
print(content[:50])
