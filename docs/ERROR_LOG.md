# Error Log
Format: [YYYY-MM-DD HH:MM] | Branch | Error | Cause | Resolution | Prevention

[2026-09-14 18:22] | fix/c1-p1-reconciliation | ERROR: Default pytest run silently omitted the C1 audit-fix suite (merge/reconciliation gap)
Cause: The C1 (fix/qber-small-sample-c1) and P1 (H1-H7, main) audit-fix branches were developed the same day but never merged. Both touched backend/pytest.ini; the P1 side set testpaths = tests/runs/2026-09-14_p1-audit-fixes/suite, overwriting the active pointer, so a bare `pytest` collected only the 82 P1 tests and silently dropped the 19 C1 tests. A green default run therefore did not actually cover the C1 fix.
Resolution: pytest.ini testpaths now lists BOTH same-day suites; a bare `pytest` collects 101 tests (19 C1 + 82 P1), all passing. Doc drift raised by the same merge was corrected (alice.encode_user_input docstring max 20 -> 300; simulatorAPI attack_strategy docstring now lists 'pns'). C2 (PNS effective-SKR unit mismatch) and C3 (event-stream stride lane collapse) were confirmed still open and are NOT fixed here.
Prevention: When two corrective branches share a config file that selects the active test set, reconciliation must merge the selections, not let one overwrite the other. After a merge, verify the default `pytest` collection count equals the union of the branches' tests.

[2026-09-14 17:45] | fix/qber-small-sample-c1 | ERROR: QBER reported as 0.0 for keys whose error rate was never measured (audit defect C1)
Cause: estimate_qber() set sample_size = floor(0.10 * sifted_count). For sifted_count < 10 the sample was empty, yet the function returned qber = 0.0 with threshold_breached = False. Full intercept-resend at small N therefore appeared "error-free". The router/schema also treated qber as a plain float, so the unmeasured state had no representation.
Resolution: Added explicit minimum-sample policy (QBER_MIN_SAMPLE_SIZE = 10 sampled bits; QBER_MIN_SIFTED_COUNT = 100). Below the minimum, estimate_qber() now returns qber = None and qber_estimated = False (no bits sacrificed). Propagated through compute_skr (None -> 0.0, cannot certify), extract_key (aborts), SimulationResponse (qber: float | None, qber_estimated: bool), the router (no None->0 coercion), and the frontend (all QBER displays render "not estimated" / "—"). compute_pns_security guards qber_misleading against None. exp2/exp4 raised from 8 to 300 photons (cap 300) so their sifted key reaches the minimum sample. Physics unchanged; only the small-sample representation changed.
Prevention: Never represent "not measured" as a numeric zero. Statistical estimators that can be undefined must return an explicit not-estimated state that survives serialization; consumers must branch on the estimation flag, not the value.

[2026-09-09 23:36] | fix/gate-regression | ERROR: Sidebar gate drag-and-drop silently broken (gates could not be placed)
Cause: SidebarItem rendered a framer-motion motion.div with draggable + onDragStart. framer-motion intercepts onDragStart as its own gesture prop, so the native HTML5 dragstart handler never ran, dataTransfer stayed empty, and every drop was a silent no-op. A second bug in QuantumCanvas.handleDrop computed the lane by dividing the canvas into vertical thirds; since all three lane centers (150/200/250 of 400px) lie in the middle third, every successful drop landed on lane 1.
Resolution: SidebarItem now uses a plain div for the draggable item (hover styling via CSS classes, no motion gesture interception). handleDrop maps the drop Y to the NEAREST lane center in canvas coordinates.
Prevention: Native HTML5 drag handlers must not be attached to framer-motion components; lane/position mapping must use the canvas coordinate system, not viewport fractions.

