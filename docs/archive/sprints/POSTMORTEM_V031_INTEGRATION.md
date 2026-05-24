# v0.3.1 Sprint Integration — Post-Mortem Report

**Date:** 2026-03-30  
**Affected:** Sprints 11, 12, 13 integration into main codebase  
**Severity:** Critical — app would not render (blank white screen)  
**Status:** ✅ Resolved

---

## What Happened

After integrating Sprint 11 (Gate State Vectors), Sprint 12 (Experiment Save/Load), and Sprint 13 (Guided Exercises) into the existing codebase, the React app compiled without Vite errors but rendered a **blank white screen**. The backend was healthy; only the frontend was broken.

---

## Root Causes

### Bug 1 — Inline Code Concatenation (Parse Errors)

New code was **appended to the end of existing lines** instead of being placed on new lines. This created syntactically invalid JavaScript that Vite's parser rejected.

**Files affected:** `TopBar.jsx`, `GuidePage.jsx`

| File | What happened | Example |
|------|--------------|---------|
| `TopBar.jsx` | `LoadExperimentModal` import glued onto same line as `useSimulationStore` import | `import LoadExperimentModal from '...'import useSimulationStore from '...'` |
| `TopBar.jsx` | Modal state concatenated with `useSimulation()` call | `const [loadModalOpen, setLoadModalOpen] = useState(false)  const { runSimulation } = useSimulation()` |
| `GuidePage.jsx` | `GuidedExercises` import injected mid-recharts import | `LineChart, Line, XAxis,↵import GuidedExercises from '...'  Tooltip, ResponsiveContainer` |
| `GuidePage.jsx` | `activeTab` state concatenated with store destructuring | `const [activeTab, setActiveTab] = useState('theory')  const { setActiveView } = useSimulationStore()` |
| `GuidePage.jsx` | Tab navigation block injected mid-JSX-attribute | `<div className="max-w-5xl mx-auto px-6 py-12 ↵{/* Tab Navigation */}↵<div className="sticky...` |
| `GuidePage.jsx` | Closing brackets merged | `)}  )` instead of `)}` then `)` on separate lines |

### Bug 2 — Import Style Mismatch (Silent Runtime Crash)

`GatePropertiesPanel.jsx` (Sprint 11) used a **named import**:
```js
import { useSimulationStore } from '../../store/simulationStore';
```

But `simulationStore.js` only has a **default export**:
```js
export default useSimulationStore
```

This made `useSimulationStore` resolve to `undefined` inside the component. When React tried to call `undefined()` as a function, it **crashed silently** — no console error, no Vite error, just a blank screen.

This was the **primary cause of the blank screen** because `SimulatorPage.jsx` renders `<GatePropertiesPanel />` unconditionally, so every page load crashed.

---

## What Was Fixed

| # | File | Fix |
|---|------|-----|
| 1 | `GatePropertiesPanel.jsx` | Changed `import { useSimulationStore }` → `import useSimulationStore` |
| 2 | `TopBar.jsx` | Full clean rewrite — separated all concatenated lines, added fragment wrapper `<>...</>` for modals |
| 3 | `GuidePage.jsx` | 4 targeted edits: separated imports, state declarations, tab navigation block, and closing bracket order |

---

## Why It Happened

1. **No line-break awareness during integration.** The sprint integration tool/process inserted new code at cursor positions without adding newlines, resulting in two statements on the same line.

2. **No import convention enforcement.** Sprint 11's `GatePropertiesPanel` was authored with `{ useSimulationStore }` (named import) without checking that the store uses `export default`. The other sprint components (`SaveExperimentModal`, `LoadExperimentModal`) correctly used default imports.

3. **No post-integration build check.** The integration was committed without running `npm run build` or verifying the app loaded in a browser. A simple `vite build` would have caught all parse errors immediately.

---

## Steps to Prevent Recurrence

### Immediate (do now)

- [ ] **Run `npm run build` after every integration.** A production build catches 100% of parse errors and most import mismatches. Add this to the integration checklist.

- [ ] **Verify in browser after every integration.** Open `http://localhost:5173` and check browser DevTools console for errors. A blank screen with no console output = silent crash.

### Short-term (this sprint)

- [ ] **Standardize import convention.** All project components must use `import useSimulationStore from '...'` (default import). Document this in a `CONTRIBUTING.md` or sprint template. Grep for `{ useSimulationStore }` across all files to catch any remaining mismatches:
  ```powershell
  Select-String -Path "frontend/src/**/*.jsx" -Pattern "\{ useSimulationStore \}" -Recurse
  ```

- [ ] **Add ESLint rule** for `import/no-named-as-default-member` to catch named-vs-default import mismatches at lint time.

### Long-term (next release cycle)

- [ ] **CI pipeline gate.** Add `npm run build` as a required CI step before merge. Any parse error = blocked merge.

- [ ] **Integration script.** Replace manual code insertion with a script that:
  1. Adds imports at the top of the import block (not inline)
  2. Adds state declarations on new lines after existing state
  3. Runs `vite build` as a sanity check
  4. Runs the app and checks for blank screen via headless browser

- [ ] **Component contract tests.** Each new component should have a minimal render test that imports it and verifies it doesn't crash:
  ```js
  import { render } from '@testing-library/react'
  import GatePropertiesPanel from './GatePropertiesPanel'
  test('renders without crash', () => {
    render(<GatePropertiesPanel />)
  })
  ```

---

## Verification Evidence

App confirmed running with zero console errors after all fixes:

![Frontend rendering after fix](file:///C:/Users/Dev/.gemini/antigravity/brain/a3c91a45-975a-40bd-8144-d3221d339999/frontend_status_check_1774823065329.png)

- ✅ Landing page renders
- ✅ Simulator page renders with Gate Properties panel ("No gate selected")
- ✅ Save/Load buttons visible in TopBar
- ✅ Backend healthy at `localhost:8000`
- ✅ Zero browser console errors
