# Design Document: QKD Simulation Accuracy Testing Suite

## Overview

This document describes the design of a comprehensive simulation accuracy and validation testing suite for the BB84 Quantum Key Distribution (QKD) Simulator. The suite is not a unit test suite in the traditional sense — its primary purpose is **physics accuracy validation**: running the simulator across a wide sweep of input parameter combinations and measuring how closely each output matches the expected values defined in `PHYSICS_CONTRACT.md`.

The suite migrates the existing ad-hoc test scripts (`test_physics.py`, `test_comprehensive.py`) into a proper `pytest` structure under `qkd-simulator/backend/tests/`, adds property-based tests using `hypothesis`, sweeps all configurable parameters, and produces two output artifacts: `TEST_RESULTS.md` (ordered results table) and `TEST_FINDINGS.md` (analysis of deviations and problems).

**Design philosophy:** Accuracy over speed. Tests use `n_bits=5000` by default, run 5 independent trials per stochastic combination, and impose no time limits. All tests invoke the simulation pipeline modules directly — no HTTP server dependency.

---

## Architecture

The test suite is organized as a standard `pytest` package under `qkd-simulator/backend/tests/`. All test files import directly from `core.*` modules. The report generation script (`generate_reports.py`) is a standalone script that runs the full slow suite and writes the two output artifacts.

```
qkd-simulator/backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py                  # Shared fixtures and pipeline helpers
│   ├── test_physics_benchmarks.py   # QBER, attenuation, SKR/entropy (Req 3,4,5)
│   ├── test_gates.py                # Gate transformations + round-trip (Req 6)
│   ├── test_wcp_pns_decoy.py        # WCP fractions, PNS, decoy detection (Req 7,8,9)
│   ├── test_property_based.py       # Hypothesis property tests (Req 12)
│   ├── test_parameter_sweep.py      # Full parametrized sweep (Req 2)
│   └── generate_reports.py          # Report generation script (Req 10,11)
├── core/                            # Existing simulation modules (unchanged)
├── test_physics.py                  # Legacy — migrated, kept for reference
└── test_comprehensive.py            # Legacy — migrated, kept for reference
```

### Execution Modes

| Mode | Command | Purpose |
|------|---------|---------|
| Fast sanity check | `pytest tests/ -m fast -v` | Quick validation, `n_bits=1000`, 3 trials |
| Full accuracy run | `pytest tests/ -m slow -v` | Full precision, `n_bits=5000`, 5 trials |
| Property tests only | `pytest tests/test_property_based.py -v` | Hypothesis invariant checks |
| Report generation | `python tests/generate_reports.py` | Runs slow suite + writes artifacts |

---

## Components and Interfaces

### conftest.py — Shared Fixtures

The `conftest.py` file provides pytest fixtures and a central `run_pipeline` helper function used by all test files.

**Fixtures:**

```python
@pytest.fixture
def alice() -> Alice:
    """Fresh Alice instance per test."""

@pytest.fixture
def bob() -> Bob:
    """Fresh Bob instance per test."""

@pytest.fixture
def channel_0km() -> QuantumChannel:
    """Zero-distance, zero-noise channel."""

@pytest.fixture
def eve_none() -> Eve:
    """Eve with attack_prob=0.0 (no interception)."""

@pytest.fixture
def protocol() -> BB84Protocol:
    """Fresh BB84Protocol instance."""

@pytest.fixture
def results_collector(tmp_path_factory):
    """
    Session-scoped list that test functions append PipelineResult
    dicts to. Used by generate_reports.py to build TEST_RESULTS.md.
    """
```

**Central pipeline helper:**

```python
def run_pipeline(
    n_bits: int,
    distance_km: float,
    noise_level: float,
    attack_prob: float,
    attack_strategy: str,
    wcp_enabled: bool = False,
    mu: float = 0.2,
    decoy_enabled: bool = False,
    gates: list[str] | None = None,
    seed: int | None = None,
) -> PipelineResult:
    """
    Run the full BB84 simulation pipeline and return structured results.

    Returns a PipelineResult dataclass with fields:
        qber: float
        skr: float
        sifted_key_length: int
        raw_key_length: int
        efficiency: float
        threshold_breached: bool
        wcp_stats: dict
        pns_stats: dict
        decoy_results: dict
        survival_fraction: float
        detection_rate: float

    Seed: if provided, sets numpy.random.seed before the run.
    Does NOT call any HTTP endpoint — invokes core modules directly.
    """
```

