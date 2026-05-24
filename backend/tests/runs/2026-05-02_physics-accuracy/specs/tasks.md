# Tasks

## Task List

- [x] 1. Set up pytest test suite structure and conftest.py
  - [x] 1.1 Create `qkd-simulator/backend/tests/__init__.py` (already exists — verify it is importable)
  - [x] 1.2 Create `qkd-simulator/backend/tests/conftest.py` with `PipelineResult` and `TrialResult` dataclasses, `run_pipeline()` helper, `run_pipeline_trials()` helper, all shared fixtures (`alice`, `bob`, `channel_0km`, `eve_none`, `protocol`), session-scoped `results_collector` fixture, and `pytest_sessionfinish` hook that serializes results to `tests/.results_cache.json`
  - [x] 1.3 Add `hypothesis>=6.100.0` to `qkd-simulator/backend/requirements.txt`
  - [x] 1.4 Create `pytest.ini` (or `pyproject.toml` `[tool.pytest.ini_options]` section) in `qkd-simulator/backend/` registering `slow` and `fast` marks
  - [x] 1.5 Verify `pytest tests/ -v` runs without errors from `qkd-simulator/backend/` (empty test collection is acceptable at this stage)

- [ ] 2. Implement `test_physics_benchmarks.py` — QBER, attenuation, SKR, entropy
  - [x] 2.1 Migrate all 4 tests from `test_physics.py` as proper pytest functions with descriptive assert messages
  - [ ] 2.2 Migrate all 14 tests from `test_comprehensive.py` as proper pytest functions
  - [ ] 2.3 Implement `test_qber_no_eve_baseline` — 5 trials, mean QBER < 0.02, `@pytest.mark.fast`
  - [ ] 2.4 Implement `test_qber_noise_only` — 5 trials, mean QBER ≈ noise_level ± 0.03, `@pytest.mark.fast`
  - [ ] 2.5 Implement `test_qber_full_eve` — 5 trials, mean QBER ≈ 0.25 ± 0.03, `@pytest.mark.fast`
  - [ ] 2.6 Implement `test_qber_half_eve` — 5 trials, mean QBER ≈ 0.125 ± 0.03, `@pytest.mark.fast`
  - [ ] 2.7 Implement `test_threshold_breach_sets_skr_zero` — QBER ≥ 0.11 → SKR=0, threshold_breached=True, `@pytest.mark.fast`
  - [ ] 2.8 Implement `test_below_threshold_skr_positive` — QBER < 0.11 → SKR > 0, `@pytest.mark.fast`
  - [ ] 2.9 Implement `test_channel_attenuation_0km` — detection rate ≈ 0.85 ± 0.05, `@pytest.mark.fast`
  - [ ] 2.10 Implement `test_channel_attenuation_50km` — survival fraction ≈ 0.10 ± 0.03, `@pytest.mark.fast`
  - [ ] 2.11 Implement `test_channel_attenuation_100km` — survival fraction ≈ 0.01 ± 0.02, `@pytest.mark.fast`
  - [ ] 2.12 Implement `test_channel_monotonic_attenuation` — sifted_key_length non-increasing over [0, 10, 50, 100] km, `@pytest.mark.slow`
  - [ ] 2.13 Implement `test_p_survive_formula` — channel.p_survive == 10^(-0.2*d/10) for d in [0, 10, 50, 100], `@pytest.mark.fast`
  - [ ] 2.14 Implement `test_binary_entropy_zero`, `test_binary_entropy_half`, `test_binary_entropy_threshold`, `test_binary_entropy_symmetry` — exact and approximate assertions, `@pytest.mark.fast`
  - [ ] 2.15 Implement `test_skr_at_threshold`, `test_skr_below_threshold`, `test_skr_above_threshold_range`, `test_skr_positive_range`, `@pytest.mark.fast`

