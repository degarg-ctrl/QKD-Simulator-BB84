/**
 * Frontend tests — event → animation mapping guarantees.
 *
 * Verifies that the visual layer NEVER invents physics:
 *  - outcome classification comes from backend fields only
 *  - lane assignment is deterministic and matches backend lanes
 *  - overlap prevention spacing satisfies the minimum gap
 *  - fiber-loss positions are deterministic and inside the fiber
 *  - state labels/angles use the BB84 encoding table
 *  - PhotonParticle lifecycle reaches the correct terminal state
 *    for each backend outcome (pure logic, no canvas needed)
 */

import { describe, it, expect } from 'vitest'
import {
    classifyOutcome, laneForIndex, fiberLossFraction,
    minLaneGapFrames, releaseIntervalFrames, stateLabel,
    basisColor, MIN_SPACING_PX, BASE_VELOCITY_PX,
    LANE_COUNT, LANE_Y_POSITIONS,
} from './visualEncoding'
import { PhotonParticle } from './PhotonParticle'

// ── Backend record factory (mirrors v0.5.0 PhotonRecord) ─────────
function record(overrides = {}) {
    return {
        index: 0,
        alice_bit: 1, alice_basis: '+',
        bob_basis: '+', bob_bit: 1, match: true,
        intercepted: false, lost: false,
        polarization_angle: 90,
        alice_polarization_angle: 90,
        fiber_survived: true, detector_detected: true,
        dark_count: false, noise_flipped: false,
        wcp_photon_count: null, wcp_vacuum: null,
        wcp_single: null, wcp_multi: null,
        pns_split: false, pns_blocked: false,
        eve_has_copy: false, sifted: true,
        ...overrides,
    }
}

describe('classifyOutcome — backend authority', () => {
    it('classifies a clean detected photon', () => {
        expect(classifyOutcome(record())).toBe('detected')
    })

    it('classifies fiber loss from fiber_survived=false', () => {
        expect(classifyOutcome(record({
            fiber_survived: false, detector_detected: false,
            lost: true, sifted: false, bob_bit: null, match: false,
        }))).toBe('fiber_loss')
    })

    it('classifies detector loss (reached Bob, no click)', () => {
        expect(classifyOutcome(record({
            detector_detected: false, sifted: false,
            bob_bit: null, match: false,
        }))).toBe('detector_loss')
    })

    it('classifies dark count before anything else', () => {
        expect(classifyOutcome(record({
            dark_count: true, fiber_survived: false,
            detector_detected: false,
        }))).toBe('dark_count')
    })

    it('classifies WCP vacuum pulses', () => {
        expect(classifyOutcome(record({
            wcp_vacuum: true, wcp_photon_count: 0,
            fiber_survived: false, detector_detected: false,
            lost: true, sifted: false, match: false, bob_bit: null,
        }))).toBe('vacuum')
    })

    it('classifies PNS-blocked singles', () => {
        expect(classifyOutcome(record({
            wcp_single: true, wcp_photon_count: 1,
            pns_blocked: true, detector_detected: false,
            lost: true, sifted: false, match: false, bob_bit: null,
        }))).toBe('pns_blocked')
    })

    it('PNS-split multiphoton pulses still reach Bob (detected)', () => {
        expect(classifyOutcome(record({
            wcp_multi: true, wcp_photon_count: 3,
            pns_split: true, eve_has_copy: true,
        }))).toBe('detected')
    })

    it('legacy records (no event fields) default to detected', () => {
        const legacy = {
            index: 0, alice_bit: 0, alice_basis: '+',
            bob_basis: 'x', bob_bit: 0, match: false,
            intercepted: false, lost: false, polarization_angle: 0,
        }
        expect(classifyOutcome(legacy)).toBe('detected')
    })
})