**Multi-trial averaging helper:**

```python
def run_pipeline_trials(
    n_trials: int = 5,
    **pipeline_kwargs,
) -> TrialResult:
    """
    Run run_pipeline n_trials times with independent random seeds.
    Returns a TrialResult with mean and std of each numeric field.
    Used for all stochastic benchmark comparisons.
    """
```

**Data structures:**

```python
@dataclasses.dataclass
class PipelineResult:
    qber: float
    skr: float
    sifted_key_length: int
    raw_key_length: int
    efficiency: float
    threshold_breached: bool
    wcp_stats: dict
    pns_stats: dict
    decoy_results: dict
    survival_fraction: float
    detection_rate: float

@dataclasses.dataclass
class TrialResult:
    mean_qber: float
    std_qber: float
    mean_skr: float
    mean_sifted_key_length: float
    mean_efficiency: float
    n_trials: int
    raw_results: list[PipelineResult]
```

---

### test_physics_benchmarks.py

Validates QBER, channel attenuation, SKR, and binary entropy against `PHYSICS_CONTRACT.md` benchmarks. All stochastic tests use 5 independent trials and compare the mean against the expected value.

**Test functions:**

| Function | Mark | Description |
|----------|------|-------------|
| `test_qber_no_eve_baseline` | `fast` | QBER < 0.02 at 0km, no noise, no Eve |
| `test_qber_noise_only` | `fast` | QBER ≈ noise_level ± 0.03 |
| `test_qber_full_eve` | `fast` | QBER ≈ 0.25 ± 0.03 at attack_prob=1.0 |
| `test_qber_half_eve` | `fast` | QBER ≈ 0.125 ± 0.03 at attack_prob=0.5 |
| `test_qber_additive_model` | `slow` | QBER ≈ noise + 0.25*attack_prob ± 0.04 |
| `test_threshold_breach_sets_skr_zero` | `fast` | QBER ≥ 0.11 → SKR=0, threshold_breached=True |
| `test_below_threshold_skr_positive` | `fast` | QBER < 0.11 → SKR > 0 |
| `test_channel_attenuation_0km` | `fast` | Detection rate ≈ DETECTOR_EFFICIENCY ± 5% |
| `test_channel_attenuation_50km` | `fast` | Survival fraction ≈ 0.10 ± 0.03 |
| `test_channel_attenuation_100km` | `fast` | Survival fraction ≈ 0.01 ± 0.02 |
| `test_channel_monotonic_attenuation` | `slow` | sifted_key_length decreases as distance increases |
| `test_p_survive_formula` | `fast` | P_survive = 10^(-0.2*d/10) matches channel output |
| `test_binary_entropy_zero` | `fast` | H(0.0) == 0.0 exactly |
| `test_binary_entropy_half` | `fast` | H(0.5) == 1.0 exactly |
| `test_binary_entropy_threshold` | `fast` | H(0.11) ≈ 0.5 ± 0.01 |
| `test_binary_entropy_symmetry` | `fast` | H(q) == H(1-q) for sampled values |
| `test_skr_at_threshold` | `fast` | SKR(sifted=1000, raw=5000, qber=0.11) == 0.0 |
| `test_skr_below_threshold` | `fast` | SKR(qber=0.05, S=0.5) ≈ expected ± 0.01 |
| `test_skr_above_threshold_range` | `fast` | SKR == 0 for qber in [0.11, 0.5] |
| `test_skr_positive_range` | `fast` | SKR > 0 for qber in [0.0, 0.109] |

---

### test_gates.py

Validates all 6 gate transformations against the `GATE_TRANSFORMS` lookup table in `gates.py` and the Physics Contract Section 10. Also validates round-trip (involution) properties for H, X, Z.

**Test functions:**

