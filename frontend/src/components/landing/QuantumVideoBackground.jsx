/**
 * src/components/landing/QuantumVideoBackground.jsx
 *
 * Cinematic Scroll-Synchronized Quantum Background Video & Geometric Layer.
 *
 * Visual Components:
 * 1. Background Video: Restored overlapping spiral Hamiltonian composition (/quantum_hamiltonian.webm)
 *    - Synchronizes smoothly over the primary visual showcase area (~55% of scroll)
 *    - Bidirectional 60 FPS seeking (scroll down advances, scroll up rewinds)
 *    - Automatically settles at completion for lower sections to ensure ultra-smooth scrolling
 * 2. Dark Carbon Vignette: Multi-stop radial shadow ensuring crisp foreground text contrast
 * 3. Canvas Layer:
 *    - Folded circular ribbon (ring-motion)
 *    - 5 asymmetrically placed rotating polarization motifs
 *    - Left-hand reading column protective gradient
 *    - Removed: helix/spiral and travelling photon dots
 */

import { useEffect, useRef, useCallback } from 'react'

export default function QuantumVideoBackground() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  // Internal animation & scroll tracking refs (bypasses React render loop for 60fps)
  const targetProgressRef = useRef(0)
  const lerpedProgressRef = useRef(0)
  const lastScrollTopRef = useRef(0)
  const scrollDirectionRef = useRef(1) // 1 = down, -1 = up

  // The continuous quantum Hamiltonian dispersion animation completes its full physical formation at 20.5s.
  // Beyond 20.5s, the video contains discrete time-skip steps ("one hour later", "one month later").
  // We map the continuous 0->20.5s animation across the upper page scroll,
  // letting it advance smoothly and naturally without squeezing or skipping frames,
  // and holding steadily at the finished formation for the rest of the page.
  const ANIMATION_SPAN = 20.5

  // Handle video metadata loaded: pause autoplay and initialize position
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current
    if (video && video.duration && !isNaN(video.duration)) {
      video.pause()
      const maxTime = Math.min(ANIMATION_SPAN, video.duration)
      video.currentTime = targetProgressRef.current * maxTime
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const container = document.getElementById('landing-scroll-container')
    const scrollOwner = container || window
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let frame = null
    let width = 0
    let height = 0

    const getScrollMetrics = () => {
      if (container) {
        const top = container.scrollTop
        const max = container.scrollHeight - container.clientHeight
        return { top, max: max > 0 ? max : 1 }
      }
      const top = window.scrollY || document.documentElement.scrollTop
      const max = (document.documentElement.scrollHeight - window.innerHeight) || 1
      return { top, max }
    }

    // Scroll mapping with direction detection and smooth natural range (~2200px)
    const onScroll = () => {
      const { top, max } = getScrollMetrics()
      const delta = top - lastScrollTopRef.current
      if (Math.abs(delta) > 0.5) {
        scrollDirectionRef.current = delta > 0 ? 1 : -1
      }
      lastScrollTopRef.current = top

      const activeRange = Math.min(2200, Math.max(1200, max * 0.65))
      const rawProg = Math.min(1, Math.max(0, top / activeRange))
      
      // Smooth Hermite curve (smoothstep): starts softly, moves with rich momentum, and glides to a stop
      const easedProg = rawProg * rawProg * (3 - 2 * rawProg)
      targetProgressRef.current = easedProg
    }

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      onScroll()
    }

    // ── DRAW CANVAS: RING-MOTION & 5 MOTIFS ──
    const draw = (progress) => {
      ctx.clearRect(0, 0, width, height)
      const phase = progress * Math.PI * 8

      // 1. Left reading column protective gradient
      // Rich dark contrast on the left guarantees text legibility while letting the spiral glow on the right
      const shade = ctx.createLinearGradient(0, 0, width, 0)
      shade.addColorStop(0, 'rgba(12, 11, 10, 0.92)')
      shade.addColorStop(0.38, 'rgba(12, 11, 10, 0.74)')
      shade.addColorStop(0.65, 'rgba(12, 11, 10, 0.22)')
      shade.addColorStop(1, 'rgba(12, 11, 10, 0.02)')
      ctx.fillStyle = shade
      ctx.fillRect(0, 0, width, height)

      // 2. Compact folded circular ribbon (Ring-motion)
      const loopRadius = Math.min(76, width * 0.06)
      const loopX = width * 0.86
      const loopY = height * 0.38
      const tilt = 0.65 + Math.sin(progress * Math.PI * 2) * 0.32
      const fold = 0.16 + Math.sin(progress * Math.PI * 3) * 0.14
      const ribbonPoint = (t, edge) => {
        const angle = t + phase * 0.22
        const r = loopRadius + edge * 7
        const z = Math.sin(angle * 3 + phase * 0.3) * loopRadius * fold
        return [
          loopX + Math.cos(angle) * r,
          loopY + Math.sin(angle) * r * Math.cos(tilt) - z * Math.sin(tilt),
          Math.sin(angle) * r * Math.sin(tilt) + z * Math.cos(tilt)
        ]
      }
      const segments = Array.from({ length: 100 }, (_, i) => {
        const t = (i * Math.PI * 2) / 100
        const next = ((i + 1) * Math.PI * 2) / 100
        const corners = [ribbonPoint(t, -1), ribbonPoint(next, -1), ribbonPoint(next, 1), ribbonPoint(t, 1)]
        return { corners, depth: corners.reduce((sum, p) => sum + p[2], 0) / 4 }
      }).sort((a, b) => a.depth - b.depth)

      segments.forEach(({ corners, depth }) => {
        const light = Math.max(0, Math.min(1, (depth / loopRadius + 1) / 2))
        ctx.beginPath()
        corners.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
        ctx.closePath()
        ctx.fillStyle = `rgba(${Math.round(90 + light * 110)},${Math.round(69 + light * 90)},${Math.round(100 + light * 85)},0.48)`
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(corners[2][0], corners[2][1])
        ctx.lineTo(corners[3][0], corners[3][1])
        ctx.strokeStyle = `rgba(231,203,171,${0.2 + light * 0.4})`
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // 3. Five polarization-axis motifs with stable coordinates & resonant phase pulses
      const r = Math.max(16, Math.min(27, width * 0.022))
      const motifs = [
        [width * 0.055, 0.23, 15],
        [width * 0.74, 0.11, 65],
        [width * 0.43, 0.64, 110],
        [width * 0.94, 0.8, 35],
        [width * 0.18, 0.92, 145]
      ]
      motifs.forEach(([x, y, angle], index) => {
        ctx.save()
        ctx.translate(x, height * y)
        ctx.rotate((angle * Math.PI) / 180 + progress * Math.PI * 2)
        
        // Concentric resonant faint echo ring
        const echoRadius = r * (1.2 + Math.sin(progress * Math.PI * 4 + index) * 0.12)
        ctx.beginPath()
        ctx.arc(0, 0, echoRadius, 0, Math.PI * 2)
        ctx.strokeStyle = index % 2 ? 'rgba(129,184,164,0.18)' : 'rgba(180,160,213,0.18)'
        ctx.lineWidth = 0.9
        ctx.stroke()

        // Primary polarization motif ring & axis
        ctx.strokeStyle = index % 2 ? 'rgba(129,184,164,0.65)' : 'rgba(180,160,213,0.65)'
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(-r - 4, 0)
        ctx.lineTo(r + 4, 0)
        ctx.stroke()
        ctx.restore()
      })
    }

    // ── 60 FPS LERP & SYNC LOOP ──
    const step = () => {
      const targetProg = targetProgressRef.current
      const delta = targetProg - lerpedProgressRef.current

      // Direction-aware adaptive easing rate:
      // When reversing direction or undergoing rapid movement, respond faster to eliminate sluggish turnaround.
      // Near rest, decay smoothly for a luxurious settling feel.
      let easeRate = 0.09
      if (motion.matches) {
        easeRate = 1
      } else if (Math.abs(delta) > 0.08) {
        easeRate = 0.14 // fast tracking for active scroll
      } else if (Math.abs(delta) < 0.008) {
        easeRate = 0.06 // gentle feather settling
      }

      lerpedProgressRef.current += delta * easeRate

      if (Math.abs(targetProg - lerpedProgressRef.current) < 0.0003) {
        lerpedProgressRef.current = targetProg
      }

      const currentProgress = lerpedProgressRef.current

      // A. Video scrub sync: non-blocking, frame-synchronized seek
      const video = videoRef.current
      if (video && video.duration && !isNaN(video.duration)) {
        const maxTime = Math.min(ANIMATION_SPAN, video.duration)
        const targetVideoTime = currentProgress * maxTime
        
        // Seek only when video is not actively decoding a prior seek and time difference is at least 1 frame (~0.035s)
        if (!video.seeking && Math.abs(video.currentTime - targetVideoTime) > 0.035) {
          video.currentTime = targetVideoTime
        }

        // Kinetic optical parallax zoom: subtly expands from 1.01 to 1.05 as you dive into the quantum state
        const scale = 1.01 + currentProgress * 0.04
        const shiftY = (currentProgress - 0.5) * -10
        video.style.transform = `scale(${scale.toFixed(4)}) translateY(${shiftY.toFixed(2)}px)`
      }

      // B. Canvas elements draw
      draw(currentProgress)

      frame = requestAnimationFrame(step)
    }

    scrollOwner.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', resize)
    resize()
    frame = requestAnimationFrame(step)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      scrollOwner.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
    }
  }, [handleLoadedMetadata])

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      data-background="quantum-video-composite"
      aria-hidden="true"
      style={{ background: 'radial-gradient(ellipse at 78% 45%, #201a1d 0%, #100f0e 58%, #090909 100%)' }}
    >
      {/* ── 1. CINEMATIC VIDEO: Overlapping Spiral Composition ── */}
      <video
        ref={videoRef}
        src="/quantum_hamiltonian.webm"
        onLoadedMetadata={handleLoadedMetadata}
        muted
        playsInline
        loop
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover will-change-transform"
        style={{
          opacity: 0.78,
          filter: 'contrast(1.16) brightness(1.04) saturate(1.22)',
          transform: 'scale(1.01)'
        }}
      />

      {/* ── 2. DARK CARBON VIGNETTE & RADIAL SHADOW ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 60% 40%, rgba(14, 14, 18, 0.12) 0%, rgba(14, 14, 18, 0.52) 58%, rgba(10, 10, 12, 0.94) 100%)'
        }}
      />

      {/* ── 3. OVERLAID CANVAS: Ring-Motion & 5 Motifs ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.92 }}
      />
    </div>
  )
}


