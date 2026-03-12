# Error Log
Format: [YYYY-MM-DD HH:MM] | Branch | Error | Cause | Resolution | Prevention

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

Template:
[DATETIME] | [branch] | ERROR: [message]
Cause:      [what caused it]
Resolution: [how it was fixed]
Prevention: [rule to prevent recurrence]