| Function | Mark | Description |
|----------|------|-------------|
| `test_gate_H_rectilinear_to_diagonal` | `fast` | H: \|0⟩→\|+⟩, \|1⟩→\|−⟩ |
| `test_gate_H_diagonal_to_rectilinear` | `fast` | H: \|+⟩→\|0⟩, \|−⟩→\|1⟩ |
| `test_gate_X_bit_flip` | `fast` | X: \|0⟩→\|1⟩, \|1⟩→\|0⟩ |
| `test_gate_X_diagonal_invariant` | `fast` | X: \|+⟩→\|+⟩, \|−⟩→\|−⟩ |
| `test_gate_Z_rectilinear_invariant` | `fast` | Z: \|0⟩→\|0⟩, \|1⟩→\|1⟩ |
| `test_gate_Z_diagonal_flip` | `fast` | Z: \|+⟩→\|−⟩, \|−⟩→\|+⟩ |
| `test_gate_Y_transformations` | `fast` | Y: \|0⟩→\|1⟩, \|+⟩→\|−⟩ |
| `test_gate_S_transformations` | `fast` | S: rectilinear unchanged, diagonal phase-shifted |
| `test_gate_T_transformations` | `fast` | T: rectilinear unchanged, diagonal phase-shifted |
| `test_gate_H_round_trip` | `fast` | H(H(state)) == original state |
| `test_gate_X_round_trip` | `fast` | X(X(state)) == original state |
| `test_gate_Z_round_trip` | `fast` | Z(Z(state)) == original state |
| `test_gate_lost_photon_unchanged` | `fast` | Gate on detected=False → state unchanged |
| `test_gate_preserves_alice_fields` | `fast` | alice_bit, alice_basis never modified by any gate |

---

### test_wcp_pns_decoy.py

Validates the WCP Poisson model, PNS attack undetectability, and decoy state detection criterion.

**Test functions:**

| Function | Mark | Description |
|----------|------|-------------|
| `test_wcp_multi_fraction_mu_02` | `fast` | multi_fraction ≈ 0.0175 ± 0.005 at mu=0.2 |
| `test_wcp_multi_fraction_mu_01` | `fast` | multi_fraction ≈ 0.005 ± 0.003 at mu=0.1 |
| `test_wcp_multi_fraction_mu_05` | `fast` | multi_fraction ≈ 0.090 ± 0.01 at mu=0.5 |
| `test_wcp_vacuum_fraction` | `fast` | vacuum_fraction ≈ e^(-mu) ± 0.01 for each mu |
| `test_wcp_single_fraction` | `fast` | single_fraction ≈ mu*e^(-mu) ± 0.01 for each mu |
| `test_wcp_partition_property` | `fast` | vacuum + single + multi == 1.0 for all mu |
| `test_wcp_disabled_no_stats` | `fast` | wcp_enabled=False → wcp_stats is empty |
| `test_pns_qber_undetectable` | `slow` | PNS + WCP → QBER < 0.05 |
| `test_pns_threshold_not_breached` | `slow` | PNS + WCP → threshold_breached=False |
| `test_pns_stats_fields_present` | `fast` | pns_stats has all required fields |
| `test_pns_leak_fraction_positive` | `slow` | pns_stats.leak_fraction > 0 at mu=0.2 |
| `test_pns_stats_non_negative` | `fast` | split_multi >= 0, blocked_single >= 0 |
| `test_pns_without_wcp` | `fast` | PNS without WCP → no multi-photon pulses |
| `test_decoy_fields_present` | `fast` | decoy_results has all required fields |
| `test_decoy_detects_pns_high_prob` | `slow` | decoy + PNS + high attack_prob → pns_detected=True |
| `test_decoy_no_false_positive` | `slow` | decoy + no PNS → pns_detected=False |
| `test_decoy_intensity_fractions` | `fast` | 70% signal, 20% decoy, 10% vacuum ± 5% |
| `test_decoy_disabled_no_results` | `fast` | decoy_enabled=False → decoy_results is empty |

---

### test_property_based.py

Property-based tests using `hypothesis`. All pure-function tests use `max_examples=200`; full-pipeline tests use `max_examples=50`.

**Hypothesis settings profiles:**

```python
pure_function_settings = settings(
    max_examples=200,
    suppress_health_check=[HealthCheck.too_slow],
    deriving_from=settings.default,
)

pipeline_settings = settings(
    max_examples=50,
    suppress_health_check=[HealthCheck.too_slow],
    deriving_from=settings.default,
)
```

