# TEST FINDINGS — 2026-09-09 Event Model & Transmission Accounting

## 1. Event-semantics correction (pre-existing bug, now fixed)

**Finding:** Before this change, Eve's intercept-resend and the PNS
attack were applied to ALL slots — including photons already absorbed
by the fiber (channel.transmit() runs first in the router pipeline).
A photon lost at 20 km could still be "intercepted" by Eve at her tap,
and PNS `blocked_single` counted photons that died naturally in the
fiber.

**Impact:** No QBER/SKR impact (lost slots stay lost either way), but
per-event visualization would have been indefensible: the animation
would show Eve intercepting a photon that never reached her.

**Fix:** `fiber_survived` is now recorded by channel.transmit(); Eve
and PNS skip slots with `fiber_survived=False`. Attack probabilities
and all physics are unchanged. Verified: intercepted ⇒ fiber_survived
(2000 pulses at 60 km, full attack).

## 2. Dark-count suppression on PNS-blocked slots

**Finding:** pns.attack() forces `detected=False` on blocked slots,
which also suppresses any dark-count draw the channel made for that
slot (Bob never measures it). The accounting and event records now
count only REGISTERED dark clicks (`dark_count ∧ measured`), keeping
`total_detections = real + dark` exact.

## 3. Accounting identities are exact

All four conservation identities hold exactly across ideal, WCP, and
WCP+PNS modes — they are structural (computed from the same state
fields), not statistical. This makes them reliable frontend invariants
for the Transmission HUD.

## 4. Statistics match theory at 4σ

- Fiber survival at 0/25/50/100 km matches 10^(-0.2d/10) within 4σ.
- Realistic detector efficiency observed 0.8503 vs η=0.85.
- Dark counts ≈ undetected_slots × 1e-5.
- Full intercept QBER 25% (contract: 25%±3%).
- PNS QBER < 5% (contract: undetectable by threshold).

## 5. event_stream sampling

Stride sampling (step = ceil(n/500)) + first-occurrence rescue for
rare categories (PNS split/block, dark count, interception) is
deterministic and order-preserving. At n=2000 the sample is ≤ 504
records. Aggregate counts must always come from `transmission`, never
from the sample — enforced by design (accounting computed from the
complete array before sampling).

## 6. Recommendations

- The frontend must treat `bit_stream` as a legacy detected-only view;
  animation should consume `event_stream`.
- `transmission.event_stream_truncated` tells the UI when playback is
  a sample (N > 500) so the HUD can label counts as full-simulation
  totals while playback shows representative events.
