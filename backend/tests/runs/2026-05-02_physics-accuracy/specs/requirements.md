# Requirements Document

## Introduction

This feature implements a comprehensive simulation accuracy and validation testing suite for the BB84 Quantum Key Distribution (QKD) Simulator. The goal is not unit testing — it is physics accuracy validation: running the simulator across a wide sweep of input parameter combinations and measuring how closely each output matches the expected values defined in `PHYSICS_CONTRACT.md`.

The suite migrates the existing ad-hoc test scripts (`test_physics.py`, `test_comprehensive.py`) into a proper `pytest` structure, adds property-based tests using `hypothesis`, sweeps all configurable parameters, captures all simulation outputs, computes deviation from expected physics benchmarks, and produces two output artifacts: `TEST_RESULTS.md` (ordered results table) and `TEST_FINDINGS.md` (analysis of deviations and problems).

**Execution philosophy:** This suite prioritizes accuracy over speed, while remaining practical given compute constraints. Tests use high photon counts (`n_bits=5000` default), multiple independent trials (minimum 5 per combination), and no time limits. The goal is statistically reliable results — not fast CI feedback.

---

## Glossary

- **Simulator**: The BB84 QKD backend simulation pipeline composed of `alice.py`, `bob.py`, `channel.py`, `eve.py`, `protocol.py`, `metrics.py`, `gates.py`, `wcp.py`, `pns.py`, and `decoy.py`.
- **Physics_Contract**: The authoritative document `PHYSICS_CONTRACT.md` defining expected simulation behavior, constants, and benchmarks.
- **QBER**: Quantum Bit Error Rate — the fraction of erroneous bits in the sampled sifted key.
- **SKR**: Secret Key Rate — the fraction of raw bits that can be used as a secure key, computed as `S * (1 - 2 * H(Q))`.
- **Sifted_Key**: The subset of raw bits where Alice and Bob chose the same measurement basis.
- **P_survive**: Photon survival probability through the fiber channel, `10^(-0.2 * distance_km / 10)`.
- **WCP**: Weak Coherent Pulse — a realistic photon source model using Poisson-distributed photon counts.
- **PNS_Attack**: Photon Number Splitting attack — Eve exploits multi-photon pulses; introduces ~0% QBER (undetectable by threshold).
- **Decoy_Protocol**: Countermeasure against PNS attack using multiple pulse intensities to detect gain anomalies.
- **Binary_Entropy**: `H(Q) = -Q*log2(Q) - (1-Q)*log2(1-Q)`.
- **Threshold_Breached**: Boolean flag set to `True` when `QBER >= 0.11`, causing `SKR = 0` and session abort.
- **Test_Suite**: The pytest-based test suite located in `qkd-simulator/backend/tests/`.
- **Parameter_Sweep**: Systematic execution of the Simulator across all defined combinations of input parameters.
- **Deviation**: The absolute or relative difference between a simulation output and its expected value from the Physics_Contract.
- **TEST_RESULTS.md**: Output artifact — an ordered table of all test runs with parameters and measured outputs.
- **TEST_FINDINGS.md**: Output artifact — analysis of where the Simulator deviates from expected physics, what problems were found, and what is working correctly.
- **Hypothesis**: The Python property-based testing library used to generate input combinations automatically.
- **mu**: Mean photon number per pulse in the WCP model (default 0.2).
- **attack_prob**: Probability that Eve intercepts any given photon (0.0 to 1.0).
- **n_bits**: Number of photons (raw key length) sent by Alice per simulation run.

---

## Requirements

---

### Requirement 1: Pytest Test Suite Structure

**User Story:** As a developer, I want the simulation accuracy tests organized as a proper pytest suite, so that I can run them with standard tooling, get structured output, and integrate them into CI.

#### Acceptance Criteria

1. THE Test_Suite SHALL be located at `qkd-simulator/backend/tests/` and be discoverable by `pytest` without additional configuration.
2. THE Test_Suite SHALL be executable with the command `pytest tests/ -v` from the `qkd-simulator/backend/` directory.
3. THE Test_Suite SHALL migrate all assertions from `test_physics.py` and `test_comprehensive.py` into pytest test functions with proper `assert` statements and descriptive failure messages.
4. WHEN a test function fails, THE Test_Suite SHALL emit a failure message that includes the parameter combination, the measured value, the expected value, and the allowed tolerance.
5. THE Test_Suite SHALL use `conftest.py` fixtures to provide shared simulation pipeline components (Alice, Bob, QuantumChannel, Eve, BB84Protocol) so that individual test functions do not repeat setup code.
6. THE Test_Suite SHALL NOT depend on a running HTTP server — all accuracy tests SHALL invoke the simulation pipeline modules directly.
7. WHERE `hypothesis` is used for property-based tests, THE Test_Suite SHALL set a fixed `hypothesis` seed or `settings` profile so that results are reproducible across runs.