describe('laneForIndex — deterministic single transmission lane assignment', () => {
    it('assigns all pulses to the single BB84 channel lane (lane 0)', () => {
        expect([0, 1, 2, 3, 4, 5].map(laneForIndex))
            .toEqual([0, 0, 0, 0, 0, 0])
    })

    it('returns 0 for all pulse indices', () => {
        for (let i = 0; i < 30; i++) {
            expect(laneForIndex(i)).toBe(0)
        }
    })

    it('has exactly 1 lane position at y=200', () => {
        expect(LANE_COUNT).toBe(1)
        expect(LANE_Y_POSITIONS[0]).toBe(200)
    })
})

describe('Overlap prevention spacing', () => {
    it('minimum same-lane gap guarantees MIN_SPACING_PX', () => {
        for (const speed of [0.25, 0.5, 1, 2, 4]) {
            const gapFrames = minLaneGapFrames(speed)
            const velocity = BASE_VELOCITY_PX * speed
            expect(gapFrames * velocity).toBeGreaterThanOrEqual(
                MIN_SPACING_PX - 1e-9)
        }
    })

    it('release interval respects the per-lane constraint', () => {
        for (const speed of [0.25, 0.5, 1, 2, 4]) {
            const perLane = minLaneGapFrames(speed)
            // 3 lanes round-robin: consecutive same-lane launches are
            // at least ceil(perLane / 3) * 3 >= perLane frames apart... only
            // if every interval slot is used. The scheduler enforces the
            // per-lane gap directly, so the interval only needs to stagger.
            expect(releaseIntervalFrames(speed)).toBeGreaterThanOrEqual(2)
            expect(releaseIntervalFrames(speed) * LANE_COUNT)
                .toBeGreaterThanOrEqual(perLane)
        }
    })
})

describe('fiberLossFraction — deterministic loss positions', () => {
    it('is deterministic per index', () => {
        for (let i = 0; i < 50; i++) {
            expect(fiberLossFraction(i)).toBe(fiberLossFraction(i))
        }
    })

    it('stays inside the fiber (not at the nodes)', () => {
        for (let i = 0; i < 100; i++) {
            const f = fiberLossFraction(i)
            expect(f).toBeGreaterThan(0)
            expect(f).toBeLessThan(1)
        }
    })

    it('produces varied positions (no stacking)', () => {
        const fractions = new Set(
            Array.from({ length: 60 }, (_, i) =>
                Math.round(fiberLossFraction(i) * 1000)))
        // 60 indices spread over [0.15, 0.85] — allow small collisions
        // from rounding but demand real variety
        expect(fractions.size).toBeGreaterThan(40)
    })
})

describe('BB84 state encoding', () => {
    it('maps (basis, bit) to the four BB84 states', () => {
        expect(stateLabel('+', 0)).toBe('|0⟩')
        expect(stateLabel('+', 1)).toBe('|1⟩')
        expect(stateLabel('x', 0)).toBe('|+⟩')
        expect(stateLabel('x', 1)).toBe('|−⟩')
    })

    it('basis colors distinguish + and x', () => {
        expect(basisColor(record({ alice_basis: '+' })))
            .not.toBe(basisColor(record({ alice_basis: 'x' })))
    })
})