**Test functions:**

| Function | Profile | Description |
|----------|---------|-------------|
| `test_binary_entropy_symmetry_property` | pure | H(q) == H(1-q) for all q in [0,1] |
| `test_binary_entropy_non_negative_property` | pure | H(q) >= 0 for all q in [0,1] |
| `test_skr_zero_above_threshold_property` | pure | SKR == 0 for all qber >= 0.11 |
| `test_skr_non_negative_property` | pure | SKR >= 0 for all valid inputs |
| `test_wcp_partition_property` | pure | vacuum + single + multi == 1.0 for all mu in [0.05, 0.5] |
| `test_gate_H_round_trip_property` | pure | H(H(state)) == original for any photon state |
| `test_gate_X_round_trip_property` | pure | X(X(state)) == original for any photon state |
| `test_sifted_leq_raw_property` | pipeline | sifted_key_length <= raw_key_length for all inputs |
| `test_qber_bounds_property` | pipeline | QBER in [0.0, 0.5] for all valid inputs |

---

### test_parameter_sweep.py

Full parametrized sweep across all combinations defined in Requirement 2. Uses `pytest.mark.parametrize` to generate individual test cases. All combinations are marked `@pytest.mark.slow`.

**Sweep dimensions:**

```python
N_BITS_VALUES       = [500, 1000, 5000]
DISTANCE_KM_VALUES  = [0, 10, 50, 100]
NOISE_LEVEL_VALUES  = [0.00, 0.05, 0.10]
ATTACK_PROB_VALUES  = [0.0, 0.25, 0.5, 1.0]
ATTACK_STRATEGIES   = ['intercept_resend', 'partial', 'burst', 'pns']
GATE_TYPES          = ['H', 'X', 'Y', 'Z', 'S', 'T']
MU_VALUES           = [0.1, 0.2, 0.5]
```

**Test functions:**

| Function | Mark | Description |
|----------|------|-------------|
| `test_sweep_qber_vs_attack_prob` | `slow` | QBER ≈ 0.25*p ± 0.04 for all attack_prob values |
| `test_sweep_qber_vs_noise` | `slow` | QBER ≈ noise_level ± 0.03 for all noise values |
| `test_sweep_attenuation_vs_distance` | `slow` | Survival fraction matches formula for all distances |
| `test_sweep_skr_threshold` | `slow` | SKR=0 when QBER≥0.11 across all combinations |
| `test_sweep_gate_individual` | `slow` | Each gate type applied to photon stream |
| `test_sweep_wcp_mu_values` | `slow` | WCP fractions match Poisson theory for all mu |
| `test_sweep_decoy_pns_combination` | `slow` | Decoy detects PNS across attack_prob values |
| `test_sweep_collect_results` | `slow` | Appends all results to results_collector fixture |

The `test_sweep_collect_results` test is the primary data-collection test. It iterates over all combinations, calls `run_pipeline_trials(n_trials=5, ...)`, and appends a `ResultRow` dict to the session-scoped `results_collector` list. This list is later consumed by `generate_reports.py`.

---

### generate_reports.py

A standalone script (not a pytest test file) that:

1. Invokes `pytest tests/ -m slow --tb=short -q` as a subprocess, capturing output
2. Reads the session-scoped `results_collector` list (serialized to a JSON temp file by a pytest plugin defined in `conftest.py`)
3. Generates `TEST_RESULTS.md` from the collected rows
4. Generates `TEST_FINDINGS.md` by analyzing the collected rows

**Report generation flow:**

```
generate_reports.py
    │
    ├── subprocess: pytest tests/ -m slow --tb=short -q
    │       │
    │       └── conftest.py session fixture writes results to
    │           tests/.results_cache.json on teardown
    │
    ├── load tests/.results_cache.json
    │
    ├── build_results_table(rows) → TEST_RESULTS.md
    │       - Header with timestamp, git hash, summary stats
    │       - Markdown table: one row per test run
    │       - FAIL rows highlighted with ⚠️ prefix on deviation
    │
    └── build_findings_report(rows) → TEST_FINDINGS.md
            - "Confirmed Working" section
            - "Deviations Found" section
            - "Statistical Observations" section
            - "Recommendations" section
```

**Results cache mechanism:**