---

### Requirement 2: Parameter Sweep Coverage

**User Story:** As a physicist, I want the test suite to sweep all configurable input parameters, so that I can identify which combinations expose deviations from the Physics_Contract.

#### Acceptance Criteria

1. THE Test_Suite SHALL test all combinations of the following `n_bits` values: `[500, 1000, 5000]`.
2. THE Test_Suite SHALL test all combinations of the following `distance_km` values: `[0, 10, 50, 100]`.
3. THE Test_Suite SHALL test all combinations of the following `noise_level` values: `[0.00, 0.05, 0.10]`.
4. THE Test_Suite SHALL test all combinations of the following `attack_prob` values: `[0.0, 0.25, 0.5, 1.0]`.
5. THE Test_Suite SHALL test all combinations of the following `attack_strategy` values: `['intercept_resend', 'partial', 'burst', 'pns']`.
6. THE Test_Suite SHALL test each quantum gate type `['H', 'X', 'Y', 'Z', 'S', 'T']` applied individually to a photon stream.
7. THE Test_Suite SHALL test `wcp_enabled` in both `True` and `False` states, with `mean_photon_number` values `[0.1, 0.2, 0.5]` when `wcp_enabled=True`.
8. THE Test_Suite SHALL test `decoy_enabled=True` in combination with `wcp_enabled=True` and `attack_strategy='pns'`.
9. WHEN running the full parameter sweep, THE Test_Suite SHALL use `pytest.mark.parametrize` or equivalent to generate individual test cases per combination.
10. THE Test_Suite SHALL use `n_bits >= 5000` for all QBER accuracy tests to ensure the 10% QBER sample contains at least 500 bits, giving statistically stable results.
---

### Requirement 3: Physics Benchmark Validation — QBER

**User Story:** As a physicist, I want each test run to compare the measured QBER against the expected value from the Physics_Contract, so that I can confirm the simulator is physically accurate.

#### Acceptance Criteria

1. WHEN `attack_prob=0.0`, `distance_km=0`, and `noise_level=0.00`, THE Simulator SHALL produce `QBER < 0.02` (dominated only by dark counts at rate `1e-5`).
2. WHEN `attack_prob=0.0`, `distance_km=0`, and `noise_level=0.05`, THE Simulator SHALL produce `QBER` within `±0.03` of `0.05`.
3. WHEN `attack_prob=1.0`, `noise_level=0.00`, and `distance_km=0`, THE Simulator SHALL produce `QBER` within `±0.03` of `0.25`.
4. WHEN `attack_prob=0.5`, `noise_level=0.00`, and `distance_km=0`, THE Simulator SHALL produce `QBER` within `±0.03` of `0.125`.
5. WHEN `attack_strategy='pns'` and `wcp_enabled=True`, THE Simulator SHALL produce `QBER < 0.05` regardless of `attack_prob`, confirming PNS is undetectable by QBER threshold.
6. WHEN `noise_level=N` and `attack_prob=P` and `distance_km=0`, THE Simulator SHALL produce `QBER` within `±0.04` of `N + 0.25 * P` (additive model from Physics_Contract Section 5 and 6).
7. IF the measured `QBER >= 0.11`, THEN THE Simulator SHALL set `secure_threshold_breached=True` and `SKR=0.0`.
8. IF the measured `QBER < 0.11`, THEN THE Simulator SHALL set `secure_threshold_breached=False` and `SKR > 0.0`.

---

### Requirement 4: Physics Benchmark Validation — Channel Attenuation

**User Story:** As a physicist, I want the channel attenuation model validated against the Physics_Contract formula, so that I can confirm photon survival rates are physically correct.

#### Acceptance Criteria

