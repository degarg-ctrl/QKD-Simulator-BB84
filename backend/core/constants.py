"""
Single source of truth for all BB84 physical constants.
Import from here in every module. Never hardcode these values elsewhere.
All values conform to PHYSICS_CONTRACT.md Section 9.
"""

ATTENUATION_COEFF_DB_PER_KM: float = 0.2
DETECTOR_EFFICIENCY: float         = 0.85
DARK_COUNT_PROB: float             = 1e-5
QBER_SECURITY_THRESHOLD: float     = 0.11
SAMPLE_FRACTION_FOR_QBER: float    = 0.10
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
