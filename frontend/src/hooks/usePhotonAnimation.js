/**
 * src/hooks/usePhotonAnimation.js
 *
 * Animation loop for photon particles on QuantumCanvas.
 *
 * Responsibilities:
 * 1. Watch for new simulation results in Zustand store
 * 2. Create PhotonParticle instances from bit_stream
 * 3. Run requestAnimationFrame loop — update + draw each frame
 * 4. Draw static scene each frame (background, lanes, nodes)
 * 5. Draw all active photons on top
 * 6. Release photons in batches — not all at once
 * 7. Stop loop cleanly when all photons are dead
 * 8. Cancel animation frame on unmount
 */

import { useEffect, useRef, useCallback } from 'react'
import { PhotonParticle } from '../components/canvas/PhotonParticle'
import useSimulationStore from '../store/simulationStore'
import { LANE_Y_POSITIONS } from '../components/canvas/QuantumCanvas'

/**
 * @param {React.RefObject} canvasRef - ref to the <canvas> element
 * @param {Function} drawStaticScene  - callback from QuantumCanvas 
 *                                      to redraw background/lanes/nodes
 */
export function usePhotonAnimation(canvasRef, drawStaticScene) {

  const { results, animation } = useSimulationStore()
  
  const particlesRef = useRef([])        // active PhotonParticle instances
  const frameRef = useRef(null)          // requestAnimationFrame id
  const releaseIndexRef = useRef(0)      // next photon index to release
  const frameCountRef = useRef(0)        // total frames elapsed

  // Release N photons per frame batch
  // Stagger release so photons don't all spawn simultaneously
  const PHOTONS_PER_BATCH = 3
  const FRAMES_BETWEEN_BATCHES = 8

  /**
   * Create a PhotonParticle from a bit_stream record.
   * Assigns lane based on photon index (round-robin across 3 lanes).
   */
  const createParticle = useCallback((record) => {
    const isSinglePhoton = results?.raw_key_length === 1
    const particleSpeed = isSinglePhoton 
      ? animation.speed * 0.3  // 30% speed for single photon
      : animation.speed

    const laneIndex = record.index % LANE_Y_POSITIONS.length
    return new PhotonParticle(record, laneIndex, particleSpeed)
  }, [animation.speed, results])

  /**
   * Main animation loop — called every frame via requestAnimationFrame.
   * 
   * Each frame:
   * 1. Increment frame counter
   * 2. Release next batch of photons if frame interval reached
   * 3. Call drawStaticScene() to clear and redraw background
   * 4. Update each particle — remove dead ones
   * 5. Draw each living particle
   * 6. Continue loop if particles remain or more to release
   * 7. Stop if all photons released and all particles dead
   */
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    
    frameCountRef.current++
    
    // Check pause state
    const { animation } = useSimulationStore.getState()
    if (animation.isPaused) {
      frameRef.current = requestAnimationFrame(animate)
      return
    }

    // Release next batch of photons
    if (
      results?.bit_stream &&
      releaseIndexRef.current < results.bit_stream.length &&
      frameCountRef.current % FRAMES_BETWEEN_BATCHES === 0
    ) {
      const batch = results.bit_stream.slice(
        releaseIndexRef.current,
        releaseIndexRef.current + PHOTONS_PER_BATCH
      )
      batch.forEach(record => {
        particlesRef.current.push(createParticle(record))
      })
      releaseIndexRef.current += PHOTONS_PER_BATCH
    }

    // Redraw static scene (clears canvas each frame)
    drawStaticScene()

    // Update and draw particles
    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.scale(dpr, dpr)

    const scaleX = (canvas.width / dpr) / 1200  // CANVAS_WIDTH
    const scaleY = (canvas.height / dpr) / 400   // CANVAS_HEIGHT

    particlesRef.current = particlesRef.current.filter(particle => {
      const alive = particle.update()
      if (alive) particle.draw(ctx, scaleX, scaleY)
      return alive
    })

    ctx.restore()

    // Continue or stop
    const allReleased = !results?.bit_stream || 
      releaseIndexRef.current >= results.bit_stream.length
    const allDead = particlesRef.current.length === 0

    if (!allReleased || !allDead) {
      frameRef.current = requestAnimationFrame(animate)
    } else {
      // Animation complete
      frameRef.current = null
    }
  }, [canvasRef, drawStaticScene, results, createParticle])

  /**
   * Start animation when results arrive.
   * Reset particle state and begin loop.
   */
  useEffect(() => {
    if (!results?.bit_stream || results.bit_stream.length === 0) return

    // Reset animation state
    particlesRef.current = []
    releaseIndexRef.current = 0
    frameCountRef.current = 0

    // Cancel any existing loop
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }

    // Start loop
    frameRef.current = requestAnimationFrame(animate)

    // Cleanup on unmount or results change
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [results, animate])

  return {
    isAnimating: frameRef.current !== null,
    particleCount: particlesRef.current.length
  }
}
