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
const MAX_WAVE_VISUALS = 120
const BEAM_TARGET_SECONDS = 12

export function getPlaybackEvents(results) {
  if (results?.playback_stream?.length) return results.playback_stream
  if (results?.event_stream?.length) return results.event_stream
  return results?.bit_stream || []
}

export function waveBatchSize(eventCount) {
  return Math.max(1, Math.ceil(eventCount / MAX_WAVE_VISUALS))
}

/**
 * Pick the backend record that supplies the path drawn for a grouped wave.
 * When a group contains a Bob detection, its visual carrier must reach Bob;
 * otherwise Bob's grouped readout would advance when a loss animation ends
 * part-way through the fiber. Accounting still processes every record.
 */
export function representativeRecordForWaveBatch(records) {
  if (!records?.length) return null
  return [...records].reverse().find((record) => record.bob_bit != null) ?? records[0]
}

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
    visual_batch_size: 1, visual_batch_start: null, visual_batch_end: null,
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
    bit: record.bob_bit ?? null,
    basis: record.bob_basis ?? '+',
    angle: record.polarization_angle ?? null,
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
  const lastBeamReadoutRef = useRef(0)
  const lastFrameTimeRef = useRef(null)
  const frameDurationsRef = useRef([])

  // Keep the latest draw callback and results WITHOUT restarting playback
  useEffect(() => {
    drawSceneRef.current = drawStaticScene
  }, [drawStaticScene])
  useEffect(() => {
    resultsRef.current = results
  }, [results])

  /**
   * The single rAF loop for the lifetime of a result set.
   * Reads ALL volatile state from the store via getState() each
   * frame — no closures over React state, no restart on zoom.
   */
  useEffect(() => {
    const events = getPlaybackEvents(results)
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
    lastBeamReadoutRef.current = 0
    lastFrameTimeRef.current = null
    frameDurationsRef.current = []
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

      // Rolling measured frame cadence for the Details telemetry. This stays
      // in refs/counters so it never drives the Canvas loop through React.
      const frameNow = performance.now()
      if (lastFrameTimeRef.current != null) {
        const duration = frameNow - lastFrameTimeRef.current
        const samples = frameDurationsRef.current
        samples.push(duration)
        if (samples.length > 120) samples.shift()
        if (samples.length >= 30 && frameCountRef.current % 15 === 0) {
          const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length
          countersRef.current.measured_fps = mean > 0 ? 1000 / mean : 0
          countersRef.current.frame_ms_max = Math.max(...samples)
        }
      }
      lastFrameTimeRef.current = frameNow

      // Fresh store state every frame — pause/zoom/speed are read
      // live and NEVER restart this loop.
      const state = useSimulationStore.getState()
      const paused = state.animation.isPaused
      const speed = state.animation.speed || 1.0
      const animMode = state.animation.mode || 'waves'
      const beamRate = state.animation.beamRate || 35
      const sync = state.syncMode
      const r = resultsRef.current
      const evts = getPlaybackEvents(r)

      // ── Draw static scene under everything ───────────────────
      drawSceneRef.current?.()

      const currentPending = pendingArrivalsRef.current

      if (!paused && evts && releaseIndexRef.current < evts.length) {
        if (animMode === 'beam') {
          // ── BEAM MODE: High-rate continuous photon streaming ──
          if (particlesRef.current.length > 0) {
            const latestTransitionDetection = drainActiveParticles(
              countersRef.current, particlesRef.current, currentPending
            )
            if (latestTransitionDetection) {
              state.updateBobReadout(formatBobReadout(
                latestTransitionDetection, 'detected'
              ))
            }
            particlesRef.current = []
          }
          const effectiveBeamRate = Math.max(
            beamRate,
            evts.length / BEAM_TARGET_SECONDS
          )
          beamAccumulatorRef.current += effectiveBeamRate / 60
          let latestRecord = null
          let latestDetectedRecord = null
          const hadFirstRelease = releaseIndexRef.current === 0

          while (beamAccumulatorRef.current >= 1 && releaseIndexRef.current < evts.length) {
            const record = evts[releaseIndexRef.current]
            releaseIndexRef.current++
            beamAccumulatorRef.current -= 1

            countRelease(countersRef.current, record)
            latestRecord = record

            if (record.bob_bit != null) {
              countersRef.current.live_detected = (countersRef.current.live_detected || 0) + 1
              if (record.match) {
                countersRef.current.live_sifted = (countersRef.current.live_sifted || 0) + 1
              }
              currentPending.push(record)
              latestDetectedRecord = record
            } else if (record.fiber_survived === false) {
              countersRef.current.live_fiber_loss = (countersRef.current.live_fiber_loss || 0) + 1
              // Lost in fiber: Bob's basis does not advance
            } else {
              countersRef.current.live_detector_loss = (countersRef.current.live_detector_loss || 0) + 1
            }
          }

          // Throttle UI store readouts to 10 Hz (every 100ms) or first/final pulse to prevent React main-thread lag
          const nowMs = performance.now()
          const isComplete = releaseIndexRef.current >= evts.length
          if (latestRecord && (hadFirstRelease || isComplete || (nowMs - lastBeamReadoutRef.current >= 100))) {
            state.updateAliceReadout(formatAliceReadout(latestRecord))
            if (hadFirstRelease) {
              state.updateBobReadout(formatBobReadout(latestRecord, 'in_flight'))
            } else if (latestDetectedRecord) {
              state.updateBobReadout(formatBobReadout(latestDetectedRecord, 'detected'))
            }
            lastBeamReadoutRef.current = nowMs
          }
        } else if (sync) {
          // ── SYNC MODE: One photon at a time ───────────────────
          const canvasEmpty = particlesRef.current.length === 0
          const isFirst = releaseIndexRef.current === 0
          if (canvasEmpty && (isFirst || photonCompleteRef.current)) {
            photonCompleteRef.current = false
            const record = evts[releaseIndexRef.current]
            if (record) {
              const batch = evts.slice(
                releaseIndexRef.current,
                releaseIndexRef.current + 1
              )
              const isSingle = r?.raw_key_length === 1
              const p = new PhotonParticle(
                record, laneForIndex(record.index),
                isSingle ? speed * 0.3 : speed)
              p._playbackBatch = batch
              particlesRef.current.push(p)
              batch.forEach((item) => countRelease(countersRef.current, item))
              state.updateAliceReadout(formatAliceReadout(record))
              if (isFirst) {
                state.updateBobReadout(formatBobReadout(record, 'in_flight'))
              }
              state.setInspectorIndex(releaseIndexRef.current)
              laneLastFrameRef.current[p.laneIndex] = frameCountRef.current
              releaseIndexRef.current += batch.length
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
              const batch = evts.slice(
                i,
                i + waveBatchSize(evts.length)
              )
              const representative = representativeRecordForWaveBatch(batch)
              const representativeLane = laneForIndex(representative.index)
              const particle = new PhotonParticle(
                representative, representativeLane, isSingle ? speed * 0.3 : speed)
              particle._playbackBatch = batch
              particlesRef.current.push(particle)
              batch.forEach((item) => countRelease(countersRef.current, item))
              countersRef.current.visual_batch_size = batch.length
              countersRef.current.visual_batch_start = batch[0]?.index ?? null
              countersRef.current.visual_batch_end = batch[batch.length - 1]?.index ?? null

              // Alice advances immediately upon release
              state.updateAliceReadout({
                ...formatAliceReadout(representative),
                representedCount: batch.length,
                representedStart: batch[0]?.index ?? null,
                representedEnd: batch[batch.length - 1]?.index ?? null,
              })
              // Prime Bob on the very first photon
              if (i === 0 || releaseIndexRef.current === 0) {
                state.updateBobReadout(formatBobReadout(representative, 'in_flight'))
              }

              laneLastFrameRef.current[representativeLane] = frameCountRef.current
              for (let j = releaseIndexRef.current; j < i; j++) {
                countSkipped(countersRef.current, evts[j], currentPending)
              }
              releaseIndexRef.current = i + batch.length
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
          if (!p._playbackBatch && p.justLostInFiber && !p._fiberLossReported) {
            p._fiberLossReported = true
            countersRef.current.live_fiber_loss = (countersRef.current.live_fiber_loss || 0) + 1
          }
          if (!p._playbackBatch && p.justArrivedAtBob && !p._arrivalReported) {
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
        completed.forEach(p => {
          if (p._playbackBatch) {
            const detected = completePlaybackBatch(
              countersRef.current, p._playbackBatch, currentPending
            )
            if (detected) {
              state.updateBobReadout(formatBobReadout(detected, 'detected'))
            }
          } else {
            countCompletion(countersRef.current, p)
          }
        })

        if (sync && prevCount > 0 && particlesRef.current.length === 0) {
          photonCompleteRef.current = true
        }
      }
      ctx.restore()

      // Flush live arrivals to store throttled (~10 Hz in beam mode, ~20 Hz in waves mode)
      const now = performance.now()
      const flushInterval = animMode === 'beam' ? 100 : 50
      if (currentPending.length > 0 && (now - lastArrivalFlushRef.current >= flushInterval)) {
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
        state.finishPlayback()
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

export function completePlaybackBatch(counters, records, arrivalsQueue) {
  let latestDetected = null
  for (const record of records) {
    counters.completed++
    const outcome = classifyOutcome(record)
    if (counters[outcome] !== undefined) counters[outcome]++
    if (outcome === 'fiber_loss') counters.live_fiber_loss++
    if (outcome === 'detector_loss') counters.live_detector_loss++
    if (record.bob_bit != null) {
      counters.live_detected++
      if (record.sifted ?? record.match) counters.live_sifted++
      arrivalsQueue?.push(record)
      latestDetected = record
    }
  }
  return latestDetected
}

export function drainActiveParticles(counters, particles, arrivalsQueue) {
  let latestDetected = null
  for (const particle of particles) {
    if (particle._playbackBatch) {
      const detected = completePlaybackBatch(
        counters, particle._playbackBatch, arrivalsQueue
      )
      if (detected) latestDetected = detected
    } else {
      countCompletion(counters, particle)
      if (particle.record?.bob_bit != null) {
        arrivalsQueue?.push(particle.record)
        latestDetected = particle.record
      }
    }
  }
  return latestDetected
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