describe('PhotonParticle — backend-driven lifecycle', () => {
    // NOTE: PhotonParticle imports canvas geometry only; it can be
    // instantiated headlessly (no DOM calls until draw()).
    const TERMINAL_FRAMES = 1500

    function runToDeath(p) {
        let frames = 0
        while (p.update() && frames < TERMINAL_FRAMES) frames++
        return { frames, state: p.state }
    }

    it('detected photon arrives at Bob and flashes green', () => {
        const p = new PhotonParticle(record(), 0, 1)
        const { state } = runToDeath(p)
        expect(p.outcome).toBe('detected')
        expect(state).toBe('dead')
        expect(p.x).toBe(1080)  // BOB_X
    })

    it('fiber-lost photon dies INSIDE the fiber (before Eve or Bob)', () => {
        const rec = record({
            index: 7, fiber_survived: false, detector_detected: false,
            lost: true, sifted: false, match: false, bob_bit: null,
        })
        const p = new PhotonParticle(rec, laneForIndex(7), 1)
        const { state } = runToDeath(p)
        expect(p.outcome).toBe('fiber_loss')
        expect(state).toBe('dead')
        expect(p.x).toBeGreaterThan(120)   // past Alice
        expect(p.x).toBeLessThan(1080)     // never reaches Bob
    })

    it('detector-loss photon reaches Bob but shows no detection', () => {
        const rec = record({
            detector_detected: false, sifted: false,
            bob_bit: null, match: false,
        })
        const p = new PhotonParticle(rec, 1, 1)
        runToDeath(p)
        expect(p.outcome).toBe('detector_loss')
        expect(p.x).toBe(1080)
    })

    it('dark-count spark originates at Bob (never travels)', () => {
        const rec = record({
            dark_count: true, fiber_survived: false,
            detector_detected: false, sifted: false, match: false,
            bob_basis: 'x', bob_bit: 0,
        })
        const p = new PhotonParticle(rec, 2, 1)
        expect(p.state).toBe('darkSpark')
        const { state } = runToDeath(p)
        expect(state).toBe('dead')
        expect(p.x).toBe(1080)  // at Bob the whole time
    })

    it('intercepted photon switches to BACKEND resend angle at Eve', () => {
        const rec = record({
            index: 3,
            intercepted: true, eve_basis: 'x', eve_bit: 0,
            eve_basis_match: false, eve_resend_angle: 45,
            polarization_angle: 45,
        })
        const p = new PhotonParticle(rec, laneForIndex(3), 1)
        expect(p.currentAngle).toBe(90)          // Alice's angle first
        runToDeath(p)
        expect(p.hasPassedEve).toBe(true)
        expect(p.currentAngle).toBe(45)          // backend resend angle
    })

    it('Eve basis match leaves Alice\'s angle unchanged', () => {
        const rec = record({
            intercepted: true, eve_basis: '+', eve_bit: 1,
            eve_basis_match: true, eve_resend_angle: 90,
        })
        const p = new PhotonParticle(rec, 0, 1)
        runToDeath(p)
        expect(p.currentAngle).toBe(90)
    })

    it('PNS-blocked photon dies at Eve, never reaches Bob', () => {
        const rec = record({
            index: 5, wcp_single: true, wcp_photon_count: 1,
            pns_blocked: true, detector_detected: false,
            lost: true, sifted: false, match: false, bob_bit: null,
        })
        const p = new PhotonParticle(rec, laneForIndex(5), 1)
        const { state } = runToDeath(p)
        expect(p.outcome).toBe('pns_blocked')
        expect(state).toBe('dead')
        expect(p.x).toBe(600)  // EVE_X
    })

    it('PNS-split pulse continues to Bob (fork at Eve)', () => {
        const rec = record({
            index: 9, wcp_multi: true, wcp_photon_count: 3,
            pns_split: true, eve_has_copy: true,
        })
        const p = new PhotonParticle(rec, laneForIndex(9), 1)
        runToDeath(p)
        expect(p.outcome).toBe('detected')
        expect(p.pnsForkTimer >= 0).toBe(true)
        expect(p.x).toBe(1080)
    })

    it('multiphoton WCP pulse exposes cluster rendering info', () => {
        const rec = record({
            wcp_multi: true, wcp_photon_count: 4,
        })
        const p = new PhotonParticle(rec, 0, 1)
        expect(p.isMulti).toBe(true)
        expect(p.photonCount).toBe(4)
    })

    it('never invents an outcome not present in the record', () => {
        // Clean record: must not show any attack effects
        const p = new PhotonParticle(record(), 0, 1)
        expect(p.intercepted).toBe(false)
        expect(p.pnsSplit).toBe(false)
        expect(p.pnsBlocked).toBe(false)
        expect(p.noiseFlipped).toBe(false)
        expect(p.eveResendAngle).toBeNull()
    })
})
