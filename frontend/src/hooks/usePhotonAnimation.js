/**
 * src/hooks/usePhotonAnimation.js
 *
 * Animation scheduler for photon particles on QuantumCanvas.
 *
 * BACKEND → SCHEDULER → PLAYBACK.
 * The simulation is already complete when this runs: the hook reads
 * the backend event_stream (representative sample of ALL outcomes)
 * and plays it back deterministically.
 *
 * LIFECYCLE DECOUPLING (zoom/pan/resize must not reset playback):
 *   - Playback state (particles, release index, frame counters,
 *     pause flag) lives in REFS keyed to `results`. It is only
 *     reset when a NEW result arrives.
 *   - drawStaticScene is stored in a ref. Zoom/resize change the
 *     callback identity, but the ref just points at the new one —
 *     the rAF loop and playback state are untouched.
 *   - All store reads (pause, speed, syncMode) happen INSIDE the
 *     loop via getState(), so no dependency-driven restarts occur.
 *   - While paused, particles are still drawn (frozen) so zooming
 *     during pause shows the paused frame rather than a blank canvas.
 */

import { useEffect, useRef } from 'react'
import { PhotonParticle } from '../components/canvas/PhotonParticle'
import useSimulationStore from '../store/simulationStore'
import {
  LANE_Y_POSITIONS, CANVAS_WIDTH, CANVAS_HEIGHT,
  laneForIndex, releaseIntervalFrames, minLaneGapFrames,
  classifyOutcome,
} from '../components/canvas/visualEncoding'

// Maximum simultaneous particles on canvas.
const MAX_ACTIVE_PARTICLES = 120

/**
 * Fresh playback counters. Outcome keys mirror
 * visualEncoding.EVENT_OUTCOMES exactly (plus interaction/flow
 * counters) so skipped and completed events use one classifier.
 * Exported for unit testing of the accounting helpers.
 */
export function createCounters() {
  return {
    released: 0, completed: 0,
    fiber_loss: 0, vacuum: 0, pns_blocked: 0, detector_loss: 0,
    detected: 0, dark_count: 0,
    intercepted: 0, pns_split: 0, noise_flipped: 0, sifted: 0,
    live_fiber_loss: 0, live_detected: 0, live_sifted: 0, live_detector_loss: 0,
  }
}

export function formatAliceReadout(record) {
  if (!record) return null
  const aliceBit = record.alice_bit ?? 0
  const aliceBasis = record.alice_basis ?? '+'
  let aliceAngle = record.alice_polarization_angle
  if (aliceAngle === undefined || aliceAngle === null) {
    aliceAngle = aliceBasis === '+' ? (aliceBit === 0 ? 0 : 90) : (aliceBit === 0 ? 45 : 135)
  }
  let aliceLabel = record.alice_state_label
  if (!aliceLabel) {
    aliceLabel = aliceBasis === '+' ? (aliceBit === 0 ? '|0⟩' : '|1⟩') : (aliceBit === 0 ? '|+⟩' : '|-⟩')
  }
  return {
    bit: aliceBit,
    basis: aliceBasis,
    angle: aliceAngle,
    label: aliceLabel,
    photonIndex: record.index
  }
}

export function formatBobReadout(record, status = 'detected') {
  if (!record) return null
  return {
    basis: record.bob_basis ?? '+',
    match: record.match ?? (record.alice_basis === record.bob_basis),
    photonIndex: record.index,
    status
  }
}