`conftest.py` defines a session-scoped fixture `results_collector` that holds a list of `ResultRow` dicts. A `pytest_sessionfinish` hook in `conftest.py` serializes this list to `tests/.results_cache.json` at the end of the test session. `generate_reports.py` reads this file after the pytest run completes.

---

## Data Models

### ResultRow

Each row in `TEST_RESULTS.md` corresponds to one `ResultRow` dict:

```python
ResultRow = TypedDict('ResultRow', {
    'test_id':           str,    # e.g. "sweep_001"
    'n_bits':            int,
    'distance_km':       float,
    'noise_level':       float,
    'attack_prob':       float,
    'attack_strategy':   str,
    'wcp_enabled':       bool,
    'mu':                float,
    'decoy_enabled':     bool,
    'gates':             str,    # comma-separated gate names or "none"
    'measured_qber':     float,
    'expected_qber':     float,
    'qber_deviation':    float,  # abs(measured - expected)
    'measured_skr':      float,
    'sifted_key_length': int,
    'efficiency':        float,
    'threshold_breached': bool,
    'pass_fail':         str,    # "PASS" or "FAIL"
    'n_trials':          int,
    'std_qber':          float,  # standard deviation across trials
})
```

### PipelineResult

Internal dataclass returned by `run_pipeline()`:

```python
@dataclasses.dataclass
class PipelineResult:
    qber:               float
    skr:                float
    sifted_key_length:  int
    raw_key_length:     int
    efficiency:         float
    threshold_breached: bool
    wcp_stats:          dict   # from wcp.classify_pulses()
    pns_stats:          dict   # from PNSAttack.attack()
    decoy_results:      dict   # from decoy.detect_pns_attack()
    survival_fraction:  float  # detected / raw_key_length
    detection_rate:     float  # sifted / raw_key_length
```

### Gate State

A photon state dict as produced by `alice.encode_states()` and mutated through the pipeline:

