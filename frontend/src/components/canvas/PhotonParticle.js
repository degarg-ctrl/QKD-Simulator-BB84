/**
 * src/components/canvas/PhotonParticle.js
 *
 * Represents a single photon particle travelling Alice → Bob.
 * Encodes quantum state visually through color, angle, and effects.
 *
 * Visual encoding per PHYSICS_CONTRACT.md Section 2:
 * Basis +, bit 0 → Blue  (#6366f1), polarization line at 0°
 * Basis +, bit 1 → Blue  (#6366f1), polarization line at 90°
 * Basis x, bit 0 → Purple (#a855f7), polarization line at 45°
 * Basis x, bit 1 → Purple (#a855f7), polarization line at 135°
 *
 * Special states:
 * - Lost photon: fades opacity 1→0, stops mid-channel
 * - Eve intercepted: brief split effect, angle may shift on re-emit
 * - Dark count: white/grey color, random angle
 * - Detected by Bob: brief green flash at Bob node
 */

import { ALICE_X, BOB_X, EVE_X, LANE_Y_POSITIONS, COLORS, NODE_RADIUS } from '../canvas/QuantumCanvas'

export class PhotonParticle {

  /**
   * @param {Object} photonRecord - PhotonRecord from backend bit_stream
   * @param {number} laneIndex    - Which lane (0, 1, or 2) to travel on
   * @param {number} speed        - Animation speed multiplier
   */
  constructor(photonRecord, laneIndex, speed = 1.0, xOffset = 0) {
    this.record = photonRecord
    this.laneIndex = laneIndex
    this.speed = speed

    // Position — starts at Alice
    this.x = ALICE_X - xOffset
    this.y = LANE_Y_POSITIONS[laneIndex]

    // Movement
    this.targetX = photonRecord.lost ? 
      ALICE_X + (BOB_X - ALICE_X) * (0.3 + Math.random() * 0.3) :  // lost = stops mid-channel
      BOB_X
    this.velocityX = 3.5 * speed

    // Visual state
    this.opacity = 1.0
    this.radius = 7
    this.glowRadius = 14

    // Determine color from alice_basis
    this.baseColor = photonRecord.alice_basis === '+' 
      ? '#00aacc' 
      : '#ccaa00'

    // Polarization angle from backend record
    this.polarizationAngle = photonRecord.polarization_angle

    // Track if Eve has intercepted — angle shifts at EVE_X
    this.intercepted = photonRecord.intercepted
    this.hasPassedEve = false
    
    // After Eve: angle shifts to Eve's re-emitted angle if basis mismatch
    this.preEveAngle = photonRecord.polarization_angle
    this.postEveAngle = this.intercepted 
      ? this._computePostEveAngle(photonRecord)
      : photonRecord.polarization_angle

    // Animation lifecycle
    this.state = 'travelling'  
    // states: 'travelling' | 'intercepted' | 'fading' | 'arrived' | 'dead'

    // Eve interception effect
    this.eveEffectTimer = 0
    this.eveEffectDuration = 20  // frames

    // Arrival flash
    this.arrivalFlashTimer = 0
  }

  /**
   * Compute the post-Eve polarization angle.
   * Special logic to show Eve's disturbance visually.
   */
  _computePostEveAngle(record) {
    if (!record.intercepted) return record.polarization_angle
    
    // The backend PhotonRecord.polarization_angle contains the final encoded state.
    // However, for visual effect during the transition at EVE_X, 
    // we use a slight variation if we want to show disturbance.
    const angles = [0, 45, 90, 135]
    const originalIndex = angles.indexOf(record.polarization_angle)
    // Shift marginally if intercept occurred to show visual "re-encode"
    return angles[(originalIndex + (Math.random() > 0.5 ? 1 : 3)) % 4]
  }

  /**
   * Update photon position and visual state for one animation frame.
   */
  update() {
    if (this.state === 'dead') return false

    // Move right
    this.x += this.velocityX

    // Trigger Eve interception effect when passing EVE_X
    if (this.intercepted && !this.hasPassedEve && this.x >= EVE_X) {
      this.hasPassedEve = true
      this.state = 'intercepted'
      this.eveEffectTimer = this.eveEffectDuration
      // Shift polarization angle to post-Eve value
      this.polarizationAngle = this.postEveAngle
    }

    // Count down Eve effect
    if (this.eveEffectTimer > 0) {
      this.eveEffectTimer--
      if (this.eveEffectTimer === 0 && this.state === 'intercepted') {
        this.state = 'travelling'
      }
    }

    // Handle lost photons — fade out when reaching targetX
    if (this.record.lost && this.x >= this.targetX) {
      this.state = 'fading'
    }

    if (this.state === 'fading') {
      this.opacity -= 0.05
      if (this.opacity <= 0) {
        this.state = 'dead'
        return false
      }
      return true
    }

    // Handle arrival at Bob
    if (!this.record.lost && this.x >= BOB_X) {
      this.state = 'arrived'
      this.arrivalFlashTimer = 25
    }

    if (this.state === 'arrived') {
      this.arrivalFlashTimer--
      // Continue moving past Bob and fade out
      this.x += this.velocityX * 0.5
      this.opacity -= 0.04
      if (this.arrivalFlashTimer <= 0 || this.opacity <= 0) {
        this.state = 'dead'
        return false
      }
      return true
    }

    return true
  }