export function usePhotonAnimation(canvasRef, drawStaticScene) {

  const results = useSimulationStore((s) => s.results)

  const particlesRef = useRef([])        // active PhotonParticle instances
  const frameRef = useRef(null)          // requestAnimationFrame id
  const releaseIndexRef = useRef(0)      // next event index to release
  const frameCountRef = useRef(0)        // total frames elapsed
  const lastReleaseFrameRef = useRef(0)  // frame of last launch
  const laneLastFrameRef = useRef({})    // per-lane last launch frame
  const photonCompleteRef = useRef(false)
  const runningRef = useRef(false)       // loop active flag
  const drawSceneRef = useRef(drawStaticScene)
  const resultsRef = useRef(results)

  // Playback counters for the Transmission HUD (see createCounters).
  const countersRef = useRef(createCounters())
  const pendingArrivalsRef = useRef([])
  const lastArrivalFlushRef = useRef(0)
  const beamAccumulatorRef = useRef(0)

  // Keep the latest draw callback WITHOUT restarting playback
  useEffect(() => {
    drawSceneRef.current = drawStaticScene
  }, [drawStaticScene])
  resultsRef.current = results

  /**
   * The single rAF loop for the lifetime of a result set.
   * Reads ALL volatile state from the store via getState() each
   * frame — no closures over React state, no restart on zoom.
   */
  useEffect(() => {
    const events = results?.event_stream?.length
      ? results.event_stream
      : results?.bit_stream
    if (!events || events.length === 0) return

    // ── New result set: reset playback state ──────────────────
    particlesRef.current = []
    releaseIndexRef.current = 0
    frameCountRef.current = 0
    lastReleaseFrameRef.current = 0
    laneLastFrameRef.current = {}
    photonCompleteRef.current = false
    countersRef.current = createCounters()
    pendingArrivalsRef.current = []
    lastArrivalFlushRef.current = 0
    beamAccumulatorRef.current = 0
    useSimulationStore.getState().resetLiveArrivals()
    useSimulationStore.getState().resetReadouts()

    const animate = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        frameRef.current = requestAnimationFrame(animate)
        return
      }
      const ctx = canvas.getContext('2d')
      frameCountRef.current++

      // Fresh store state every frame — pause/zoom/speed are read
      // live and NEVER restart this loop.
      const state = useSimulationStore.getState()
      const paused = state.animation.isPaused
      const speed = state.animation.speed || 1.0
      const animMode = state.animation.mode || 'waves'
      const beamRate = state.animation.beamRate || 35
      const sync = state.syncMode
      const r = resultsRef.current
      const evts = r?.event_stream?.length
        ? r.event_stream
        : r?.bit_stream

      // ── Draw static scene under everything ───────────────────
      drawSceneRef.current?.()

      const currentPending = pendingArrivalsRef.current

      if (!paused && evts && releaseIndexRef.current < evts.length) {
        if (animMode === 'beam') {
          // ── BEAM MODE: High-rate continuous photon streaming ──
          if (particlesRef.current.length > 0) {
            particlesRef.current = []
          }
          beamAccumulatorRef.current += beamRate / 60
          while (beamAccumulatorRef.current >= 1 && releaseIndexRef.current < evts.length) {
            const record = evts[releaseIndexRef.current]
            const isFirst = releaseIndexRef.current === 0
            releaseIndexRef.current++
            beamAccumulatorRef.current -= 1

            countRelease(countersRef.current, record)
            state.updateAliceReadout(formatAliceReadout(record))

            if (isFirst) {
              state.updateBobReadout(formatBobReadout(record, 'in_flight'))
            }

            if (record.detector_detected) {
              countersRef.current.live_detected = (countersRef.current.live_detected || 0) + 1
              if (record.match) {
                countersRef.current.live_sifted = (countersRef.current.live_sifted || 0) + 1
              }
              currentPending.push(record)
              state.updateBobReadout(formatBobReadout(record, 'detected'))
            } else if (record.fiber_survived === false) {
              countersRef.current.live_fiber_loss = (countersRef.current.live_fiber_loss || 0) + 1
              // Lost in fiber: Bob's basis does not advance
            } else {
              countersRef.current.live_detector_loss = (countersRef.current.live_detector_loss || 0) + 1
            }
          }
        } else if (sync) {
          // ── SYNC MODE: One photon at a time ───────────────────
          const canvasEmpty = particlesRef.current.length === 0
          const isFirst = releaseIndexRef.current === 0
          if (canvasEmpty && (isFirst || photonCompleteRef.current)) {
            photonCompleteRef.current = false
            const record = evts[releaseIndexRef.current]
            if (record) {
              const isSingle = r?.raw_key_length === 1
              const p = new PhotonParticle(
                record, laneForIndex(record.index),
                isSingle ? speed * 0.3 : speed)
              particlesRef.current.push(p)
              countRelease(countersRef.current, record)
              state.updateAliceReadout(formatAliceReadout(record))
              if (isFirst) {
                state.updateBobReadout(formatBobReadout(record, 'in_flight'))
              }
              state.setInspectorIndex(releaseIndexRef.current)
              laneLastFrameRef.current[p.laneIndex] = frameCountRef.current
              releaseIndexRef.current++
              lastReleaseFrameRef.current = frameCountRef.current
            }
          }
        } else if (
          particlesRef.current.length < MAX_ACTIVE_PARTICLES &&
          frameCountRef.current - lastReleaseFrameRef.current >=
          releaseIntervalFrames(speed)
        ) {
          // ── WAVES MODE: Discrete photons with ~1.5s baseline delay ──
          let released = false
          const minGap = minLaneGapFrames(speed)
          for (let k = 0; k < LANE_Y_POSITIONS.length && !released; k++) {
            const i = releaseIndexRef.current + k
            if (i >= evts.length) break
            const record = evts[i]
            const lane = laneForIndex(record.index)
            const lastFrame = laneLastFrameRef.current[lane] ?? -Infinity
            if (frameCountRef.current - lastFrame >= minGap) {
              const isSingle = r?.raw_key_length === 1
              particlesRef.current.push(new PhotonParticle(
                record, lane, isSingle ? speed * 0.3 : speed))
              countRelease(countersRef.current, record)

              // Alice advances immediately upon release
              state.updateAliceReadout(formatAliceReadout(record))
              // Prime Bob on the very first photon
              if (i === 0 || releaseIndexRef.current === 0) {
                state.updateBobReadout(formatBobReadout(record, 'in_flight'))
              }

              laneLastFrameRef.current[lane] = frameCountRef.current
              for (let j = releaseIndexRef.current; j < i; j++) {
                countSkipped(countersRef.current, evts[j], currentPending)
              }
              releaseIndexRef.current = i + 1
              lastReleaseFrameRef.current = frameCountRef.current
              released = true
            }
          }
        }
      }

      // ── Update + draw particles ─────────────────────────────
      // When paused: draw WITHOUT updating (frozen frame survives zoom)
      const dpr = window.devicePixelRatio || 1
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.scale((canvas.width / dpr) / CANVAS_WIDTH,
        (canvas.height / dpr) / CANVAS_HEIGHT)

      if (paused) {
        for (const particle of particlesRef.current) {
          particle.draw(ctx)
        }
      } else {
        const prevCount = particlesRef.current.length
        const completed = []

        particlesRef.current = particlesRef.current.filter(p => {
          const alive = p.update()

          // Live event detection
          if (p.justLostInFiber && !p._fiberLossReported) {
            p._fiberLossReported = true
            countersRef.current.live_fiber_loss = (countersRef.current.live_fiber_loss || 0) + 1
          }
          if (p.justArrivedAtBob && !p._arrivalReported) {
            p._arrivalReported = true
            if (p.outcome === 'detected') {
              countersRef.current.live_detected = (countersRef.current.live_detected || 0) + 1
              if (p.record?.match) {
                countersRef.current.live_sifted = (countersRef.current.live_sifted || 0) + 1
              }
              currentPending.push(p.record)
              // Bob advances when photon actually arrives and is measured
              state.updateBobReadout(formatBobReadout(p.record, 'detected'))
            } else if (p.outcome === 'detector_loss') {
              countersRef.current.live_detector_loss = (countersRef.current.live_detector_loss || 0) + 1
            }
          }

          if (alive) p.draw(ctx)
          else completed.push(p)
          return alive
        })
        completed.forEach(p => countCompletion(countersRef.current, p))

        if (sync && prevCount > 0 && particlesRef.current.length === 0) {
          photonCompleteRef.current = true
        }
      }
      ctx.restore()

      // Flush live arrivals to store throttled (~20 Hz)
      const now = performance.now()
      if (currentPending.length > 0 && (now - lastArrivalFlushRef.current >= 50)) {
        state.appendLiveArrivals([...currentPending])
        currentPending.length = 0
        lastArrivalFlushRef.current = now
      }

      // ── Continue while events remain or particles live ───────
      const allReleased = !evts || releaseIndexRef.current >= evts.length
      const allDead = particlesRef.current.length === 0
      if (!allReleased || !allDead) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        if (currentPending.length > 0) {
          state.appendLiveArrivals([...currentPending])
          currentPending.length = 0
        }
        if (r?.bit_stream?.length) {
          state.setLiveArrivals(r.bit_stream)
        }
        frameRef.current = null
        runningRef.current = false
      }
    }

    // ── Start (or continue) the loop for this result set ──────
    if (!runningRef.current) {
      runningRef.current = true
      frameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      runningRef.current = false
    }
    // ONLY `results` (the playback source) may restart playback.
    // drawStaticScene is intentionally NOT a dependency.
  }, [results, canvasRef])

  return {
    isAnimating: frameRef.current !== null,
    particleCount: particlesRef.current.length,
    countersRef,
  }
}