- [ ] 3. Implement `test_gates.py` — gate transformations and round-trip properties
  - [ ] 3.1 Implement `test_gate_H_rectilinear_to_diagonal` — H: |0⟩→|+⟩ (45°), |1⟩→|−⟩ (135°), `@pytest.mark.fast`
  - [ ] 3.2 Implement `test_gate_H_diagonal_to_rectilinear` — H: |+⟩→|0⟩ (0°), |−⟩→|1⟩ (90°), `@pytest.mark.fast`
  - [ ] 3.3 Implement `test_gate_X_bit_flip` — X: |0⟩→|1⟩, |1⟩→|0⟩, `@pytest.mark.fast`
  - [ ] 3.4 Implement `test_gate_X_diagonal_invariant` — X: |+⟩→|+⟩, |−⟩→|−⟩, `@pytest.mark.fast`
  - [ ] 3.5 Implement `test_gate_Z_rectilinear_invariant` — Z: |0⟩→|0⟩, |1⟩→|1⟩, `@pytest.mark.fast`
  - [ ] 3.6 Implement `test_gate_Z_diagonal_flip` — Z: |+⟩→|−⟩, |−⟩→|+⟩, `@pytest.mark.fast`
  - [ ] 3.7 Implement `test_gate_Y_transformations` — Y: |0⟩→|1⟩, |+⟩→|−⟩, `@pytest.mark.fast`
  - [ ] 3.8 Implement `test_gate_S_transformations` and `test_gate_T_transformations` — phase-shift checks, `@pytest.mark.fast`
  - [ ] 3.9 Implement `test_gate_H_round_trip`, `test_gate_X_round_trip`, `test_gate_Z_round_trip` — apply gate twice, verify original state, `@pytest.mark.fast`
  - [ ] 3.10 Implement `test_gate_lost_photon_unchanged` — gate on detected=False leaves state unchanged, `@pytest.mark.fast`
  - [ ] 3.11 Implement `test_gate_preserves_alice_fields` — alice_bit and alice_basis unchanged after any gate, `@pytest.mark.fast`

- [ ] 4. Implement `test_wcp_pns_decoy.py` — WCP model, PNS attack, decoy protocol
  - [ ] 4.1 Implement `test_wcp_multi_fraction_mu_02`, `test_wcp_multi_fraction_mu_01`, `test_wcp_multi_fraction_mu_05` — multi_fraction ≈ theoretical ± tolerance, `@pytest.mark.fast`
  - [ ] 4.2 Implement `test_wcp_vacuum_fraction` and `test_wcp_single_fraction` — fractions ≈ e^(-mu) and mu*e^(-mu) ± 0.01, `@pytest.mark.fast`
  - [ ] 4.3 Implement `test_wcp_partition_property` — vacuum + single + multi == 1.0 for mu in [0.1, 0.2, 0.5], `@pytest.mark.fast`
  - [ ] 4.4 Implement `test_wcp_disabled_no_stats` — wcp_enabled=False → wcp_stats is empty dict, `@pytest.mark.fast`
  - [ ] 4.5 Implement `test_pns_qber_undetectable` — PNS + WCP → mean QBER < 0.05 over 5 trials, `@pytest.mark.slow`
  - [ ] 4.6 Implement `test_pns_threshold_not_breached` — PNS + WCP → threshold_breached=False, `@pytest.mark.slow`
  - [ ] 4.7 Implement `test_pns_stats_fields_present` — pns_stats has all 5 required fields, `@pytest.mark.fast`
  - [ ] 4.8 Implement `test_pns_leak_fraction_positive` — pns_stats.leak_fraction > 0 at mu=0.2, `@pytest.mark.slow`
  - [ ] 4.9 Implement `test_pns_stats_non_negative` — split_multi >= 0, blocked_single >= 0, `@pytest.mark.fast`
  - [ ] 4.10 Implement `test_pns_without_wcp` — PNS without WCP → no multi-photon pulses available, `@pytest.mark.fast`
  - [ ] 4.11 Implement `test_decoy_fields_present` — decoy_results has all 5 required fields, `@pytest.mark.fast`
  - [ ] 4.12 Implement `test_decoy_detects_pns_high_prob` — decoy + PNS + attack_prob=1.0 → pns_detected=True, `@pytest.mark.slow`
  - [ ] 4.13 Implement `test_decoy_no_false_positive` — decoy + intercept_resend + attack_prob=0.0 → pns_detected=False, `@pytest.mark.slow`
  - [ ] 4.14 Implement `test_decoy_intensity_fractions` — 70% signal, 20% decoy, 10% vacuum ± 5%, `@pytest.mark.fast`
  - [ ] 4.15 Implement `test_decoy_disabled_no_results` — decoy_enabled=False → decoy_results is empty dict, `@pytest.mark.fast`

