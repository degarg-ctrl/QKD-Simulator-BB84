# Error Log
Format: [YYYY-MM-DD HH:MM] | Branch | Error | Cause | Resolution | Prevention

[2026-05-04 04:19] | main | ERROR: Simulator fails to run for PNS, Partial, and Burst attacks
Cause: frontend API validator in simulatorAPI.js had hardcoded list of allowed strategies that did not match backend schema or ConfigPanel output.
Resolution: Synced validStrategies array in simulatorAPI.js with backend Literal and fixed ConfigPanel value outputs.
Prevention: When updating Enums or Literals in backend schemas, always grep for the values in the frontend to ensure API validators and UI dropdowns are kept in sync.

[2026-05-04 05:22] | main | ERROR: Z gate causes 50.7% QBER (expected <0.10 vs baseline 0%)
Cause: backend/core/gates.py apply_gate() for 'Z' is randomising measurement bases rather than applying a phase flip only. Z gate in computational basis must not alter QBER when Alice and Bob use matching bases.
Resolution: PENDING — requires investigation of gates.py Z gate matrix application.
Prevention: Basis-preserving gates (Z, S, T) must be verified with a unit test that QBER delta vs no-gate baseline is < 0.10.

[2026-05-04 05:22] | main | ERROR: X gate shows no bit-flip effect (bob_bit delta ~0.01, expected >0.10)
Cause: backend/core/gates.py apply_gate() for 'X' is not producing a measurable bit flip. Gate may be applied after Bob measures (making it a no-op) or the bit flip field is not propagating correctly.
Resolution: PENDING — requires investigation of pipeline order and gate application in core/gates.py.
Prevention: Bit-flipping gates must be unit tested to confirm they alter the measured state before Bob's measurement step.


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

Template:
[DATETIME] | [branch] | ERROR: [message]
Cause:      [what caused it]
Resolution: [how it was fixed]
Prevention: [rule to prevent recurrence]
