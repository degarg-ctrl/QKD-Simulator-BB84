# Branching Strategy

## Branch Map
main ← release/v* ← develop ← feature/*

## Branches
main       → production only, never commit directly
develop    → integration, never commit directly
feature/*  → all new work, cut from develop, merge back via PR
fix/*      → bug fixes, cut from develop
hotfix/*   → critical fixes only, cut from main
release/v* → cut from develop when stable

## Commit Message Format
type(scope): short description
Types: feat, fix, physics, refactor, test, docs, style, chore
Scopes: backend-core, backend-api, frontend-canvas, frontend-ui, guide, deps, docs

Examples:
  feat(backend-core): implement Alice basis selection and state encoding
  physics(backend-core): fix Eve intercept-resend QBER to exactly 25%
  fix(frontend-canvas): correct polarization angle on photon re-emit
  docs(changelog): log session completion with timestamp
  chore(deps): verify all backend dependencies installed in venv

## Merge Checklist — must pass before any merge to develop
1. All physics benchmarks in PHYSICS_CONTRACT.md Section 8 pass
2. No hardcoded magic numbers
3. No console.log or print debug statements
4. Complete files only, no partial stubs
5. CHANGELOG.md updated with timestamped entry
6. ERROR_LOG.md updated if any errors were encountered
7. Virtual environment active, all imports verified