- [ ] 5. Implement `test_property_based.py` — hypothesis property tests
  - [ ] 5.1 Define `pure_settings` (max_examples=200) and `pipeline_settings` (max_examples=50) in the file or imported from conftest.py
  - [ ] 5.2 Implement `test_binary_entropy_symmetry_property` — H(q) == H(1-q) for all q in [0,1], `pure_settings`
    - Feature: qkd-simulation-accuracy-testing, Property 7: Binary entropy symmetry
  - [ ] 5.3 Implement `test_binary_entropy_non_negative_property` — H(q) >= 0 for all q in [0,1], `pure_settings`
    - Feature: qkd-simulation-accuracy-testing, Property 8: Binary entropy non-negativity
  - [ ] 5.4 Implement `test_skr_zero_above_threshold_property` — SKR == 0 for all qber >= 0.11, `pure_settings`
    - Feature: qkd-simulation-accuracy-testing, Property 2: SKR zero at/above threshold
  - [ ] 5.5 Implement `test_skr_non_negative_property` — SKR >= 0 for all valid inputs, `pure_settings`
    - Feature: qkd-simulation-accuracy-testing, Property 4: SKR non-negative
  - [ ] 5.6 Implement `test_wcp_partition_property` — vacuum + single + multi == 1.0 for all mu in [0.05, 0.5], `pure_settings`
    - Feature: qkd-simulation-accuracy-testing, Property 12: WCP partition invariant
  - [ ] 5.7 Implement `test_gate_H_round_trip_property` — H(H(state)) == original for any photon state, `pure_settings`
    - Feature: qkd-simulation-accuracy-testing, Property 9: Involutory gate round-trips
  - [ ] 5.8 Implement `test_gate_X_round_trip_property` — X(X(state)) == original for any photon state, `pure_settings`
    - Feature: qkd-simulation-accuracy-testing, Property 9: Involutory gate round-trips
  - [ ] 5.9 Implement `test_sifted_leq_raw_property` — sifted_key_length <= raw_key_length for all pipeline inputs, `pipeline_settings`
    - Feature: qkd-simulation-accuracy-testing, Property 17: Sifted ≤ raw
  - [ ] 5.10 Implement `test_qber_bounds_property` — QBER in [0.0, 0.5] for all valid pipeline inputs, `pipeline_settings`
    - Feature: qkd-simulation-accuracy-testing, Property 18: QBER bounds

- [ ] 6. Implement `test_parameter_sweep.py` — full parametrized sweep
  - [ ] 6.1 Define all sweep dimension constants: `N_BITS_VALUES`, `DISTANCE_KM_VALUES`, `NOISE_LEVEL_VALUES`, `ATTACK_PROB_VALUES`, `ATTACK_STRATEGIES`, `GATE_TYPES`, `MU_VALUES`
  - [ ] 6.2 Implement `test_sweep_qber_vs_attack_prob` — parametrized over attack_prob × attack_strategy (non-PNS), 5 trials, QBER ≈ 0.25*p ± 0.04, `@pytest.mark.slow`
  - [ ] 6.3 Implement `test_sweep_qber_vs_noise` — parametrized over noise_level, 5 trials, QBER ≈ noise ± 0.03, `@pytest.mark.slow`
  - [ ] 6.4 Implement `test_sweep_attenuation_vs_distance` — parametrized over distance_km, survival fraction matches formula, `@pytest.mark.slow`
  - [ ] 6.5 Implement `test_sweep_skr_threshold` — parametrized over all combinations, SKR=0 when QBER≥0.11, `@pytest.mark.slow`
  - [ ] 6.6 Implement `test_sweep_gate_individual` — parametrized over GATE_TYPES, each gate applied to photon stream, `@pytest.mark.slow`
  - [ ] 6.7 Implement `test_sweep_wcp_mu_values` — parametrized over MU_VALUES, WCP fractions match Poisson theory, `@pytest.mark.slow`
  - [ ] 6.8 Implement `test_sweep_decoy_pns_combination` — parametrized over attack_prob values, decoy detects PNS, `@pytest.mark.slow`
  - [ ] 6.9 Implement `test_sweep_collect_results` — iterates all combinations, calls `run_pipeline_trials(n_trials=5)`, appends `ResultRow` dicts to `results_collector`, `@pytest.mark.slow`

- [ ] 7. Implement `generate_reports.py` — report generation script
  - [ ] 7.1 Implement `build_results_table(rows: list[ResultRow]) -> str` — generates markdown table with all required columns, summary header, timestamp, git hash, FAIL row highlighting
  - [ ] 7.2 Implement `build_findings_report(rows: list[ResultRow]) -> str` — generates TEST_FINDINGS.md with "Confirmed Working", "Deviations Found", "Statistical Observations", and "Recommendations" sections
  - [ ] 7.3 Implement main script logic: invoke `pytest tests/ -m slow --tb=short -q` as subprocess, load `.results_cache.json`, call both builders, write `TEST_RESULTS.md` and `TEST_FINDINGS.md` to `tests/`
  - [ ] 7.4 Handle error case where `.results_cache.json` does not exist — print clear error and exit non-zero
  - [ ] 7.5 Verify `python tests/generate_reports.py` runs end-to-end and produces both output files

- [ ] 8. Verify full test suite and run fast subset
  - [ ] 8.1 Run `pytest tests/ -m fast -v` from `qkd-simulator/backend/` and confirm all fast tests pass
  - [ ] 8.2 Run `pytest tests/test_property_based.py -v` and confirm all property tests pass
  - [ ] 8.3 Run `pytest tests/test_gates.py -v` and confirm all gate tests pass
  - [ ] 8.4 Confirm `pytest tests/ -m slow -v` is runnable (may take several minutes — document expected runtime)
  - [ ] 8.5 Confirm legacy test files `test_physics.py` and `test_comprehensive.py` still pass (they are kept for reference)