  /**
   * Draw this photon onto the canvas context.
   */
  draw(ctx, scaleX = 1, scaleY = 1) {
    if (this.state === 'dead') return

    ctx.save()
    ctx.scale(scaleX, scaleY)
    ctx.globalAlpha = this.opacity

    // 1. Draw outer glow
    this._drawGlow(ctx)

    // 2. Draw particle body
    this._drawBody(ctx)

    // 3. Draw polarization line through particle
    this._drawPolarizationLine(ctx)

    // 4. Draw Eve interception effect if active
    if (this.state === 'intercepted' && this.eveEffectTimer > 0) {
      this._drawEveEffect(ctx)
    }

    // 5. Draw arrival flash at Bob
    if (this.state === 'arrived') {
      this._drawArrivalFlash(ctx)
    }

    ctx.restore()
  }

  _drawGlow(ctx) {
    const color = this.record.lost
      ? '#666666'
      : this.baseColor
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.glowRadius
    )
    gradient.addColorStop(0, color + '80')
    gradient.addColorStop(0.5, color + '30')
    gradient.addColorStop(1, color + '00')
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.glowRadius,
            0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
  }

  _drawBody(ctx) {
    const color = this.record.lost 
      ? '#666666' 
      : this.baseColor

    // White outline ring
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Filled body
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  _drawPolarizationLine(ctx) {
    const angleRad = (this.polarizationAngle * Math.PI) / 180
    const lineLength = 16
    const dx = Math.cos(angleRad) * lineLength / 2
    const dy = Math.sin(angleRad) * lineLength / 2

    ctx.beginPath()
    ctx.moveTo(this.x - dx, this.y - dy)
    ctx.lineTo(this.x + dx, this.y + dy)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  _drawEveEffect(ctx) {
    const progress = 1 - (this.eveEffectTimer / 
                          this.eveEffectDuration)
    const ringRadius = this.radius + progress * 25
    const ringOpacity = (1 - progress) * 0.9

    // Bright red expanding ring — high contrast
    ctx.beginPath()
    ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2)
    ctx.strokeStyle = '#ff4444'
    ctx.globalAlpha = ringOpacity * this.opacity
    ctx.lineWidth = 3
    ctx.shadowColor = '#ff4444'
    ctx.shadowBlur = 15
    ctx.stroke()
    ctx.shadowBlur = 0

    // Second inner ring for depth
    const r2 = this.radius + progress * 12
    const o2 = (1 - progress) * 0.6
    ctx.beginPath()
    ctx.arc(this.x, this.y, r2, 0, Math.PI * 2)
    ctx.strokeStyle = '#ff8888'
    ctx.globalAlpha = o2 * this.opacity
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  _drawArrivalFlash(ctx) {
    /**
     * Enhanced Bob arrival effect.
     * Three layered rings expand outward from Bob node.
     * Each ring has different speed and opacity.
     * Matched photons: green rings.
     * Mismatched photons: yellow rings (wrong basis).
     */
    const progress = 1 - (this.arrivalFlashTimer / 25)
    const isMatch = this.record.match

    const ringColor = isMatch ? '#22c55e' : '#f59e0b'

    // Ring 1 — fast, tight
    const r1 = NODE_RADIUS + progress * 12
    const o1 = (1 - progress) * 0.9
    ctx.beginPath()
    ctx.arc(BOB_X, this.y, r1, 0, Math.PI * 2)
    ctx.strokeStyle = ringColor
    ctx.globalAlpha = o1 * this.opacity
    ctx.lineWidth = 2.5
    ctx.stroke()

    // Ring 2 — medium
    const r2 = NODE_RADIUS + progress * 22
    const o2 = (1 - progress) * 0.5
    ctx.beginPath()
    ctx.arc(BOB_X, this.y, r2, 0, Math.PI * 2)
    ctx.strokeStyle = ringColor
    ctx.globalAlpha = o2 * this.opacity
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Ring 3 — slow, wide
    const r3 = NODE_RADIUS + progress * 35
    const o3 = (1 - progress) * 0.25
    ctx.beginPath()
    ctx.arc(BOB_X, this.y, r3, 0, Math.PI * 2)
    ctx.strokeStyle = ringColor
    ctx.globalAlpha = o3 * this.opacity
    ctx.lineWidth = 1
    ctx.stroke()

    // Center flash — brief white dot at impact
    if (progress < 0.3) {
      const flashOpacity = (0.3 - progress) / 0.3
      ctx.beginPath()
      ctx.arc(BOB_X, this.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = 'white'
      ctx.globalAlpha = flashOpacity * this.opacity
      ctx.fill()
    }
  }
}