// ── Counter helpers (pure; exported for unit testing) ───────────
export function countRelease(counters, record) {
  counters.released++
  if (record.intercepted) counters.intercepted++
  if (record.pns_split) counters.pns_split++
  if (record.noise_flipped) counters.noise_flipped++
  if (record.sifted) counters.sifted++
}

export function countSkipped(counters, record, arrivalsQueue) {
  countRelease(counters, record)
  counters.completed++
  // Single authoritative classifier (audit M2): identical semantics to
  // PhotonParticle.classifyOutcome used by countCompletion.
  const oc = classifyOutcome(record)
  if (counters[oc] !== undefined) counters[oc]++
  if (oc === 'fiber_loss') {
    counters.live_fiber_loss = (counters.live_fiber_loss || 0) + 1
  }
  if (oc === 'detected') {
    counters.live_detected = (counters.live_detected || 0) + 1
    if (record.match) counters.live_sifted = (counters.live_sifted || 0) + 1
    if (arrivalsQueue) arrivalsQueue.push(record)
  }
  if (oc === 'detector_loss') {
    counters.live_detector_loss = (counters.live_detector_loss || 0) + 1
  }
}

export function countCompletion(counters, particle) {
  counters.completed++
  if (counters[particle.outcome] !== undefined) {
    counters[particle.outcome]++
  }
  if (particle.outcome === 'fiber_loss' && !particle._fiberLossReported) {
    particle._fiberLossReported = true
    counters.live_fiber_loss = (counters.live_fiber_loss || 0) + 1
  }
  if (particle.outcome === 'detected' && !particle._arrivalReported) {
    particle._arrivalReported = true
    counters.live_detected = (counters.live_detected || 0) + 1
    if (particle.record?.match) {
      counters.live_sifted = (counters.live_sifted || 0) + 1
    }
  }
  if (particle.outcome === 'detector_loss' && !particle._arrivalReported) {
    particle._arrivalReported = true
    counters.live_detector_loss = (counters.live_detector_loss || 0) + 1
  }
}