1. WHEN `distance_km=0`, THE Simulator SHALL produce a photon detection rate within `±5%` of `DETECTOR_EFFICIENCY` (0.85), confirming no fiber loss at zero distance.
2. WHEN `distance_km=50`, THE Simulator SHALL produce a raw photon survival fraction within `±0.03` of `0.10` (10%), per `P_survive = 10^(-0.2*50/10)`.
3. WHEN `distance_km=100`, THE Simulator SHALL produce a raw photon survival fraction within `±0.02` of `0.01` (1%), per `P_survive = 10^(-0.2*100/10)`.
4. WHEN `distance_km` increases from `0` to `100`, THE Simulator SHALL produce monotonically decreasing `sifted_key_length` values across the sweep.
5. THE Simulator SHALL compute `P_survive` using the formula `10^(-(ATTENUATION_COEFF_DB_PER_KM * distance_km) / 10)` with `ATTENUATION_COEFF_DB_PER_KM = 0.2`.

---

### Requirement 5: Physics Benchmark Validation — Secret Key Rate and Binary Entropy

**User Story:** As a physicist, I want the SKR and binary entropy calculations validated against the Physics_Contract formulas, so that I can confirm the key rate model is correct.

#### Acceptance Criteria

1. THE Simulator SHALL compute `binary_entropy(0.0) == 0.0` exactly.
2. THE Simulator SHALL compute `binary_entropy(0.5) == 1.0` exactly.
3. THE Simulator SHALL compute `binary_entropy(0.11)` within `±0.01` of `0.5`.
4. THE Simulator SHALL compute `binary_entropy(q) == binary_entropy(1 - q)` for all `q` in `[0, 1]` (symmetry property).
5. WHEN `QBER >= 0.11`, THE Simulator SHALL return `SKR = 0.0` unconditionally.
6. WHEN `QBER = 0.05` and `sifted_key_length / raw_key_length = 0.5`, THE Simulator SHALL return `SKR` within `±0.01` of `0.5 * (1 - 2 * H(0.05))`.
7. FOR ALL valid `QBER` values in `[0.0, 0.109]`, THE Simulator SHALL return `SKR > 0.0`.
8. FOR ALL valid `QBER` values in `[0.11, 0.5]`, THE Simulator SHALL return `SKR = 0.0`.

---

### Requirement 6: Physics Benchmark Validation — Quantum Gates

**User Story:** As a physicist, I want each quantum gate transformation validated against the Physics_Contract Section 10 lookup table, so that I can confirm gate effects on photon states are correct.

#### Acceptance Criteria

1. WHEN gate `H` is applied to state `|0⟩` (basis=`+`, bit=`0`), THE Simulator SHALL produce output state `|+⟩` (basis=`x`, bit=`0`, angle=`45°`).
2. WHEN gate `H` is applied to state `|1⟩` (basis=`+`, bit=`1`), THE Simulator SHALL produce output state `|−⟩` (basis=`x`, bit=`1`, angle=`135°`).
3. WHEN gate `H` is applied to state `|+⟩` (basis=`x`, bit=`0`), THE Simulator SHALL produce output state `|0⟩` (basis=`+`, bit=`0`, angle=`0°`).
4. WHEN gate `H` is applied to state `|−⟩` (basis=`x`, bit=`1`), THE Simulator SHALL produce output state `|1⟩` (basis=`+`, bit=`1`, angle=`90°`).
5. WHEN gate `X` is applied to state `|0⟩`, THE Simulator SHALL produce output state `|1⟩` (basis=`+`, bit=`1`, angle=`90°`).
6. WHEN gate `X` is applied to state `|1⟩`, THE Simulator SHALL produce output state `|0⟩` (basis=`+`, bit=`0`, angle=`0°`).
7. WHEN gate `X` is applied to state `|+⟩`, THE Simulator SHALL produce output state `|+⟩` unchanged (X is invariant on diagonal basis).
8. WHEN gate `Z` is applied to state `|+⟩`, THE Simulator SHALL produce output state `|−⟩` (basis=`x`, bit=`1`, angle=`135°`).
9. WHEN gate `Z` is applied to state `|−⟩`, THE Simulator SHALL produce output state `|+⟩` (basis=`x`, bit=`0`, angle=`45°`).
10. WHEN gate `Z` is applied to any rectilinear state (`|0⟩` or `|1⟩`), THE Simulator SHALL leave the state unchanged (Z is invariant on rectilinear basis).
11. WHEN gate `Y` is applied to state `|0⟩`, THE Simulator SHALL produce output state `|1⟩` (basis=`+`, bit=`1`).
12. WHEN gate `Y` is applied to state `|+⟩`, THE Simulator SHALL produce output state `|−⟩` (basis=`x`, bit=`1`).
13. WHEN gate `H` is applied twice to any state, THE Simulator SHALL return the original state (H is its own inverse — round-trip property).
14. WHEN gate `X` is applied twice to any state, THE Simulator SHALL return the original state (X is its own inverse — round-trip property).
15. WHEN gate `Z` is applied twice to any state, THE Simulator SHALL return the original state (Z is its own inverse — round-trip property).
16. WHEN any gate is applied to a lost photon (`detected=False`), THE Simulator SHALL leave the photon state unchanged.
17. WHEN any gate is applied, THE Simulator SHALL NOT modify `alice_bit` or `alice_basis` fields.

