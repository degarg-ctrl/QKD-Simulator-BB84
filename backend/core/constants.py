"""
Single source of truth for all BB84 physical constants.
Import from here in every module. Never hardcode these values elsewhere.
All values conform to PHYSICS_CONTRACT.md Section 9.
"""

import math

ATTENUATION_COEFF_DB_PER_KM: float = 0.2
DETECTOR_EFFICIENCY: float         = 0.85
DARK_COUNT_PROB: float             = 1e-5
QBER_SECURITY_THRESHOLD: float     = 0.11
SAMPLE_FRACTION_FOR_QBER: float    = 0.10

# Minimum number of SAMPLED SIFTED BITS required to report a QBER estimate.
# A sample of fewer than this many bits is too small for a meaningful
# error-rate estimate; QBER is then reported as NOT ESTIMATED
# (qber=None, qber_estimated=False) instead of being silently reported as
# 0.0. This explicitly replaces the previous implicit floor()-driven
# behaviour that could yield sample_size=0 whenever sifted_count < 10.
# See docs/PHYSICS_CONTRACT.md Section 6 and the C1 audit fix.
QBER_MIN_SAMPLE_SIZE: int          = 10

# Derived minimum sifted-key length that yields QBER_MIN_SAMPLE_SIZE
# sampled bits at SAMPLE_FRACTION_FOR_QBER: ceil(10 / 0.10) = 100.
# A sifted key shorter than this -> QBER is NOT estimated.
QBER_MIN_SIFTED_COUNT: int         = math.ceil(
    QBER_MIN_SAMPLE_SIZE / SAMPLE_FRACTION_FOR_QBER
)
BASES: list                        = ['+', 'x']

STATE_LABELS: dict                 = {
    ('+', 0): '|0>',
    ('+', 1): '|1>',
    ('x', 0): '|+>',
    ('x', 1): '|->'
}

POLARIZATION_ANGLES: dict          = {
    ('+', 0): 0,
    ('+', 1): 90,
    ('x', 0): 45,
    ('x', 1): 135
}
