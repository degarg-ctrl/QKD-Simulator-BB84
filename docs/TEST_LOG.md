# Test Log
Format: [YYYY-MM-DD] | Run folder | Tests | Result | Notes

---

[2026-05-04] | 2026-05-04_comprehensive-validation | 85 tests | 83 PASS / 2 KNOWN-FAIL | 8-section empirical suite. 83 physics tests pass. 2 known gate physics bugs: Z gate unexpectedly raises QBER 50.7% (should be <10%), X gate shows no bit-flip effect. Both logged in ERROR_LOG. Section 8 (API sync) skipped — requires live backend server.

[2026-05-02] | 2026-05-02_physics-accuracy | 113 tests | 113 PASS / 0 FAIL | Full BB84 physics accuracy suite — gates, WCP/PNS/decoy, property-based (Hypothesis), parameter sweep, physics benchmarks. All physics contract invariants verified.

[2026-03-29] | 2026-03-29_sprint-11-13     | 14 tests  | 14 PASS / 0 FAIL  | Sprint 11-13 component verification — 7 new components integrity checked, store integration verified, 14 physics pipeline tests passed.

---
<!-- New entries go above this line, most recent first -->