---

### Requirement 7: Physics Benchmark Validation — WCP Model

**User Story:** As a physicist, I want the Weak Coherent Pulse model validated against the Poisson distribution formulas in the Physics_Contract, so that I can confirm multi-photon fractions are physically accurate.

#### Acceptance Criteria

1. WHEN `wcp_enabled=True` and `mu=0.2`, THE Simulator SHALL produce a multi-photon pulse fraction within `±0.005` of `0.0175` (1.75%), per `P(n>=2|0.2) = 1 - e^(-0.2) - 0.2*e^(-0.2)`.
2. WHEN `wcp_enabled=True` and `mu=0.1`, THE Simulator SHALL produce a multi-photon pulse fraction within `±0.003` of `0.005` (0.5%).
3. WHEN `wcp_enabled=True` and `mu=0.5`, THE Simulator SHALL produce a multi-photon pulse fraction within `±0.01` of `0.090` (9.0%).
4. WHEN `wcp_enabled=True`, THE Simulator SHALL produce a vacuum pulse fraction within `±0.01` of `e^(-mu)` for each tested `mu` value.
5. WHEN `wcp_enabled=True`, THE Simulator SHALL produce a single-photon pulse fraction within `±0.01` of `mu * e^(-mu)` for each tested `mu` value.
6. FOR ALL `mu` values in `[0.05, 0.5]`, THE Simulator SHALL satisfy `vacuum_fraction + single_fraction + multi_fraction == 1.0` (partition property).
7. WHEN `wcp_enabled=False`, THE Simulator SHALL produce `wcp_stats` as an empty dict or equivalent null value, and SHALL NOT apply Poisson photon count modifications to the photon stream.

---

### Requirement 8: Physics Benchmark Validation — PNS Attack

**User Story:** As a physicist, I want the PNS attack validated against the Physics_Contract Section 15 properties, so that I can confirm it is correctly undetectable by QBER and that information leakage is computed accurately.

#### Acceptance Criteria

1. WHEN `attack_strategy='pns'` and `wcp_enabled=True`, THE Simulator SHALL produce `QBER < 0.05` (PNS introduces ~0% QBER — undetectable by threshold).
2. WHEN `attack_strategy='pns'` and `wcp_enabled=True`, THE Simulator SHALL produce `secure_threshold_breached=False` (session not aborted by QBER check).
3. WHEN `attack_strategy='pns'` and `wcp_enabled=True`, THE Simulator SHALL populate `pns_stats` with fields `blocked_single`, `split_multi`, `passed_through`, `eve_info_bits`, and `leak_fraction`.
4. WHEN `attack_strategy='pns'` and `wcp_enabled=True` and `mu=0.2`, THE Simulator SHALL produce `pns_stats.leak_fraction` greater than `0.0` (Eve gains some information).
5. WHEN `attack_strategy='pns'` and `wcp_enabled=True`, THE Simulator SHALL produce `pns_stats.split_multi >= 0` and `pns_stats.blocked_single >= 0`.
6. WHEN `attack_strategy='pns'` and `wcp_enabled=False`, THE Simulator SHALL either skip PNS processing or produce `pns_stats` indicating no multi-photon pulses available to split.

---

### Requirement 9: Physics Benchmark Validation — Decoy State Protocol

**User Story:** As a physicist, I want the decoy state protocol validated against the Physics_Contract Section 16 detection criterion, so that I can confirm it correctly identifies PNS attacks via gain statistics.

#### Acceptance Criteria

