# Test Log
Format: [YYYY-MM-DD] | Run folder | Tests | Result | Notes

---

[2026-09-14] | 2026-09-14_p1-audit-fixes | 82 tests | 82 PASS / 0 FAIL | Priority-1 audit fixes H1–H7. H1 vacuum gain/Y_0 accounting (registered vacuum click counts, PNS-blocked excluded); H2 long-distance decoy sensitivity characterised, criterion not weakened; H3 CNOT cloning probe ~25% QBER (was ~50%); H4 metrics.theoretical_qber() single authoritative chart model; H5 event_stream cap absolute (<= 500); H6 noise bit-flip updates bit/state_label/polarization_angle together; H7 one seeded numpy Generator per request (create_rng/resolve_rng) + optional seed param. Superseded by the C1/P1 reconciliation below, which also collects this run in the default pytest config.

[2026-09-14] | 2026-09-14_qber-small-sample | 19 tests | 19 PASS / 0 FAIL | Audit fix C1 — QBER small-sample semantics. Covers sifted_count 0/1/<min/min-1/min, normal large sample, full intercept-resend small & adequate N, SKR None handling, API qber/qber_estimated consistency, exp2/exp4 sample adequacy. Regression re-runs (post-fix): 2026-05-02 physics-accuracy 113 PASS; 2026-05-04 comprehensive-validation 85 PASS / 9 SKIP; 2026-09-09 event-model 70 PASS / 1 SKIP; frontend vitest 38 PASS; frontend build PASS.

[2026-09-14] | 2026-09-14_c1-p1-reconciliation | 101 tests | 101 PASS / 0 FAIL | C1/P1 reconciliation. Both same-day audit-fix suites coexist and are now BOTH collected by the default pytest.ini (previously testpaths listed only the P1 suite, silently omitting the 19 C1 tests). Doc drift corrected (alice.encode_user_input max 20 -> 300; simulatorAPI attack_strategy docstring + 'pns'). C2 (PNS effective-SKR unit mismatch) and C3 (event-stream stride lane collapse) confirmed still open — see context doc.

[2026-09-09] | 2026-09-09_event-model-transmission | 71 tests | 70 PASS / 1 SKIP / 0 FAIL | Event model + transmission accounting + gate functional suite (TRANSMISSION-001..005, Eve/PNS semantics, physics regressions, stream sampling, API integration, all 6 gates + probes via API). Skip: dark-count event property run had no dark count fire at P=1e-5. Old comprehensive suite re-run: 85 PASS / 9 SKIP (no regressions). Frontend vitest suite: 38 PASS (28 visual encoding + 10 animation lifecycle/gate serialization).
[2026-09-09] | 2026-09-09_event-model-transmission | 38 tests | 37 PASS / 1 SKIP / 0 FAIL | Event model + transmission accounting suite (TRANSMISSION-001..005, Eve/PNS semantics, physics regressions, stream sampling, API integration). Skip: dark-count event property run had no dark count fire at P=1e-5. Old comprehensive suite re-run: 85 PASS / 9 SKIP (no regressions). Frontend vitest suite: 28 PASS.
[2026-06-24] | 2026-06-24_table-ix-detector-efficiency-sweep | 3 sub-studies | COMPLETED | Table IX detector efficiency (0.50-0.99) & dark count (10^-7 - 10^-3) sweeps across 50-150km. Evaluated SPAD vs SNSPD technology limits.
[2026-06-22] | 2026-06-22_table-vii-decoy-verification | 6 configs | 6 COMPLETED | Table VII: Simulated paired attack scenarios at 50km. Identified absolute epsilon threshold bug in decoy.py.
[2026-06-18] | 2026-06-18_table-iii-distance-sweep | 16 dists  | 16 COMPLETED | Table III distance sweep to 140km using n=5,000,000 to ensure stable QBER at sparse counts.
[2026-06-12] | 2026-06-12_table-iv-wcp-mu-sweep | 18 mu vals | 18 COMPLETED | Table IV sweep. Validated 42% -> 62% SKR retention trend under PNS attack.
[2026-06-08] | 2026-06-08_channel-vacuum-bug | 195 tests | 195 PASS / 0 FAIL | Bug hunt for vacuum pulse anomaly. Fixed channel.py to enforce `lost=True` on wcp_vacuum pulses.
[2026-05-04] | 2026-05-04_comprehensive-validation | 85 tests | 85 PASS / 0 FAIL | 8-section empirical suite. All 85 physics tests pass following test_gates.py assertion correction to match PHYSICS_CONTRACT.md. Section 8 (API sync) skipped — requires live backend server.
[2026-05-02] | 2026-05-02_physics-accuracy | 113 tests | 113 PASS / 0 FAIL | Full BB84 physics accuracy suite — gates, WCP/PNS/decoy, property-based (Hypothesis), parameter sweep, physics benchmarks. All physics contract invariants verified.
[2026-03-29] | 2026-03-29_sprint-11-13     | 14 tests  | 14 PASS / 0 FAIL  | Sprint 11-13 component verification — 7 new components integrity checked, store integration verified, 14 physics pipeline tests passed.

---
<!-- New entries go above this line, most recent first -->
