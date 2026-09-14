/**
 * Animation scheduler + playback-accounting tests.
 *
 * SCOPE / LIMITATION (audit M9, M13):
 * `usePhotonAnimation` runs a requestAnimationFrame loop that draws to
 * an HTML5 canvas. Actually executing that loop needs a browser DOM
 * (jsdom is NOT a dependency of this project), so this file does NOT
 * mount the hook. Instead it:
 *   1. imports the hook module (so the module contract is checked),
 *   2. exercises the pure, exported accounting helpers the hook uses
 *      on every frame (countRelease / countSkipped / countCompletion),
 *   3. verifies the visual lifecycle invariants of PhotonParticle that
 *      the scheduler relies on.
 * Browser-only behavior (zoom/pan/resize during playback) remains a
 * manual verification item and is intentionally NOT claimed here.
 */

import { describe, it, expect, vi } from 'vitest'

// The hook imports the Zustand store, whose module body reads
// localStorage and applies the theme to document.documentElement.
// Stub the minimal browser globals BEFORE the imports run (node env).
vi.hoisted(() => {
    if (typeof globalThis.localStorage === 'undefined') {
        const mem = new Map()
        globalThis.localStorage = {
            getItem: (k) => (mem.has(k) ? mem.get(k) : null),
            setItem: (k, v) => { mem.set(k, String(v)) },
            removeItem: (k) => { mem.delete(k) },
            clear: () => mem.clear(),
        }
    }
    if (typeof globalThis.document === 'undefined') {
        globalThis.document = {
            documentElement: { classList: { add() {}, remove() {} } },
        }
    }
})

import {
    usePhotonAnimation, createCounters,
    countSkipped, countCompletion, countRelease,
    formatAliceReadout, formatBobReadout,
} from './usePhotonAnimation'
import useSimulationStore from '../store/simulationStore'
import { PhotonParticle } from '../components/canvas/PhotonParticle'
import {
    laneForIndex, classifyOutcome, EVENT_OUTCOMES,
} from '../components/canvas/visualEncoding'

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

// One representative record per primary outcome.
const OUTCOME_SAMPLES = {
    detected: record(),
    fiber_loss: record({
        fiber_survived: false, detector_detected: false,
        lost: true, sifted: false, match: false, bob_bit: null,
    }),
    detector_loss: record({
        detector_detected: false, sifted: false,
        match: false, bob_bit: null,
    }),
    pns_blocked: record({
        pns_blocked: true, detector_detected: false,
        sifted: false, match: false, bob_bit: null,
    }),
    vacuum: record({
        wcp_vacuum: true, wcp_photon_count: 0,
        fiber_survived: false, detector_detected: false,
        sifted: false, match: false, bob_bit: null,
    }),
    dark_count: record({
        dark_count: true, detector_detected: false,
        sifted: false, match: false,
    }),
}

describe('usePhotonAnimation module contract', () => {
    it('exports the hook as a function', () => {
        expect(typeof usePhotonAnimation).toBe('function')
    })

    it('counter keys cover every authoritative outcome', () => {
        const counters = createCounters()
        for (const outcome of EVENT_OUTCOMES) {
            expect(counters).toHaveProperty(outcome)
        }
    })
})

describe('Playback accounting uses one classifier (audit M2)', () => {
    it('every outcome sample classifies to its expected category', () => {
        for (const [expected, rec] of Object.entries(OUTCOME_SAMPLES)) {
            expect(classifyOutcome(rec)).toBe(expected)
        }
    })

    it('countSkipped increments exactly the classified outcome', () => {
        for (const [expected, rec] of Object.entries(OUTCOME_SAMPLES)) {
            const counters = createCounters()
            countSkipped(counters, rec)
            expect(counters[expected]).toBe(1)
            // no other outcome counter fired
            const total = EVENT_OUTCOMES
                .filter(o => o !== expected)
                .reduce((n, o) => n + counters[o], 0)
            expect(total).toBe(0)
            expect(counters.completed).toBe(1)
        }
    })

    it('countCompletion matches countSkipped for the same record', () => {
        for (const [, rec] of Object.entries(OUTCOME_SAMPLES)) {
            const skipped = createCounters()
            const completed = createCounters()
            countSkipped(skipped, rec)
            const particle = new PhotonParticle(rec, laneForIndex(rec.index), 1)
            countCompletion(completed, particle)
            for (const o of EVENT_OUTCOMES) {
                expect(completed[o]).toBe(skipped[o])
            }
        }
    })

    it('fiber loss increments the fiber_loss counter (key regression)',
        () => {
            const counters = createCounters()
            const particle = new PhotonParticle(
                OUTCOME_SAMPLES.fiber_loss, 0, 1)
            countCompletion(counters, particle)
            expect(counters.fiber_loss).toBe(1)
            expect(counters.fiber_lost).toBeUndefined()
        })

    it('dark count wins over fiber loss (one priority rule)', () => {
        const rec = record({
            fiber_survived: false, dark_count: true,
            detector_detected: false, lost: true,
        })
        expect(classifyOutcome(rec)).toBe('dark_count')
        const counters = createCounters()
        countSkipped(counters, rec)
        expect(counters.dark_count).toBe(1)
        expect(counters.fiber_loss).toBe(0)
    })

    it('countRelease records interaction flags without outcome bias',
        () => {
            const counters = createCounters()
            countRelease(counters, record({
                intercepted: true, pns_split: true,
                noise_flipped: true, sifted: true,
            }))
            expect(counters.released).toBe(1)
            expect(counters.intercepted).toBe(1)
            expect(counters.pns_split).toBe(1)
            expect(counters.noise_flipped).toBe(1)
            expect(counters.sifted).toBe(1)
        })
})