```python
PhotonState = TypedDict('PhotonState', {
    'index':              int,
    'bit':                int,    # current physical bit (may be modified by Eve/gates)
    'basis':              str,    # current physical basis
    'alice_bit':          int,    # original Alice bit — NEVER modified
    'alice_basis':        str,    # original Alice basis — NEVER modified
    'state_label':        str,
    'polarization_angle': float,
    'detected':           bool,
    'lost':               bool,
    'dark_count':         bool,
    'intercepted':        bool,
    'gate_applied':       str | None,
    # WCP fields (when wcp_enabled=True):
    'wcp_photon_count':   int,
    'wcp_vacuum':         bool,
    'wcp_single':         bool,
    'wcp_multi':          bool,
    # PNS fields (when attack_strategy='pns'):
    'pns_attacked':       bool,
    'pns_blocked':        bool,
    'pns_split':          bool,
    'eve_has_copy':       bool,
})
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The BB84 simulation pipeline contains several pure functions and deterministic transformations that are well-suited to property-based testing. The `hypothesis` library is used to generate inputs automatically. Pure-function properties use `max_examples=200`; full-pipeline properties use `max_examples=50`.

---

### Property 1: QBER Additive Model

*For any* `noise_level` N in `[0.0, 0.10]` and `attack_prob` P in `[0.0, 1.0]` at `distance_km=0`, the measured QBER (averaged over 5 independent trials) SHALL be within `±0.04` of `N + 0.25 * P`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**

---

### Property 2: SKR Is Zero At and Above the Security Threshold

*For any* `qber` value in `[0.11, 0.5]` and any valid `sifted_key_length` and `raw_key_length`, `compute_skr(sifted, raw, qber)` SHALL return exactly `0.0`.

**Validates: Requirements 3.7, 5.5, 5.8, 12.3**

---

### Property 3: SKR Is Positive Below the Security Threshold

*For any* `qber` value in `[0.0, 0.109]` and any `sifted_key_length > 0` and `raw_key_length > 0`, `compute_skr(sifted, raw, qber)` SHALL return a value strictly greater than `0.0`.

**Validates: Requirements 3.8, 5.7**

---

### Property 4: SKR Is Always Non-Negative

*For any* valid combination of `sifted_key_length >= 0`, `raw_key_length >= 0`, and `qber` in `[0.0, 0.5]`, `compute_skr(sifted, raw, qber)` SHALL return a value `>= 0.0`.

**Validates: Requirements 12.4**

---

### Property 5: Channel Attenuation Matches Physics Formula

*For any* `distance_km` in `[0, 100]`, the `QuantumChannel` SHALL compute `p_survive` equal to `10^(-(0.2 * distance_km) / 10)`, and the measured photon survival fraction (over `n_bits=5000`) SHALL be within `±0.05` of `p_survive * DETECTOR_EFFICIENCY`.

**Validates: Requirements 4.1, 4.2, 4.3, 4.5**

---

### Property 6: Channel Attenuation Is Monotonically Decreasing

*For any* ordered sequence of `distance_km` values `d1 < d2 < d3`, the corresponding mean `sifted_key_length` values SHALL satisfy `sifted(d1) >= sifted(d2) >= sifted(d3)` (non-increasing with distance).

**Validates: Requirements 4.4**

---

### Property 7: Binary Entropy Symmetry

*For any* `q` in `[0.0, 1.0]`, `binary_entropy(q)` SHALL equal `binary_entropy(1 - q)`.

**Validates: Requirements 5.4, 12.1**

---

### Property 8: Binary Entropy Non-Negativity

*For any* `q` in `[0.0, 1.0]`, `binary_entropy(q)` SHALL return a value `>= 0.0`.

**Validates: Requirements 12.2**

---

### Property 9: Involutory Gate Round-Trips (H, X, Z)

*For any* photon state with `detected=True` and any of the involutory gates `{H, X, Z}`, applying the gate twice SHALL return the original `bit`, `basis`, and `polarization_angle` values unchanged.

**Validates: Requirements 6.13, 6.14, 6.15, 12.6, 12.7**

---

### Property 10: Gates Preserve Lost-Photon State and Alice Fields

*For any* photon state with `detected=False` and any gate type in `{H, X, Y, Z, S, T}`, applying the gate SHALL leave the photon state dict unchanged. Additionally, *for any* photon state (detected or not) and any gate type, the `alice_bit` and `alice_basis` fields SHALL remain unchanged after gate application.

**Validates: Requirements 6.16, 6.17**

---

### Property 11: WCP Pulse Fractions Match Poisson Theory

*For any* `mu` in `[0.05, 0.5]` and `n_pulses >= 10000`, the measured `multi_fraction` from `classify_pulses(poisson_photon_counts(n_pulses, mu))` SHALL be within `±0.01` of the theoretical value `1 - e^(-mu) - mu * e^(-mu)`. Similarly, `vacuum_fraction` SHALL be within `±0.01` of `e^(-mu)` and `single_fraction` within `±0.01` of `mu * e^(-mu)`.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

---

### Property 12: WCP Partition Invariant

*For any* `mu` in `[0.05, 0.5]` and any `n_pulses > 0`, `vacuum_fraction + single_fraction + multi_fraction` SHALL equal exactly `1.0` (within floating-point precision `1e-10`).

**Validates: Requirements 7.6, 12.5**

---

### Property 13: PNS Attack Is Undetectable by QBER

*For any* `attack_prob` in `[0.0, 1.0]` with `attack_strategy='pns'` and `wcp_enabled=True` and `mu=0.2`, the measured QBER (averaged over 5 trials) SHALL be less than `0.05`, and `threshold_breached` SHALL be `False`.

**Validates: Requirements 3.5, 8.1, 8.2**

---

### Property 14: PNS and Decoy Stats Structural Invariant

*For any* simulation run with `attack_strategy='pns'` and `wcp_enabled=True`, the `pns_stats` dict SHALL contain all of the fields `{blocked_single, split_multi, passed_through, eve_info_bits, leak_fraction}` with non-negative numeric values. Similarly, *for any* simulation run with `decoy_enabled=True` and `wcp_enabled=True`, the `decoy_results` dict SHALL contain all of the fields `{pns_detected, confidence, gain_difference, signal_gain, decoy_gain}`.

**Validates: Requirements 8.3, 8.5, 9.1**

---

### Property 15: Decoy Detection Criterion Matches Formula

*For any* gain statistics dict where `|normalized_signal - normalized_decoy| > 0.05`, `detect_pns_attack(gains)` SHALL return `pns_detected=True`. *For any* gains dict where `|normalized_signal - normalized_decoy| <= 0.05`, it SHALL return `pns_detected=False`.

**Validates: Requirements 9.2, 9.5**

---

### Property 16: Decoy Intensity Fractions Match Target Distribution

*For any* `n_pulses >= 1000`, `assign_decoy_intensities(n_pulses)` SHALL produce intensity arrays where the fraction of signal pulses (`mu=0.5`) is within `±5%` of `0.70`, decoy pulses (`mu=0.1`) within `±5%` of `0.20`, and vacuum pulses (`mu=0.0`) within `±5%` of `0.10`.

**Validates: Requirements 9.4**

---

### Property 17: Sifted Key Length Never Exceeds Raw Key Length

*For any* valid simulation run with any combination of `n_bits`, `distance_km`, `noise_level`, `attack_prob`, and `attack_strategy`, `sifted_key_length` SHALL be less than or equal to `raw_key_length` (i.e., `n_bits`).

**Validates: Requirements 12.8**

---

### Property 18: QBER Is Always Within Valid Bounds

*For any* valid simulation run with any combination of input parameters, the measured `QBER` SHALL be in the range `[0.0, 0.5]`.

**Validates: Requirements 12.9**

---

## Error Handling

### Test Failure Messages

Every test assertion SHALL include a descriptive failure message containing:
- The parameter combination that caused the failure
- The measured value
- The expected value
- The allowed tolerance

Example pattern:
```python
assert measured_qber < 0.02, (
    f"QBER baseline failed: "
    f"params=(n_bits={n_bits}, distance_km=0, noise=0.0, attack_prob=0.0), "
    f"measured={measured_qber:.4f}, expected<0.02"
)
```

### Pipeline Error Handling

The `run_pipeline()` helper SHALL catch and re-raise any exceptions from core modules with additional context about the parameter combination that caused the failure. This ensures that parametrized test failures are traceable to their exact input combination.

### Stochastic Test Variance

For stochastic tests (those using `run_pipeline_trials`), if the mean result is outside tolerance, the failure message SHALL also include the standard deviation across trials and the number of trials run, to distinguish genuine physics deviations from sampling noise.

### Report Generation Errors

`generate_reports.py` SHALL handle the case where `.results_cache.json` does not exist (e.g., if the slow suite was not run) by printing a clear error message and exiting with a non-zero status code.

---

## Testing Strategy

### Dual Testing Approach

The suite uses two complementary testing approaches:

1. **Example-based tests** (`test_physics_benchmarks.py`, `test_gates.py`, `test_wcp_pns_decoy.py`): Verify specific parameter combinations against known expected values from `PHYSICS_CONTRACT.md`. These catch concrete physics deviations.

2. **Property-based tests** (`test_property_based.py`): Verify universal invariants across automatically generated inputs using `hypothesis`. These catch edge cases and boundary conditions that example tests miss.

### Property-Based Testing Library

The suite uses **`hypothesis`** (already available in the Python ecosystem; add `hypothesis>=6.100.0` to `requirements.txt`).

**Settings profiles** (defined in `conftest.py`):

```python
from hypothesis import settings, HealthCheck

