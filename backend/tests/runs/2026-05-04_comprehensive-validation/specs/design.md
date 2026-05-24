# Test Design — Comprehensive Validation
**Run:** 2026-05-04_comprehensive-validation

## Approach

All tests use **direct Python imports** of `core.*` modules (no HTTP), except Section 8 (frontend sync) which calls `localhost:8000`.

Each parameterised combination runs **N independent trials** with different random seeds derived as `seed = base_seed + i * 1000`. Results are averaged to produce the canonical measurement for that combination.

---

## Section 1 — n_bits Sweep
| Parameter | Values |
|---|---|
| n_bits | 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000 |
| distance_km | 0 |
| noise_level | 0.0 |
| attack_prob | 0.0 |
| attack_strategy | intercept_resend |
| **Trials per combo** | **25** |

**Metrics collected:** mean QBER, std QBER, mean SKR, mean sifted_key_length

---

## Section 2 — Distance Sweep
| Parameter | Values |
|---|---|
| distance_km | 0, 10, 25, 50, 75, 100, 125, 150 |
| n_bits | 5000 |
| noise_level | 0.0 |
| attack_prob | 0.0 |
| **Trials per combo** | **25** |

**Metrics collected:** mean survival_fraction, mean sifted_key_length, mean QBER, mean SKR

---

## Section 3 — Noise Sweep
| Parameter | Values |
|---|---|
| noise_level | 0.0, 0.01, 0.02, 0.05, 0.08, 0.10, 0.12 |
| n_bits | 5000 |
| distance_km | 0 |
| attack_prob | 0.0 |
| **Trials per combo** | **25** |

**Metrics collected:** mean QBER, std QBER, mean SKR, threshold_breached

---

## Section 4 — Eve Attack Strategies
| attack_prob | Strategies |
|---|---|
| 0.0 | intercept_resend |
| 0.25, 0.50, 0.75, 1.0 | intercept_resend |
| 0.25, 0.50, 0.75, 1.0 | partial |
| 0.25, 0.50, 0.75, 1.0 | burst |

Fixed: n_bits=5000, distance_km=0, noise_level=0.0  
**Trials per combo: 25**

**Metrics collected:** mean QBER, mean SKR, threshold_breached

---

## Section 5 — Realistic Source Model (WCP + PNS + Decoy)
| wcp | μ | decoy | attack_strategy | attack_prob |
|---|---|---|---|---|
| True | 0.1 | False | intercept_resend | 0.5 |
| True | 0.2 | False | intercept_resend | 0.5 |
| True | 0.5 | False | intercept_resend | 0.5 |
| True | 0.2 | False | pns | 0.5 |
| True | 0.5 | False | pns | 0.5 |
| True | 0.2 | True | pns | 0.5 |
| True | 0.5 | True | pns | 0.5 |
| True | 0.2 | False | partial | 0.5 (smoke) |
| True | 0.2 | False | burst | 0.5 (smoke) |

Fixed: n_bits=5000, distance_km=0, noise_level=0.0  
**Trials per combo: 25 (smoke tests: 5)**

---

## Section 6 — Gate Functionality
| Gate | Lane |
|---|---|
| H | 0 |
| X | 0 |
| Y | 0 |
| Z | 0 |
| S | 0 |
| T | 0 |

Fixed: n_bits=3000, distance_km=0, noise_level=0.0, attack_prob=0.0  
**Trials per gate: 25**

---

## Section 7 — Single Photon Mode
| distance_km | noise_level | attack_prob | attack_strategy |
|---|---|---|---|
| 0 | 0.0 | 0.0 | intercept_resend |
| 50 | 0.0 | 0.0 | intercept_resend |
| 100 | 0.0 | 0.0 | intercept_resend |
| 0 | 0.05 | 0.0 | intercept_resend |
| 0 | 0.0 | 1.0 | intercept_resend |

Fixed: n_bits=1  
**Trials per combo: 200**

---

## Section 8 — Frontend/Backend API Sync
Direct HTTP calls to `http://localhost:8000/api/simulate`.  
Tests that response fields are mathematically consistent with each other and with bit_stream data.

---

## Theoretical Reference Values

| Scenario | Expected Value | Source |
|---|---|---|
| No Eve, no noise, 0km — QBER | < 2% | BB84 original (Bennett & Brassard 1984) |
| Full Eve (intercept_resend) — QBER | 25% ± 3% | BB84 security proof |
| 50% Eve — QBER | 12.5% ± 3% | Linear intercept scaling |
| Noise-only (5%) — QBER | ~5% ± 3% | Independent error model |
| 50 km survival fraction | ~10% ± 3% | Beer-Lambert, α=0.2 dB/km |
| 100 km survival fraction | ~1% ± 2% | Beer-Lambert, α=0.2 dB/km |
| PNS attack QBER | < 5% | Lo & Preskill (2007) |
| SKR cutoff | QBER ≥ 11% → SKR=0 | Shor-Preskill bound (2000) |
| Single photon, 100km lost rate | > 80% | Beer-Lambert attenuation |
