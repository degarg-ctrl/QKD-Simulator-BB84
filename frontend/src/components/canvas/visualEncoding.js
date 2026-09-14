/**
 * src/components/canvas/visualEncoding.js
 *
 * Shared visual encoding for the BB84 canvas.
 *
 * PURE FUNCTIONS ONLY — no React, no canvas, no randomness.
 * This module defines:
 *   1. Canvas geometry (single source; QuantumCanvas re-exports for
 *      backward compatibility)
 *   2. The visual palette (basis/state/event colors)
 *   3. Event classification — maps a backend PhotonRecord to the
 *      visual outcome category. Backend fields are the ONLY input;
 *      no scientifically meaningful state is invented here.
 *   4. Deterministic layout helpers (lane assignment, fiber-loss
 *      position, launch spacing) — deterministic given the records.
 */

// ─── Canvas geometry (1200x400 internal coordinate system) ────────
export const CANVAS_WIDTH = 1200
export const CANVAS_HEIGHT = 400
export const ALICE_X = 120
export const BOB_X = 1080
export const EVE_X = 600
export const ENTITY_Y = 200
export const LANE_Y_POSITIONS = [150, 200, 250]  // 3 VISUAL lanes
export const NODE_RADIUS = 28

// The three lanes are ONE physical channel, split only for visual
// readability (see PHYSICS_CONTRACT "Visual lanes").
export const LANE_COUNT = LANE_Y_POSITIONS.length

// ─── Palette ──────────────────────────────────────────────────────
// Polished scientific palette. Basis colors are the primary state
// encoding; event colors are reserved for outcomes (loss/detection/
// attack) and never collide with basis colors.
export const PALETTE = {
    // BB84 bases (particle state encoding)
    basisPlus: '#22d3ee',    // rectilinear  (+)
    basisCross: '#c084fc',   // diagonal     (x)

    // Entities
    aliceNode: '#38bdf8',
    bobNode: '#34d399',
    eveNode: '#f87171',
    eveNodeInactive: '#475569',

    // Outcomes
    detected: '#34d399',     // real detection (basis match)
    mismatch: '#fbbf24',     // detected, basis mismatch (discarded)
    fiberLoss: '#64748b',    // absorbed in fiber
    detectorMiss: '#94a3b8', // reached Bob, efficiency draw failed
    darkCount: '#e0e7ff',    // spurious detector click
    vacuum: '#64748b',       // WCP vacuum pulse (no photon)

    // Interactions
    eve: '#ef4444',          // intercept-resend disturbance
    pns: '#fb7185',          // PNS split/block
    noise: '#f59e0b',        // channel noise flip

    // UI
    labelText: '#94a3b8',
    guide: 'rgba(148, 163, 184, 0.35)',
}

// Backward-compatible COLORS export (consumed elsewhere in the app)
export const COLORS = {
    background: '#1a1a2e',
    laneLine: '#ffffff',
    laneGlow: 'rgba(255,255,255,0.3)',
    aliceNode: PALETTE.aliceNode,
    bobNode: PALETTE.bobNode,
    eveNode: PALETTE.eveNode,
    eveNodeInactive: PALETTE.eveNodeInactive,
    nodeText: '#ffffff',
    nodeBorder: 'rgba(255,255,255,0.4)',
    photonBlue: PALETTE.basisPlus,
    photonPurple: PALETTE.basisCross,
    photonLost: PALETTE.fiberLoss,
    labelText: PALETTE.labelText,
}

// ─── Event classification ─────────────────────────────────────────
//
// Maps a backend PhotonRecord to ONE primary visual outcome.
// Priority mirrors physical causality:
//   dark_count   — no real photon involved at all
//   vacuum       — WCP pulse with n=0 (nothing entered the fiber)
//   pns_blocked  — Eve blocked the single photon (died at Eve)
//   fiber_loss   — photon absorbed in the fiber
//   detector_loss— reached Bob, detector efficiency draw failed
//   detected     — real photon registered at Bob
//
// Interaction flags (intercepted / pns_split / noise_flipped /
// wcp_multi) are layered ON TOP of the outcome, not alternatives.
export const EVENT_OUTCOMES = [
    'dark_count',
    'vacuum',
    'pns_blocked',
    'fiber_loss',
    'detector_loss',
    'detected',
]

