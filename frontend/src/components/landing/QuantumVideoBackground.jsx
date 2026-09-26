/**
 * src/components/landing/QuantumVideoBackground.jsx
 *
 * Cinematic Scroll-Synchronized Quantum Background Video & Wavepacket Layer.
 *
 * Features:
 * - Real quantum physics video playback (Photon Polarization & Filters)
 * - Two-way scroll synchronization: scrolling down advances video, scrolling up rewinds frame-by-frame
 * - 60 FPS lerp interpolation to eliminate seek-jank
 * - High-contrast editorial styling with dark carbon vignette (#0e0e12) to ensure foreground text legibility
 * - Procedural quantum probability wave & photon pulse canvas layer overlaid on video
 * - Clean, non-intrusive presentation without floating dialog boxes
 */

import { useEffect, useRef, useCallback } from 'react'

export default function QuantumVideoBackground() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Internal animation & scroll tracking refs (bypasses React render loop for 60fps)
  const targetProgressRef = useRef(0)
  const lerpedProgressRef = useRef(0)
  const isSeekingRef = useRef(false)
  const pendingTimeRef = useRef(null)

  // Handle video metadata loaded
  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (video && video.duration && !isNaN(video.duration)) {
      video.currentTime = targetProgressRef.current * video.duration
    }
  }

  // Handle scroll events on landing container
  useEffect(() => {
    const scrollContainer = document.getElementById('landing-scroll-container')
    const getScrollMetrics = () => {
      if (scrollContainer) {
        const top = scrollContainer.scrollTop
        const max = scrollContainer.scrollHeight - scrollContainer.clientHeight
        return { top, max: max > 0 ? max : 1 }
      }
      const top = window.scrollY || document.documentElement.scrollTop
      const max = (document.documentElement.scrollHeight - window.innerHeight) || 1
      return { top, max }
    }

    const onScroll = () => {
      const { top, max } = getScrollMetrics()
      const prog = Math.min(Math.max(top / max, 0), 1)
      targetProgressRef.current = prog
    }

    const targetEl = scrollContainer || window
    targetEl.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      targetEl.removeEventListener('scroll', onScroll)
    }
  }, [])

  // 60fps RequestAnimationFrame Loop: Lerps scroll position and applies to video + canvas
  useEffect(() => {
    let animId
    const canvas = canvasRef.current
    const ctx = canvas ? canvas.getContext('2d') : null

    const handleResize = () => {
      if (!canvas || !ctx) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
    window.addEventListener('resize', handleResize)
    handleResize()

    let time = 0

    const step = () => {
      time += 0.016
      const video = videoRef.current

      // 1. Lerp scroll progress for ultra-smooth easing
      const targetProg = targetProgressRef.current
      lerpedProgressRef.current += (targetProg - lerpedProgressRef.current) * 0.12

      // 2. Video Scrub Logic (plays forward on scroll down, rewinds on scroll up)
      if (video && video.duration && !isNaN(video.duration)) {
        const targetVideoTime = lerpedProgressRef.current * video.duration
        
        // Apply seeking if not currently seeking and delta is significant
        if (!isSeekingRef.current && Math.abs(video.currentTime - targetVideoTime) > 0.035) {
          isSeekingRef.current = true
          video.currentTime = targetVideoTime
        } else {
          pendingTimeRef.current = targetVideoTime
        }
      }

      // 3. Canvas Overlay: Subtle quantum probability wave and single-photon pulses
      if (ctx && canvas) {
        const w = window.innerWidth
        const h = window.innerHeight
        ctx.clearRect(0, 0, w, h)

        const scrollPhase = lerpedProgressRef.current * Math.PI * 4
        const rows = 12
        const cols = 20
        const dx = w / (cols - 1)
        const dy = h / (rows - 1)

        // Subtle undulating probability amplitude lines
        ctx.lineWidth = 1
        for (let j = 0; j < rows; j++) {
          ctx.beginPath()
          let started = false
          for (let i = 0; i < cols; i++) {
            const x0 = i * dx
            const y0 = j * dy
            const wave = Math.sin(x0 * 0.004 + time + scrollPhase) * Math.cos(y0 * 0.005 - time * 0.6)
            const y = y0 + wave * 14
            if (!started) {
              ctx.moveTo(x0, y)
              started = true
            } else {
              ctx.lineTo(x0, y)
            }
          }
          const alpha = 0.04 + 0.03 * Math.sin(j * 0.5 + time)
          ctx.strokeStyle = `rgba(245, 158, 11, ${alpha.toFixed(3)})`
          ctx.stroke()
        }

        // Horizontal single-photon wavepackets in flight along optical axis
        const corridorY = h * 0.44
        const packetCount = 3
        for (let p = 0; p < packetCount; p++) {
          const pPhase = (time * 0.4 + p / packetCount + lerpedProgressRef.current) % 1
          const px = pPhase * w
          const py = corridorY + Math.sin(pPhase * Math.PI * 4 + time * 1.5) * 22

          // Wavepacket envelope
          const grad = ctx.createRadialGradient(px, py, 1, px, py, 18)
          const isAmber = p % 2 === 0
          const colorBase = isAmber ? '245, 158, 11' : '16, 185, 129'
          grad.addColorStop(0, `rgba(${colorBase}, 0.55)`)
          grad.addColorStop(0.5, `rgba(${colorBase}, 0.15)`)
          grad.addColorStop(1, `rgba(${colorBase}, 0)`)

          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(px, py, 18, 0, Math.PI * 2)
          ctx.fill()

          // Photon core dot
          ctx.fillStyle = `rgb(${colorBase})`
          ctx.beginPath()
          ctx.arc(px, py, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      animId = requestAnimationFrame(step)
    }

    animId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Handle video seeked event to unlock next frame update
  const handleSeeked = useCallback(() => {
    isSeekingRef.current = false
    const video = videoRef.current
    if (video && pendingTimeRef.current !== null) {
      const nextTime = pendingTimeRef.current
      pendingTimeRef.current = null
      if (Math.abs(video.currentTime - nextTime) > 0.035) {
        isSeekingRef.current = true
        video.currentTime = nextTime
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* ── 1. CINEMATIC VIDEO BACKGROUND ELEMENT ── */}
      <video
        ref={videoRef}
        src="/quantum_hamiltonian.webm"
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
        muted
        playsInline
        loop
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{
          opacity: 0.55,
          filter: 'contrast(1.25) brightness(0.7) saturate(1.2)',
          transform: 'scale(1.02)'
        }}
      />

      {/* ── 2. DARK CARBON VIGNETTE & RADIAL SHADOW ── */}
      {/* Ensures crisp readability of all text, buttons, and HUDs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 32%, rgba(14, 14, 18, 0.42) 0%, rgba(14, 14, 18, 0.78) 65%, rgba(14, 14, 18, 0.96) 100%)'
        }}
      />

      {/* ── 3. OVERLAID QUANTUM WAVE & PHOTON PULSE CANVAS ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.9 }}
      />
    </div>
  )
}