# For pure functions (binary_entropy, compute_skr, classify_pulses, apply_gate)
pure_settings = settings(
    max_examples=200,
    suppress_health_check=[HealthCheck.too_slow],
)

# For full pipeline tests (run_pipeline with hypothesis-generated inputs)
pipeline_settings = settings(
    max_examples=50,
    suppress_health_check=[HealthCheck.too_slow],
)
```

Each property-based test SHALL be tagged with a comment referencing the design property it validates:
```python
# Feature: qkd-simulation-accuracy-testing, Property 7: Binary entropy symmetry
@given(q=st.floats(min_value=0.0, max_value=1.0, allow_nan=False))
@pure_settings
def test_binary_entropy_symmetry_property(q):
    ...
```

### Unit Test Balance

Unit tests focus on:
- Specific benchmark values from `PHYSICS_CONTRACT.md` (concrete examples)
- Gate transformation lookup table verification (all 6 gates × all 4 states)
- WCP/PNS/decoy field presence and value checks
- Edge cases: `n_bits=0`, `distance_km=0`, `attack_prob=0.0`, `attack_prob=1.0`

Property tests focus on:
- Universal invariants (entropy symmetry, SKR threshold, WCP partition)
- Round-trip properties (gate involutions)
- Monotonicity (attenuation vs distance)
- Bounds checking (QBER in [0, 0.5], sifted ≤ raw)

### Test Marks

```python
# In conftest.py or pytest.ini:
# pytest.ini:
# [pytest]
# markers =
#     slow: Full precision sweep (n_bits=5000, 5 trials). Run with: pytest -m slow
#     fast: Quick sanity checks (n_bits=1000, 3 trials). Run with: pytest -m fast