/**
 * Classify a backend PhotonRecord into its primary visual outcome.
 * Pure function of the record — deterministic, no invention.
 *
 * Legacy records (pre-v0.5.0 bit_stream, no event fields) contained
 * only MEASURED photons; they fall through to 'detected' so old data
 * still renders correctly.
 */
export function classifyOutcome(record) {
    if (record.dark_count) return 'dark_count'
    if (record.wcp_vacuum) return 'vacuum'
    if (record.pns_blocked) return 'pns_blocked'
    if (record.fiber_survived === false) return 'fiber_loss'
    if (record.detector_detected) return 'detected'
    // Legacy record (no event fields): measured photons only
    if (record.fiber_survived == null && record.detector_detected == null
        && !record.wcp_vacuum && !record.pns_blocked && !record.dark_count) {
        return 'detected'
    }
    return 'detector_loss'
}

/**
 * Human-readable label for an outcome (HUD/inspector use).
 */
export const OUTCOME_LABELS = {
    dark_count: 'Dark count',
    vacuum: 'Vacuum pulse',
    pns_blocked: 'PNS blocked',
    fiber_loss: 'Fiber loss',
    detector_loss: 'Detector miss',
    detected: 'Detected',
}

/**
 * Basis color for a record: Alice's encoding basis decides the
 * particle hue for the whole flight (the state Alice sent).
 */
export function basisColor(record) {
    return record.alice_basis === 'x'
        ? PALETTE.basisCross
        : PALETTE.basisPlus
}

/**
 * BB84 state label from (basis, bit) — same mapping as the backend
 * STATE_LABELS constant.
 */
export function stateLabel(basis, bit) {
    if (basis === '+') return bit === 0 ? '|0⟩' : '|1⟩'
    return bit === 0 ? '|+⟩' : '|−⟩'
}

// ─── Deterministic layout helpers ─────────────────────────────────

/**
 * Visual lane for a pulse: index % 3.
 *
 * DETERMINISTIC and consistent with the backend gate-lane mapping
 * (core/gates.py applies gates to photons with index % 3 == lane),
 * so gate visuals and particle lanes always agree.
 * The lanes are purely visual — one physical channel.
 */
export function laneForIndex(index) {
    return ((index % LANE_COUNT) + LANE_COUNT) % LANE_COUNT
}

// Golden ratio — produces a well-distributed, deterministic sequence
// in [0, 1) when multiplied by an integer index (three-distance
// theorem). Used for visual positions only, never for physics.
const PHI = 0.6180339887498949

/**
 * Deterministic fiber-loss position for a photon (fraction of the
 * Alice→Bob channel, within [0.15, 0.85]).
 *
 * The backend does not record a physical loss position (survival is
 * a Bernoulli draw per photon), so the visualization derives a
 * STABLE pseudo-position from the pulse index. Same index → same
 * position, every playback. Visual only — the survival probability
 * itself is untouched (backend authority).
 */
export function fiberLossFraction(index) {
    const f = (Math.abs(index) * PHI) % 1
    return 0.15 + f * 0.7
}

/**
 * Deterministic small phase [0, 2π) for cosmetic animations
 * (cluster orbit rotation, effect offsets) keyed by pulse index.
 */
export function phaseForIndex(index) {
    return (Math.abs(index) * PHI * 2 * Math.PI) % (2 * Math.PI)
}

// ─── Launch spacing (overlap prevention) ──────────────────────────

// Base particle velocity in canvas px per frame (before speed mult.)
export const BASE_VELOCITY_PX = 3.2

// Minimum center-to-center horizontal spacing between particles on
// the same lane. Particle body radius ≈ 7 px + glow; 26 px guarantees
// no visible overlap.
export const MIN_SPACING_PX = 26

/**
 * Minimum frames between two launches on the SAME lane so that the
 * second particle can never catch the first (same velocity) —
 * guarantees MIN_SPACING_PX separation for same-speed travel.
 */
export function minLaneGapFrames(speed = 1) {
    const velocity = BASE_VELOCITY_PX * Math.max(0.05, speed)
    return Math.max(1, Math.ceil(MIN_SPACING_PX / velocity))
}

/**
 * Global release interval (frames between consecutive launches,
 * across all lanes). With 3 lanes served round-robin (index % 3),
 * this keeps the stream dense but staggered. Never below the
 * per-lane constraint implied by minLaneGapFrames / LANE_COUNT.
 */
export function releaseIntervalFrames(speed = 1) {
    const perLane = minLaneGapFrames(speed)
    return Math.max(2, Math.ceil(perLane / LANE_COUNT))
}
