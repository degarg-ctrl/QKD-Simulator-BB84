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

# Tiered finite-sample policy. Runs below 100 sifted bits remain diagnostic
# only. From 100 through 499 sifted bits, sacrifice a fixed 50-bit sample.
# At 500 or more, sacrifice 10%; the boundary is continuous because 10% of
# 500 is also 50 bits.
QBER_MIN_SIFTED_COUNT: int         = 100
QBER_FIXED_SAMPLE_SIZE: int        = 50
QBER_PERCENT_SAMPLE_THRESHOLD: int = 500
QBER_MIN_SAMPLE_SIZE: int          = QBER_FIXED_SAMPLE_SIZE

# Diagnostic-only QBER preview boundary. Preview values never participate in
# threshold checks, key extraction, or the certified SKR field. Runs below
# this boundary are labelled "very low confidence" in the UI; runs from this
# boundary up to QBER_MIN_SIFTED_COUNT are labelled "low confidence".
QBER_PREVIEW_LOW_MIN_SIFTED_COUNT: int = 20
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
