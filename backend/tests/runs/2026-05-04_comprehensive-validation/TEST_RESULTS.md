# TEST RESULTS — Comprehensive Validation
**Run date:** 2026-05-04  
**Run folder:** `2026-05-04_comprehensive-validation`  
**Total rows in cache:** 9

---
## Section 1 — n_bits Sweep
| n_bits | mean QBER | std QBER | mean SKR | mean sifted | PASS? |
|---|---|---|---|---|---|

---
## Section 2 — Distance Sweep
| distance_km | survival_fraction | mean QBER | mean SKR | mean sifted |
|---|---|---|---|---|

---
## Section 3 — Noise Sweep
| noise_level | mean QBER | std QBER | mean SKR | PASS (QBER≈noise±0.03)? |
|---|---|---|---|---|

---
## Section 4 — Eve Attack Strategies
| strategy | attack_prob | mean QBER | std QBER | mean SKR |
|---|---|---|---|---|

---
## Section 5 — Realistic Source Model
| μ | decoy | strategy | mean QBER | mean SKR | PASS (PNS QBER<0.05)? |
|---|---|---|---|---|---|

---
## Section 6 — Gate Functionality
| gate | mean QBER | std QBER | mean SKR |
|---|---|---|---|

---
## Section 7 — Single Photon Mode (200 trials each)
| distance_km | noise | attack_prob | arrived | lost | loss_rate | PASS (100km loss>0.80)? |
|---|---|---|---|---|---|---|