[2026-09-09 23:37] | fix/zoom-lifecycle | ERROR: Zoom/pan/resize during playback restarted the animation from the beginning
Cause: usePhotonAnimation's animate callback was a useCallback depending on drawStaticScene, which QuantumCanvas recreates whenever zoomedWidth/zoomedHeight change (zoom, resize). The start-effect depended on [results, animate], so every zoom step re-ran the effect, resetting particles, release index, and counters. Additionally, the paused branch returned before drawing, so a paused canvas went blank on zoom.
Resolution: Playback state now lives in refs keyed to results only. drawStaticScene is stored in a ref (updated without restart). All volatile store state (pause/speed/syncMode) is read via getState() inside the rAF loop. Paused frames are drawn without updating, so zoom during pause shows the frozen frame.
Prevention: Animation/viewport state must be decoupled — viewport-driven callback identity changes must never be dependencies of playback lifecycle effects.

[2026-09-09 22:16] | feature/event-model | ERROR: Eve/PNS attacks applied to photons absorbed in the fiber (pre-existing event-semantics bug)
Cause: The router pipeline applies channel.transmit() (fiber attenuation + detector draws) BEFORE eve.intercept() and PNSAttack.attack(). Both attacks iterated all slots regardless of survival, so photons lost in the fiber were still "intercepted"/"split"/"blocked" — physically impossible (they never reached Eve's position) and PNS blocked_single counted naturally-lost photons.
Resolution: channel.transmit() now records fiber_survived per slot; eve.py and pns.py skip slots with fiber_survived=False. Attack probabilities and physics are unchanged (verified: QBER 25%±3% full intercept, PNS <5%, survival benchmarks, 85/85 old-suite regression). Impact on metrics was nil (lost slots stayed lost); the bug affected event records and any future per-event visualization.
Prevention: Pipeline-order reachability constraints (later stages can only consume pulses that physically reached them) should be encoded as explicit guards in each stage, not assumed.

[2026-09-09 22:50] | feature/visualization | ERROR: PNS-blocked particle animation never terminated (infinite fade)
Cause: PhotonParticle PNS-block check ran every frame without a state guard, resetting lossFadeTimer each frame while fading at EVE_X.
Resolution: Added state === 'travelling' guard (mirroring the fiber-loss check). Caught by frontend vitest lifecycle test.
Prevention: Terminal-state transitions must be guarded to fire once; lifecycle tests should run particles to completion for every outcome category.

[2026-05-04 04:19] | main | ERROR: Simulator fails to run for PNS, Partial, and Burst attacks
Cause: frontend API validator in simulatorAPI.js had hardcoded list of allowed strategies that did not match backend schema or ConfigPanel output.
Resolution: Synced validStrategies array in simulatorAPI.js with backend Literal and fixed ConfigPanel value outputs.
Prevention: When updating Enums or Literals in backend schemas, always grep for the values in the frontend to ensure API validators and UI dropdowns are kept in sync.

[2026-05-04 05:22] | main | ERROR: Z gate causes 50.7% QBER (expected <0.10 vs baseline 0%)
Cause: Test assertion in test_gates.py assumed Z gate is a no-op across all bases. Per PHYSICS_CONTRACT.md Section 10, Z gate flips |+> <-> |-> in diagonal basis ('x'), causing ~50% QBER on a mixed basis stream.
Resolution: Corrected test_z_gate_minimal_qber_change assertion to check expected ~0.50 QBER for mixed basis stream per physics specification.
Prevention: Test assertions must be derived from exact quantum state matrix transformations per PHYSICS_CONTRACT.md.

[2026-05-04 05:22] | main | ERROR: X gate shows no bit-flip effect in test_x_gate_bit_flip
Cause: Test measured avg_bob_bit on a 50/50 uniform bit stream (where E[1-B] = 1-E[B] = 0.5), resulting in 0 delta.
Resolution: Corrected test_x_gate_bit_flip assertion to measure QBER delta on '+' basis photons (100% error flip).
Prevention: Bit-flip gate tests must compare QBER or state match against Alice's bit, not the average of a symmetric 50/50 random stream.


[2026-03-12 19:40] | feature/frontend-scaffold | ERROR: docs/ folder missing on branch
Cause: Feature branches created before docs commit on develop. Branch did not have docs/ when checked out.
Resolution: Merged develop into feature/frontend-scaffold to bring docs/ across.
Prevention: Always merge develop into feature branch before starting work on it.

[2026-03-12 19:45] | all-branches | ERROR: PowerShell command incompatibility
Cause: Init prompt used Unix commands (cp, source) not available in PowerShell.
Resolution: Used PowerShell equivalents — Copy-Item, absolute venv paths.
Prevention: All future shell commands in this project must use PowerShell syntax.
Key mappings:
  cp        → Copy-Item
  mv        → Move-Item  
  rm        → Remove-Item
  source    → . (dot operator) or full path activation
  touch     → New-Item -ItemType File
  mkdir -p  → New-Item -ItemType Directory -Force
  curl      → Invoke-WebRequest or curl.exe

[2026-03-12 22:50] | feature/backend-api | ERROR: QBER inflation to 30.9%
Cause: channel.py dark count block overwrote physical 'bit' field directly, corrupting photon state before Eve and Bob processing.
Resolution: Dark count random bit stored in separate 'dark_count_bit' field. Bob reads 'dark_count_bit' when dark_count=True.
Prevention: Channel must never modify 'bit' or 'alice_bit' fields for dark count events. Channel only adds metadata fields.

[2026-09-14 18:02] | main | H1: Vacuum gain structurally zero (Y_0 = 0)
Cause:      compute_gains() counted a slot only if 'detected and not lost'. Vacuum slots are marked 'lost' (no photon emitted), so a registered dark-count click on a vacuum slot was discarded.
Resolution: A registered click now counts as bool(detected) and not pns_blocked; the dark-count model is unchanged.
Prevention: Gain accounting must key on the registered detector outcome, never on whether a photon was emitted.

[2026-09-14 18:02] | main | H3: Cloning probe QBER ~50% instead of ~25%
Cause:      apply_cloning_probe() re-randomized every affected photon over all four BB84 states, contradicting the PHYSICS_CONTRACT CNOT model.
Resolution: Implemented CNOT mechanics: rectilinear invariant, diagonal maximally mixed (diagonal bit randomized), giving ~25%.
Prevention: Disturbance models must follow PHYSICS_CONTRACT.md; verify expected QBER analytically before coding.

[2026-09-14 18:02] | main | H4: Chart QBER additive approximation vs multiplicative simulator
Cause:      generate_chart_data() used noise + 0.25*attack + dark while the simulator uses Q = pn + p/4 - (p/2)pn.
Resolution: Added metrics.theoretical_qber() as the single authoritative model; the chart now uses it with detector dark-fraction parameters.
Prevention: One QBER function must back both the chart and the simulator; no parallel formula.

[2026-09-14 18:02] | main | H5: event_stream exceeded cap (up to 504)
Cause:      select_event_stream_indices() strided to the full cap and then appended rare-category rescue indices on top.
Resolution: Reserve capacity for rescue before striding; stride_budget = max(1, cap - reserved); len is now <= cap (500).
Prevention: Any "sampling + augmentation" must reserve space for augmentation upfront.

[2026-09-14 18:02] | main | H6: Noise bit-flip left state_label/polarization_angle stale
Cause:      channel.py flipped state['bit'] on noise without updating state['state_label'] or state['polarization_angle'].
Resolution: Flip updates bit, state_label and polarization_angle together via STATE_LABELS/POLARIZATION_ANGLES (basis unchanged).
Prevention: Any mutation of (basis, bit) must recompute derived canonical fields in the same step.

[2026-09-14 18:02] | main | H7: Mixed np.random.* and default_rng() prevented seeded replay
Cause:      Modules drew from global np.random.* and independent default_rng() instances, so one seed could not reproduce a run.
Resolution: Added core/rng.py (create_rng/resolve_rng); the router creates one Generator per request and threads it through all stages; optional seed added to SimulationRequest.
Prevention: Exactly one Generator per simulation; components never seed or use global RNG state.

Template:
[DATETIME] | [branch] | ERROR: [message]
Cause:      [what caused it]
Resolution: [how it was fixed]
Prevention: [rule to prevent recurrence]