1. WHEN `decoy_enabled=True` and `wcp_enabled=True` and `attack_strategy='pns'`, THE Simulator SHALL populate `decoy_results` with fields `pns_detected`, `confidence`, `gain_difference`, `signal_gain`, and `decoy_gain`.
2. WHEN `decoy_enabled=True` and `wcp_enabled=True` and `attack_strategy='pns'` with high `attack_prob`, THE Simulator SHALL produce `decoy_results.pns_detected=True` when `gain_difference > 0.05`.
3. WHEN `decoy_enabled=True` and `wcp_enabled=True` and `attack_strategy='intercept_resend'` with `attack_prob=0.0`, THE Simulator SHALL produce `decoy_results.pns_detected=False` (no PNS attack present).
4. WHEN `decoy_enabled=True`, THE Simulator SHALL assign pulse intensities such that approximately 70% are signal (`mu=0.5`), 20% are decoy (`mu=0.1`), and 10% are vacuum (`mu=0.0`), within `±5%` of each target fraction.
5. WHEN `decoy_enabled=True` and `wcp_enabled=True`, THE Simulator SHALL compute normalized gains `Q_signal/mu_s` and `Q_decoy/mu_d` and compare them against the detection threshold `epsilon=0.05`.
6. WHEN `decoy_enabled=False`, THE Simulator SHALL produce `decoy_results` as an empty dict or equivalent null value.

---

### Requirement 10: Output Artifact — TEST_RESULTS.md

**User Story:** As a developer or physicist, I want a compiled ordered results table of all test runs, so that I can review every parameter combination and its measured outputs in one place.

#### Acceptance Criteria

1. THE Test_Suite SHALL generate `TEST_RESULTS.md` in the `qkd-simulator/backend/tests/` directory after a full test run.
2. THE TEST_RESULTS.md SHALL contain a markdown table with one row per test run, ordered by test category then by parameter values.
3. WHEN generating TEST_RESULTS.md, THE Test_Suite SHALL include the following columns for each row: `test_id`, `n_bits`, `distance_km`, `noise_level`, `attack_prob`, `attack_strategy`, `wcp_enabled`, `mu`, `decoy_enabled`, `gates`, `measured_qber`, `expected_qber`, `qber_deviation`, `measured_skr`, `sifted_key_length`, `efficiency`, `threshold_breached`, `pass_fail`.
4. THE TEST_RESULTS.md SHALL include a summary section at the top with total tests run, total passed, total failed, and overall pass rate.
5. WHEN a test row has `pass_fail=FAIL`, THE TEST_RESULTS.md SHALL highlight the deviation value so it is visually distinguishable from passing rows.
6. THE TEST_RESULTS.md SHALL include the timestamp of the test run and the git commit hash of the simulator code if available.

---

### Requirement 11: Output Artifact — TEST_FINDINGS.md

**User Story:** As a developer or physicist, I want a structured analysis of where the simulator deviates from expected physics, so that I can prioritize which bugs to fix and understand what is working correctly.

#### Acceptance Criteria

1. THE Test_Suite SHALL generate `TEST_FINDINGS.md` in the `qkd-simulator/backend/tests/` directory after a full test run.
2. THE TEST_FINDINGS.md SHALL contain a section titled "Confirmed Working" listing all physics benchmarks that passed within tolerance.
3. THE TEST_FINDINGS.md SHALL contain a section titled "Deviations Found" listing each benchmark that failed, with the parameter combination, measured value, expected value, deviation magnitude, and a plain-language description of the discrepancy.
4. THE TEST_FINDINGS.md SHALL contain a section titled "Statistical Observations" noting any patterns in deviations (e.g., QBER variance increases at low `n_bits`, SKR degrades faster than expected at high distance).
5. THE TEST_FINDINGS.md SHALL contain a section titled "Recommendations" with specific, actionable suggestions for each deviation found.
6. WHEN no deviations are found, THE TEST_FINDINGS.md SHALL state "No deviations from Physics_Contract detected" in the Deviations Found section.
7. THE TEST_FINDINGS.md SHALL be human-readable markdown, not a raw data dump.

---

### Requirement 12: Property-Based Tests with Hypothesis