@pytest.mark.slow   # Full parameter sweep, report generation
@pytest.mark.fast   # Quick sanity checks
```

### Migration from Legacy Tests

| Legacy test | Migrated to |
|-------------|-------------|
| `test_physics.py` Test 1 (QBER no Eve) | `test_physics_benchmarks.py::test_qber_no_eve_baseline` |
| `test_physics.py` Test 2 (QBER full Eve) | `test_physics_benchmarks.py::test_qber_full_eve` |
| `test_physics.py` Test 3 (SKR threshold) | `test_physics_benchmarks.py::test_skr_at_threshold` |
| `test_physics.py` Test 4 (binary entropy) | `test_physics_benchmarks.py::test_binary_entropy_*` |
| `test_comprehensive.py` Tests 1-2 (Alice) | `test_physics_benchmarks.py::test_alice_*` |
| `test_comprehensive.py` Test 3 (channel) | `test_physics_benchmarks.py::test_channel_attenuation_*` |
| `test_comprehensive.py` Test 4 (Eve) | `test_physics_benchmarks.py::test_qber_full_eve` |
| `test_comprehensive.py` Tests 5-6 (Bob, sifting) | `test_physics_benchmarks.py::test_protocol_*` |
| `test_comprehensive.py` Tests 7-8 (QBER) | `test_physics_benchmarks.py::test_qber_*` |
| `test_comprehensive.py` Tests 9-11 (SKR, entropy, efficiency) | `test_physics_benchmarks.py::test_skr_*`, `test_binary_entropy_*` |
| `test_comprehensive.py` Test 12 (WCP) | `test_wcp_pns_decoy.py::test_wcp_*` |
| `test_comprehensive.py` Test 13 (decoy) | `test_wcp_pns_decoy.py::test_decoy_*` |
| `test_comprehensive.py` Test 14 (PNS) | `test_wcp_pns_decoy.py::test_pns_*` |

### Reproducibility

- All deterministic benchmark tests use `numpy.random.default_rng(seed=42)` (or a documented fixed seed).
- Stochastic tests run 5 independent trials with seeds `[0, 1, 2, 3, 4]` and use the mean result.
- `hypothesis` tests use `@settings(deriving_from=settings.default)` with no explicit database suppression, allowing `hypothesis` to replay failing examples.

### Requirements Coverage

| Requirement | Primary test file | Test type |
|-------------|------------------|-----------|
| Req 1 (Suite structure) | All files | Smoke |
| Req 2 (Parameter sweep) | `test_parameter_sweep.py` | Parametrized |
| Req 3 (QBER benchmarks) | `test_physics_benchmarks.py` | Example + Property |
| Req 4 (Attenuation) | `test_physics_benchmarks.py` | Example + Property |
| Req 5 (SKR/entropy) | `test_physics_benchmarks.py` | Example + Property |
| Req 6 (Gates) | `test_gates.py` | Example + Property |
| Req 7 (WCP) | `test_wcp_pns_decoy.py` | Example + Property |
| Req 8 (PNS) | `test_wcp_pns_decoy.py` | Example + Property |
| Req 9 (Decoy) | `test_wcp_pns_decoy.py` | Example + Property |
| Req 10 (TEST_RESULTS.md) | `generate_reports.py` | Integration |
| Req 11 (TEST_FINDINGS.md) | `generate_reports.py` | Integration |
| Req 12 (Hypothesis) | `test_property_based.py` | Property |
| Req 13 (Isolation) | All files | Structural |
| Req 14 (Accuracy) | `test_parameter_sweep.py` | Parametrized |
