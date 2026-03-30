# Changelog

All notable changes to the QKD Simulator project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] - 2026-03-30

### Added

#### UI/UX Enhancements
- **Professional Tooltips System**
  - Created `SmartTooltipWrapper` component with intelligent viewport-aware positioning
  - Tooltips auto-adjust to stay within screen bounds (16px padding from edges)
  - Horizontal centering when content is too wide
  - Hover persistence - tooltips stay visible when mouse moves onto them
  - Scrollable content for long tooltips
  - Responsive repositioning on window resize

- **Enhanced Gate Tooltips**
  - Created `GateTooltip` component with 3D Bloch sphere visualizations
  - Clean sectioned layout: Description, Effect, State Transformations
  - Static 3D visualization in tooltips (non-animated)
  - Professional glassmorphism styling
  - All 6 gates documented (H, X, Y, Z, S, T)

- **Enhanced Probe Tooltips**
  - Created `EntityTooltip` component for Alice, Bob, and Eve
  - Detailed entity information with clean layout

- **Enhanced Experiment Tooltips**
  - Created `ExperimentTooltip` component with comprehensive experiment guides
  - Sections: Description, Objective, Steps, Expected Results
  - All 6 experiments documented (Exp 1, 3, 5, 6, 7, 8)
  - "Realistic Mode Only" badges for PNS and Decoy State experiments

#### 3D Visualizations
- **Bloch Sphere Component**
  - Created `BlochSphere.jsx` with Three.js integration
  - Interactive 3D Bloch sphere with X/Y/Z axes (color-coded)
  - State vectors showing before/after gate transformations
  - Gate-specific transformations for all 6 gates
  - Auto-rotation and orbit controls
  - Lazy-loaded for performance optimization
  - Animated version for Guide page, static for tooltips

#### Guide Page Enhancements
- **New Guide Sections**
  - `GatesSection.jsx` - Complete guide to all quantum gates with animated 3D Bloch spheres
  - `PNSAttackSection.jsx` - Comprehensive explanation of Photon Number Splitting attacks
  - `ExperimentsSection.jsx` - Step-by-step instructions for all experiments
  - Tab-based navigation: Theory, Gates, PNS Attack, Experiments, Exercises

#### Navigation System Redesign
- **Universal Top Bar**
  - Created `UniversalTopBar.jsx` for consistent navigation across all pages
  - Hamburger menu (☰) with dropdown: Home, Simulator, About
  - Clickable "QKD Simulator" branding returns to home
  - BB84 protocol badge
  - Theme toggle (light/dark mode)
  - SRMIST logo in top-right corner
  - Clean, professional design without AI-looking elements

- **Simulator Controls Bar**
  - Created `SimulatorControls.jsx` for simulator-specific controls
  - Status indicator (READY/SIMULATING/SECURE/BREACH DETECTED)
  - View tabs (SIM/RESULTS)
  - Control buttons: RUN, RESET, SAVE, LOAD, CLEAR GATES, INSPECT
  - Only visible on Simulator and Results pages

#### Dependencies
- Added `three` - 3D graphics library
- Added `@react-three/fiber` - React renderer for Three.js
- Added `@react-three/drei` - Useful helpers for React Three Fiber

### Changed

#### Component Architecture
- Updated `SimulatorPage.jsx` to use new two-bar navigation system
- Updated `Sidebar.jsx` to integrate all new tooltip components
- Refactored tooltip system from simple `TooltipPortal` to intelligent `SmartTooltipWrapper`

#### Gate System
- Gates now use `SmartTooltipWrapper` with `GateTooltip` for enhanced information display
- Gate tooltips show 3D Bloch sphere visualizations
- Improved gate hover experience with professional styling

#### Experiment System
- Experiments now use `SmartTooltipWrapper` with `ExperimentTooltip`
- Replaced simple text tooltips with comprehensive experiment guides
- Better visual feedback for experiment selection

### Fixed

#### Tooltip Positioning
- Fixed tooltips going off-screen near viewport edges
- Fixed tooltips not staying visible when hovering over them
- Fixed tooltips not adjusting for actual content dimensions
- Fixed horizontal overflow on narrow screens
- Fixed vertical overflow on short screens

#### Navigation
- Fixed inconsistent navigation between pages
- Fixed missing return-to-home functionality
- Fixed theme toggle not persisting across page changes

### Technical Improvements

#### Performance
- Lazy-loaded 3D Bloch sphere component to reduce initial bundle size
- Optimized tooltip rendering with React portals
- Efficient viewport boundary detection

#### Code Quality
- Consistent component structure across all tooltips
- Reusable `SmartTooltipWrapper` for all tooltip types
- Clean separation of concerns (navigation vs. controls)
- Professional styling with CSS variables for theming

---

## File Structure Changes

### New Components
```
frontend/src/components/
├── layout/
│   ├── UniversalTopBar.jsx          (NEW)
│   └── SimulatorControls.jsx        (NEW)
├── ui/
│   ├── SmartTooltipWrapper.jsx      (NEW)
│   ├── GateTooltip.jsx              (ENHANCED)
│   └── ParameterTooltip.jsx         (ENHANCED)
├── visualizations/
│   └── BlochSphere.jsx              (NEW)
├── entities/
│   └── EntityTooltip.jsx            (NEW)
├── experiments/
│   └── ExperimentTooltip.jsx        (NEW)
└── guide/
    ├── GatesSection.jsx             (NEW)
    ├── PNSAttackSection.jsx         (NEW)
    └── ExperimentsSection.jsx       (NEW)
```

### Modified Components
- `SimulatorPage.jsx` - Two-bar navigation system
- `Sidebar.jsx` - Integrated all new tooltips
- `GuidePage.jsx` - Added new guide sections with tabs

### Assets
- `public/srmist-logo.png` - SRMIST institutional logo

---

## Migration Notes

### For Developers
- Old `TopBar.jsx` is deprecated (replaced by `UniversalTopBar` + `SimulatorControls`)
- All tooltips should now use `SmartTooltipWrapper` for consistent behavior
- 3D visualizations require Three.js dependencies (already installed)

### For Users
- Navigation is now more intuitive with hamburger menu
- Tooltips provide much more detailed information
- 3D visualizations help understand quantum gate operations
- Guide page is more comprehensive with new sections

---

## Known Issues
- None at this time

---

## Future Enhancements
- Add more interactive 3D visualizations
- Expand guide content with more examples
- Add animation controls for Bloch sphere
- Consider adding more quantum gates
- Enhance mobile responsiveness

---

**Contributors:** Development Team  
**Last Updated:** 2026-03-30