**User Story:** As a developer, I want property-based tests for the core physics invariants, so that edge cases and boundary conditions are automatically explored beyond the fixed parameter sweep.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a property-based test verifying that `binary_entropy(q) == binary_entropy(1 - q)` for all `q` in `[0.0, 1.0]` (symmetry invariant).
2. THE Test_Suite SHALL include a property-based test verifying that `binary_entropy(q) >= 0.0` for all `q` in `[0.0, 1.0]` (non-negativity invariant).
3. THE Test_Suite SHALL include a property-based test verifying that `compute_skr(sifted, raw, qber) == 0.0` for all `qber >= 0.11` (threshold invariant).
4. THE Test_Suite SHALL include a property-based test verifying that `compute_skr(sifted, raw, qber) >= 0.0` for all valid inputs (non-negativity invariant).
5. THE Test_Suite SHALL include a property-based test verifying that `vacuum_fraction + single_fraction + multi_fraction == 1.0` for all `mu` in `[0.05, 0.5]` (WCP partition invariant).
6. THE Test_Suite SHALL include a property-based test verifying that applying gate `H` twice to any photon state returns the original `bit`, `basis`, and `polarization_angle` (H round-trip property).
7. THE Test_Suite SHALL include a property-based test verifying that applying gate `X` twice to any photon state returns the original `bit`, `basis`, and `polarization_angle` (X round-trip property).
8. THE Test_Suite SHALL include a property-based test verifying that `sifted_key_length <= raw_key_length` for all simulation runs (sifting monotonicity invariant).
9. THE Test_Suite SHALL include a property-based test verifying that `QBER` is always in `[0.0, 0.5]` for all valid input combinations (QBER bounds invariant).
10. WHERE `hypothesis` settings are configured, THE Test_Suite SHALL use `max_examples=200` for pure-function property tests and `max_examples=50` for full-pipeline property tests.

---

### Requirement 13: Test Isolation and Reproducibility

**User Story:** As a developer, I want each test to be isolated and reproducible, so that failures are deterministic and not caused by shared state or random seed variance.

#### Acceptance Criteria

1. THE Test_Suite SHALL set `numpy.random.seed` or use `numpy.random.default_rng` with a fixed seed for all deterministic benchmark tests.
2. WHEN a test uses a fixed seed, THE Test_Suite SHALL document the seed value in the test docstring.
3. THE Test_Suite SHALL NOT share mutable state between test functions — each test SHALL construct its own simulation pipeline instances.
4. WHEN statistical tests require multiple runs to average out randomness, THE Test_Suite SHALL run at least 5 independent trials and use the mean result for comparison against the expected value.
5. THE Test_Suite SHALL use `n_bits >= 5000` for all QBER accuracy tests to ensure the 10% QBER sample contains at least 500 bits, reducing sampling variance to well below `±2%`.
6. IF a test is inherently stochastic and cannot be made deterministic, THEN THE Test_Suite SHALL document the expected variance and use a tolerance that accounts for it.

---

### Requirement 14: Test Execution — Accuracy Over Speed

**User Story:** As a physicist, I want the test suite to prioritize statistical accuracy over execution speed, so that the results are as close to ground truth as possible and small deviations are not masked by sampling noise.

#### Acceptance Criteria

1. THE Test_Suite SHALL use `n_bits=5000` as the default for all parametrized sweep tests to maximize the QBER sample size and reduce statistical variance.
2. THE Test_Suite SHALL use `n_bits=5000` for the core physics benchmark tests (no-Eve baseline, full-Eve QBER, half-Eve QBER, noise-only QBER).
3. WHEN a statistical test requires multiple independent trials, THE Test_Suite SHALL run at least 5 independent trials per combination and use the mean result for comparison — not a single run.
4. THE Test_Suite SHALL NOT impose any timeout or time limit on individual test cases — each test SHALL run to completion regardless of how long it takes.
5. THE Test_Suite SHALL mark the full high-precision sweep with `@pytest.mark.slow` so it can be invoked explicitly with `pytest tests/ -m slow -v` when a full accuracy report is needed.
6. THE Test_Suite SHALL include a `@pytest.mark.fast` subset using `n_bits=1000` and 3 trials for quick sanity checks, but this SHALL NOT be used for generating the final TEST_RESULTS.md or TEST_FINDINGS.md artifacts.
7. THE TEST_RESULTS.md and TEST_FINDINGS.md artifacts SHALL only be generated from the `@pytest.mark.slow` full-precision run — never from the fast subset.
8. THE Test_Suite SHALL NOT make any network calls or require a running FastAPI server for the accuracy validation tests.
9. WHERE `hypothesis` is used for property-based tests, THE Test_Suite SHALL use `max_examples=200` for pure-function property tests and `max_examples=50` for full-pipeline property tests.