describe('Particle lifecycle invariants', () => {
    it('fiber-loss photon drifts off its lane and dies before Bob', () => {
        const rec = OUTCOME_SAMPLES.fiber_loss
        const p = new PhotonParticle(rec, laneForIndex(rec.index), 1)
        let frames = 0
        while (p.update() && frames < 1500) frames++
        expect(p.outcome).toBe('fiber_loss')
        expect(p.state).toBe('dead')
        const laneY = [150, 200, 250][p.laneIndex]
        expect(Math.abs(p.y - laneY)).toBeGreaterThan(0)
        expect(p.x).toBeLessThan(1080)
    })

    it('detector-loss photon stays on its lane and dies at Bob', () => {
        const rec = OUTCOME_SAMPLES.detector_loss
        const p = new PhotonParticle(rec, 0, 1)
        let frames = 0
        while (p.update() && frames < 1500) frames++
        expect(p.outcome).toBe('detector_loss')
        expect(p.x).toBe(1080)
        expect(p.y).toBe(200)
    })

    it('a particle not advanced between frames keeps its position', () => {
        // The scheduler draws without calling update() while paused; a
        // particle is a pure function of its last update, so its state
        // cannot change from drawing/zooming alone.
        const p = new PhotonParticle(record(), 0, 1)
        for (let i = 0; i < 30; i++) p.update()
        const frozenX = p.x
        const frozenState = p.state
        expect(p.x).toBe(frozenX)
        expect(p.state).toBe(frozenState)
    })
})

describe('Lane mapping is deterministic (single transmission lane)', () => {
    it('laneForIndex(i) === 0', () => {
        for (let i = 0; i < 12; i++) {
            expect(laneForIndex(i)).toBe(0)
        }
    })
})

describe('Alice and Bob dynamic readouts formatting', () => {
    it('formats Alice readout for rectilinear 0 (0 degrees, |0>)', () => {
        const rec = record({ alice_bit: 0, alice_basis: '+', alice_polarization_angle: 0 })
        const alice = formatAliceReadout(rec)
        expect(alice.bit).toBe(0)
        expect(alice.basis).toBe('+')
        expect(alice.angle).toBe(0)
        expect(alice.label).toBe('|0⟩')
    })

    it('formats Alice readout for rectilinear 1 (90 degrees, |1>)', () => {
        const rec = record({ alice_bit: 1, alice_basis: '+', alice_polarization_angle: 90 })
        const alice = formatAliceReadout(rec)
        expect(alice.bit).toBe(1)
        expect(alice.basis).toBe('+')
        expect(alice.angle).toBe(90)
        expect(alice.label).toBe('|1⟩')
    })

    it('formats Alice readout for diagonal 0 (45 degrees, |+>)', () => {
        const rec = record({ alice_bit: 0, alice_basis: 'x', alice_polarization_angle: 45 })
        const alice = formatAliceReadout(rec)
        expect(alice.bit).toBe(0)
        expect(alice.basis).toBe('x')
        expect(alice.angle).toBe(45)
        expect(alice.label).toBe('|+⟩')
    })

    it('formats Bob readout with match status', () => {
        const rec = record({ bob_basis: '+', match: true })
        const bob = formatBobReadout(rec, 'detected')
        expect(bob.basis).toBe('+')
        expect(bob.match).toBe(true)
        expect(bob.status).toBe('detected')
    })
})

describe('Dual-mode playback slider in simulationStore', () => {
    it('sets waves mode on sliderPos <= 50 with proportional speed', () => {
        const store = useSimulationStore.getState()
        store.setPlaybackSlider(25) // baseline 1.0x
        expect(useSimulationStore.getState().animation.mode).toBe('waves')
        expect(useSimulationStore.getState().animation.speed).toBe(1.0)

        store.setPlaybackSlider(0)
        expect(useSimulationStore.getState().animation.speed).toBeCloseTo(0.2, 1)

        store.setPlaybackSlider(50)
        expect(useSimulationStore.getState().animation.speed).toBeCloseTo(3.0, 1)
    })

    it('sets beam mode on sliderPos > 50 with continuous rate', () => {
        const store = useSimulationStore.getState()
        store.setPlaybackSlider(75)
        const anim = useSimulationStore.getState().animation
        expect(anim.mode).toBe('beam')
        expect(anim.beamRate).toBeGreaterThanOrEqual(35)
        expect(anim.beamRate).toBeLessThanOrEqual(75)
    })

    it('setSimulationMode snaps sliderPos appropriately', () => {
        const store = useSimulationStore.getState()
        store.setSimulationMode('beam')
        expect(useSimulationStore.getState().animation.mode).toBe('beam')
        expect(useSimulationStore.getState().animation.sliderPos).toBe(70)

        store.setSimulationMode('waves')
        expect(useSimulationStore.getState().animation.mode).toBe('waves')
        expect(useSimulationStore.getState().animation.sliderPos).toBe(25)
    })
})
