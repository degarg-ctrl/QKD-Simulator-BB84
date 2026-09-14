/**
 * src/components/canvas/PhotonParticle.js
 *
 * A single photon/pulse travelling Alice → Bob through ONE channel.
 *
 * BACKEND = SOURCE OF TRUTH.
 * Every scientifically meaningful property comes from the backend
 * PhotonRecord (event model v0.5.0):
 *   - BB84 state/polarization (Alice's encoding, Eve's re-emission)
 *   - fiber survival / loss position category
 *   - detector outcome (real detection / miss / dark count)
 *   - Eve interception & PNS split/block
 *   - WCP photon multiplicity
 * The particle NEVER randomizes physics. The only derived values are
 * VISUAL-ONLY and deterministic given the record (see
 * visualEncoding.js): lane assignment, fiber-loss position fraction,
 * and cosmetic animation phases.
 *
 * Visual language (see PHYSICS_CONTRACT "Visualization"):
 *   - Body color  = Alice's basis (cyan + / violet x)
 *   - Polarization line through the body = current state angle
 *   - WCP multiplicity = orbiting satellite dots (n−1 satellites)
 *   - Vacuum pulse = hollow dashed circle (no photon)
 *   - Fiber loss = grey fade + small X at the loss point
 *   - Detector miss = particle reaches Bob, hollow ring, no flash
 *   - Dark count = small white spark AT Bob (never travels)
 *   - Eve intercept = red halo + pause + angle transition to the
 *     BACKEND-provided eve_resend_angle
 *   - PNS split = pulse forks at Eve; Eve branch (red) rises to her
 *     node, Bob branch continues
 *   - PNS block = red X at Eve, particle dies there
 *   - Noise flip = brief amber wobble ring
 */

import {
  ALICE_X, BOB_X, EVE_X, LANE_Y_POSITIONS, NODE_RADIUS,
  PALETTE, classifyOutcome, basisColor, fiberLossFraction,
  phaseForIndex,
} from './visualEncoding'

// Frame-based effect durations (at 60fps reference)
const EVE_PAUSE_FRAMES = 26          // photon slows at Eve
const EVE_EFFECT_FRAMES = 30         // red halo expansion
const ARRIVAL_FLASH_FRAMES = 26      // Bob detection flash
const LOSS_FADE_FRAMES = 22          // fiber-loss fade-out
const DETECTOR_MISS_FRAMES = 20      // hollow-ring fade at Bob
const DARK_SPARK_FRAMES = 30         // dark-count spark at Bob
const NOISE_WOBBLE_FRAMES = 18       // amber wobble ring
const PNS_FORK_FRAMES = 34           // split branch animation
const PNS_BLOCK_FRAMES = 26          // block X animation

export class PhotonParticle {

  /**
   * @param {Object} record   Backend PhotonRecord (event model)
   * @param {number} laneIndex Visual lane (0|1|2) — one channel
   * @param {number} speed     Animation speed multiplier
   */
  constructor(record, laneIndex, speed = 1.0) {
    this.record = record
    this.laneIndex = laneIndex
    this.speed = Math.max(0.05, speed)

    // ── Outcome (backend authority) ────────────────────────────
    this.outcome = classifyOutcome(record)

    // ── Position ───────────────────────────────────────────────
    this.x = ALICE_X
    this.y = LANE_Y_POSITIONS[laneIndex]
    this.velocityX = 3.2 * this.speed

    // ── BB84 state (backend authority) ─────────────────────────
    // Alice's original encoding drives the pre-Eve visual.
    this.aliceAngle = record.alice_polarization_angle ??
      record.polarization_angle
    // The state in flight: starts as Alice's encoding; switches to
    // Eve's re-emitted angle (backend value) after passing Eve.
    this.currentAngle = this.aliceAngle
    this.baseColor = basisColor(record)

    // ── Eve interaction (backend authority) ────────────────────
    this.intercepted = !!record.intercepted
    this.eveResendAngle = record.eve_resend_angle ?? null
    this.hasPassedEve = false

    // ── WCP multiplicity (backend authority) ───────────────────
    this.photonCount = record.wcp_photon_count ?? 1
    this.isMulti = !!record.wcp_multi
    this.isVacuum = !!record.wcp_vacuum
    this.clusterPhase = phaseForIndex(record.index)

    // ── PNS (backend authority) ────────────────────────────────
    this.pnsSplit = !!record.pns_split
    this.pnsBlocked = !!record.pns_blocked

    // ── Noise (backend authority) ──────────────────────────────
    this.noiseFlipped = !!record.noise_flipped

    // ── Terminal positions (deterministic, visual-only) ────────
    // Fiber loss: the photon leaves the transmission path at a
    // deterministic position inside the fiber (visualization of the
    // backend fiber_survived outcome — NOT a physical position
    // measurement). After detaching it drifts diagonally out of the
    // channel envelope and fades.
    this.fiberLossX = ALICE_X + (BOB_X - ALICE_X) *
      fiberLossFraction(record.index)
    this.detached = false
    // Deterministic diagonal drift direction (visual-only): alternates
    // upwards (-1) and downwards (+1) away from the central single lane.
    this.driftDir = (Math.abs(record.index) % 2 === 0) ? -1 : 1

    // ── Lifecycle ──────────────────────────────────────────────
    // 'emitting' | 'travelling' | 'evePause' | 'fading' | 'arrived'
    // | 'detectorMiss' | 'darkSpark' | 'dead'
    this.state = 'travelling'
    this.opacity = 1.0
    this.radius = 7
    this.glowRadius = 14

    // ── Live event reporting flags ─────────────────────────────
    this.justLostInFiber = false
    this.justArrivedAtBob = false
    this.justEveIntercepted = false
    this._fiberLossReported = false
    this._arrivalReported = false
    this._eveReported = false

    // Effect timers (frames remaining)
    this.evePauseTimer = 0
    this.eveEffectTimer = 0
    this.arrivalFlashTimer = 0
    this.lossFadeTimer = 0
    this.detectorMissTimer = 0
    this.darkSparkTimer = 0
    this.noiseWobbleTimer = 0
    this.pnsForkTimer = 0
    this.pnsBlockTimer = 0

    // PNS fork branch positions (computed at Eve)
    this.forkBobX = 0
    this.forkEveX = 0
    this.forkEveY = 0

    // Dark counts never travel — they spark at Bob immediately.
    if (this.outcome === 'dark_count') {
      this.x = BOB_X
      this.state = 'darkSpark'
      this.darkSparkTimer = DARK_SPARK_FRAMES
    }

    // Vacuum pulses: nothing enters the channel. Show a brief hollow
    // pulse at Alice's aperture that immediately fades (the slot was
    // "sent" but contained no photon).
    if (this.outcome === 'vacuum') {
      this.state = 'fading'
      this.lossFadeTimer = LOSS_FADE_FRAMES
    }
  }

  /**
   * Advance one animation frame. Returns false when the particle is
   * dead and should be removed.
   */
  update() {
    if (this.state === 'dead') return false

    // ── Eve interaction ────────────────────────────────────────
    if (this.intercepted && !this.hasPassedEve && this.x >= EVE_X) {
      this.hasPassedEve = true
      this.justEveIntercepted = true
      this.state = 'evePause'
      this.evePauseTimer = EVE_PAUSE_FRAMES
      this.eveEffectTimer = EVE_EFFECT_FRAMES
      // Backend-authoritative state transition: the polarization
      // becomes Eve's re-emitted angle (never a frontend invention).
      if (this.eveResendAngle !== null) {
        this.currentAngle = this.eveResendAngle
      }
    }

    if (this.state === 'evePause') {
      // Photon slows to a near-stop at Eve (measurement moment)
      this.x += this.velocityX * 0.08
      this.evePauseTimer--
      if (this.evePauseTimer <= 0) {
        this.state = 'travelling'
      }
    } else if (this.state === 'travelling') {
      this.x += this.velocityX
    }

    // ── PNS fork at Eve ────────────────────────────────────────
    if (this.pnsSplit && !this.hasPassedEve && this.x >= EVE_X) {
      this.hasPassedEve = true
      this.state = 'travelling'  // Bob branch continues
      this.pnsForkTimer = PNS_FORK_FRAMES
      this.forkBobX = this.x
      this.forkEveX = this.x
      this.forkEveY = this.y
    }

    // ── PNS block at Eve ───────────────────────────────────────
    if (this.pnsBlocked && this.state === 'travelling'
      && this.x >= EVE_X) {
      this.x = EVE_X
      this.state = 'fading'
      this.pnsBlockTimer = PNS_BLOCK_FRAMES
      this.lossFadeTimer = LOSS_FADE_FRAMES
    }

    // ── Fiber loss ─────────────────────────────────────────────
    // At the loss point the photon DETACHES from the lane: it stops
    // progressing toward Bob and drifts diagonally out of the
    // channel envelope, fading as it leaves. The backend outcome
    // (fiber_survived=false) is authoritative; the detach position
    // is a deterministic visualization of that outcome.
    if (this.outcome === 'fiber_loss' && this.state === 'travelling'
      && this.x >= this.fiberLossX) {
      this.x = this.fiberLossX
      this.state = 'fading'
      this.detached = true
      this.justLostInFiber = true
      this.lossFadeTimer = LOSS_FADE_FRAMES
    }

    // Detached drift: move away from the channel while fading
    if (this.state === 'fading' && this.detached) {
      this.x += this.velocityX * 0.35   // slight forward momentum
      this.y += this.driftDir * 1.6     // diagonal exit
    }

    // ── Arrival at Bob ─────────────────────────────────────────
    if (this.state === 'travelling' && this.x >= BOB_X) {
      this.x = BOB_X
      this.justArrivedAtBob = true
      if (this.outcome === 'detected') {
        this.state = 'arrived'
        this.arrivalFlashTimer = ARRIVAL_FLASH_FRAMES
      } else if (this.outcome === 'detector_loss') {
        this.state = 'detectorMiss'
        this.detectorMissTimer = DETECTOR_MISS_FRAMES
      }
    }

    // ── Countdowns / fades ─────────────────────────────────────
    if (this.eveEffectTimer > 0) this.eveEffectTimer--
    if (this.noiseWobbleTimer > 0) this.noiseWobbleTimer--
    if (this.pnsForkTimer > 0) this.pnsForkTimer--
    if (this.pnsBlockTimer > 0) this.pnsBlockTimer--

    // Noise wobble triggers when the flip becomes observable —
    // mid-flight after Eve (or mid-channel without Eve).
    if (this.noiseFlipped && this.noiseWobbleTimer === 0 &&
      this.state === 'travelling' &&
      this.x > EVE_X * 0.5 && this.x < BOB_X - 40 &&
      !this._wobbleFired) {
      this.noiseWobbleTimer = NOISE_WOBBLE_FRAMES
      this._wobbleFired = true
    }

    if (this.state === 'fading') {
      this.lossFadeTimer--
      this.opacity = Math.max(0, this.lossFadeTimer / LOSS_FADE_FRAMES)
      if (this.lossFadeTimer <= 0) {
        this.state = 'dead'
        return false
      }
    }

    if (this.state === 'arrived') {
      this.arrivalFlashTimer--
      this.opacity = Math.max(0,
        this.arrivalFlashTimer / ARRIVAL_FLASH_FRAMES)
      if (this.arrivalFlashTimer <= 0) {
        this.state = 'dead'
        return false
      }
    }

    if (this.state === 'detectorMiss') {
      this.detectorMissTimer--
      this.opacity = Math.max(0,
        this.detectorMissTimer / DETECTOR_MISS_FRAMES)
      if (this.detectorMissTimer <= 0) {
        this.state = 'dead'
        return false
      }
    }

    if (this.state === 'darkSpark') {
      this.darkSparkTimer--
      this.opacity = Math.max(0,
        this.darkSparkTimer / DARK_SPARK_FRAMES)
      if (this.darkSparkTimer <= 0) {
        this.state = 'dead'
        return false
      }
    }

    return true
  }

  /**
   * Draw the particle onto a canvas context.
   */
  draw(ctx) {
    if (this.state === 'dead' || this.opacity <= 0) return

    ctx.save()
    ctx.globalAlpha = this.opacity

    // Layered rendering
    this._drawGlow(ctx)
    this._drawBody(ctx)
    this._drawPolarization(ctx)
    if (this.isMulti) this._drawCluster(ctx)
    if (this.eveEffectTimer > 0) this._drawEveEffect(ctx)
    if (this.noiseWobbleTimer > 0) this._drawNoiseWobble(ctx)
    if (this.pnsForkTimer > 0) this._drawPnsFork(ctx)
    if (this.pnsBlockTimer > 0) this._drawPnsBlock(ctx)
    if (this.state === 'arrived') this._drawArrivalFlash(ctx)
    if (this.state === 'detectorMiss') this._drawDetectorMiss(ctx)
    if (this.state === 'darkSpark') this._drawDarkSpark(ctx)
    if (this.state === 'fading' && this.outcome === 'fiber_loss') {
      this._drawLossMark(ctx)
    }

    ctx.restore()
  }

  // ── Body & state ────────────────────────────────────────────

  _drawGlow(ctx) {
    const color = this.outcome === 'fiber_loss' ||
      this.outcome === 'vacuum'
      ? PALETTE.fiberLoss
      : this.baseColor
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.glowRadius, 0, Math.PI * 2)
    ctx.fillStyle = color + '26'
    ctx.fill()
  }

  _drawBody(ctx) {
    if (this.isVacuum) {
      // Vacuum pulse: hollow dashed circle — the slot carried no photon
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = PALETTE.vacuum
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.setLineDash([])
      return
    }

    // White outline ring
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Filled body (basis color)
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.baseColor
    ctx.fill()
  }

  /**
   * Polarization line through the particle — the BB84 state angle
   * currently in flight (Alice's encoding, or Eve's re-emission).
   */
  _drawPolarization(ctx) {
    if (this.isVacuum) return
    const angleRad = (this.currentAngle * Math.PI) / 180
    const lineLength = 17
    const dx = Math.cos(angleRad) * lineLength / 2
    const dy = Math.sin(angleRad) * lineLength / 2

    ctx.beginPath()
    ctx.moveTo(this.x - dx, this.y - dy)
    ctx.lineTo(this.x + dx, this.y + dy)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()

    // Small end caps for readability
    ctx.beginPath()
    ctx.arc(this.x - dx, this.y - dy, 1.4, 0, Math.PI * 2)
    ctx.arc(this.x + dx, this.y + dy, 1.4, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
  }

  /**
   * WCP multiplicity: n−1 satellite dots orbiting the core — the
   * pulse is a multi-photon CLUSTER, not a single photon.
   */
  _drawCluster(ctx) {
    const satellites = Math.min(this.photonCount - 1, 4)
    if (satellites <= 0) return
    const orbit = this.radius + 5
    for (let i = 0; i < satellites; i++) {
      const a = this.clusterPhase + (i * 2 * Math.PI / satellites)
      const sx = this.x + Math.cos(a) * orbit
      const sy = this.y + Math.sin(a) * orbit * 0.6
      ctx.beginPath()
      ctx.arc(sx, sy, 2.4, 0, Math.PI * 2)
      ctx.fillStyle = this.baseColor
      ctx.fill()
    }
  }

  // ── Interaction effects ─────────────────────────────────────

  /**
   * Eve intercept-resend: red halo rings expanding around the photon
   * at the measurement moment (retained & improved classic effect).
   */
  _drawEveEffect(ctx) {
    const progress = 1 - (this.eveEffectTimer / EVE_EFFECT_FRAMES)
    const ringRadius = this.radius + progress * 26
    const ringOpacity = (1 - progress) * 0.9

    ctx.beginPath()
    ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2)
    ctx.strokeStyle = PALETTE.eve
    ctx.globalAlpha = ringOpacity * this.opacity
    ctx.lineWidth = 3
    ctx.shadowColor = PALETTE.eve
    ctx.shadowBlur = 14
    ctx.stroke()
    ctx.shadowBlur = 0

    const r2 = this.radius + progress * 12
    const o2 = (1 - progress) * 0.6
    ctx.beginPath()
    ctx.arc(this.x, this.y, r2, 0, Math.PI * 2)
    ctx.strokeStyle = '#fca5a5'
    ctx.globalAlpha = o2 * this.opacity
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.globalAlpha = this.opacity
  }

  /**
   * Channel noise: brief amber wobble ring — clearly distinct from
   * Eve's red halo. The bit result itself is backend-authoritative.
   */
  _drawNoiseWobble(ctx) {
    const progress = 1 - (this.noiseWobbleTimer / NOISE_WOBBLE_FRAMES)
    const wobble = Math.sin(progress * Math.PI * 6) * 2.5
    const r = this.radius + 6 + wobble
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.strokeStyle = PALETTE.noise
    ctx.globalAlpha = (1 - progress) * 0.7 * this.opacity
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = this.opacity
  }

  /**
   * PNS split: at Eve the pulse forks — one branch rises to Eve's
   * node (her retained copy), the other continues toward Bob.
   */
  _drawPnsFork(ctx) {
    const progress = 1 - (this.pnsForkTimer / PNS_FORK_FRAMES)
    const ease = 1 - Math.pow(1 - progress, 2)  // ease-out

    // Eve branch: from fork point up to Eve's node
    const ex = EVE_X
    const ey = LANE_Y_POSITIONS[1] - NODE_RADIUS - 6  // just above Eve
    const bx = this.forkEveX + (ex - this.forkEveX) * ease
    const by = this.forkEveY + (ey - this.forkEveY) * ease

    ctx.beginPath()
    ctx.moveTo(this.forkEveX, this.forkEveY)
    ctx.lineTo(bx, by)
    ctx.strokeStyle = PALETTE.pns
    ctx.lineWidth = 2
    ctx.setLineDash([5, 4])
    ctx.stroke()
    ctx.setLineDash([])

    // Eve's retained copy dot
    ctx.beginPath()
    ctx.arc(bx, by, 4, 0, Math.PI * 2)
    ctx.fillStyle = PALETTE.pns
    ctx.fill()

    // Faint guide arc showing the fork geometry
    ctx.beginPath()
    ctx.arc(this.forkEveX, this.forkEveY, 10 + ease * 14,
      -Math.PI / 2, 0)
    ctx.strokeStyle = PALETTE.pns + '55'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  /**
   * PNS block: red X at Eve — the single photon was swallowed there.
   */
  _drawPnsBlock(ctx) {
    const progress = 1 - (this.pnsBlockTimer / PNS_BLOCK_FRAMES)
    const size = 8 + progress * 6
    const alpha = (1 - progress) * this.opacity
    ctx.strokeStyle = PALETTE.pns
    ctx.lineWidth = 2.5
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.moveTo(this.x - size, this.y - size)
    ctx.lineTo(this.x + size, this.y + size)
    ctx.moveTo(this.x + size, this.y - size)
    ctx.lineTo(this.x - size, this.y + size)
    ctx.stroke()
    ctx.globalAlpha = this.opacity
  }

  // ── Terminal effects ────────────────────────────────────────

  /**
   * Fiber loss: small grey X at the absorption point inside the
   * fiber (distinct from Eve's red X — this is the channel itself).
   */
  _drawLossMark(ctx) {
    const size = 6
    ctx.strokeStyle = PALETTE.fiberLoss
    ctx.lineWidth = 2
    ctx.globalAlpha = this.opacity * 0.9
    ctx.beginPath()
    ctx.moveTo(this.x - size, this.y - size)
    ctx.lineTo(this.x + size, this.y + size)
    ctx.moveTo(this.x + size, this.y - size)
    ctx.lineTo(this.x - size, this.y + size)
    ctx.stroke()
    ctx.globalAlpha = this.opacity
  }

  /**
   * Bob detection: layered rings — green for basis match (sifted
   * candidate), amber for basis mismatch (discarded at sifting).
   */
  _drawArrivalFlash(ctx) {
    const progress = 1 - (this.arrivalFlashTimer / ARRIVAL_FLASH_FRAMES)
    const isMatch = this.record.match
    const ringColor = isMatch ? PALETTE.detected : PALETTE.mismatch

    const r1 = NODE_RADIUS + progress * 12
    ctx.beginPath()
    ctx.arc(BOB_X, this.y, r1, 0, Math.PI * 2)
    ctx.strokeStyle = ringColor
    ctx.globalAlpha = (1 - progress) * 0.9 * this.opacity
    ctx.lineWidth = 2.5
    ctx.stroke()

    const r2 = NODE_RADIUS + progress * 22
    ctx.beginPath()
    ctx.arc(BOB_X, this.y, r2, 0, Math.PI * 2)
    ctx.strokeStyle = ringColor
    ctx.globalAlpha = (1 - progress) * 0.5 * this.opacity
    ctx.lineWidth = 1.5
    ctx.stroke()

    if (progress < 0.3) {
      const flashOpacity = (0.3 - progress) / 0.3
      ctx.beginPath()
      ctx.arc(BOB_X, this.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = 'white'
      ctx.globalAlpha = flashOpacity * this.opacity
      ctx.fill()
    }
    ctx.globalAlpha = this.opacity
  }

  /**
   * Detector miss: the photon REACHED Bob but the detector didn't
   * fire — hollow grey ring at the detector, no flash.
   */
  _drawDetectorMiss(ctx) {
    const progress = 1 - (this.detectorMissTimer / DETECTOR_MISS_FRAMES)
    ctx.beginPath()
    ctx.arc(BOB_X, this.y, this.radius + progress * 8, 0, Math.PI * 2)
    ctx.strokeStyle = PALETTE.detectorMiss
    ctx.globalAlpha = (1 - progress) * 0.8 * this.opacity
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = this.opacity
  }

  /**
   * Dark count: a spurious click AT the detector — small white spark
   * with radiating ticks. It never travels from Alice.
   */
  _drawDarkSpark(ctx) {
    const progress = 1 - (this.darkSparkTimer / DARK_SPARK_FRAMES)
    const alpha = (1 - progress) * this.opacity

    // Core spark
    ctx.beginPath()
    ctx.arc(BOB_X, this.y, 3.5 + progress * 2, 0, Math.PI * 2)
    ctx.fillStyle = PALETTE.darkCount
    ctx.globalAlpha = alpha
    ctx.fill()

    // Radiating ticks
    ctx.strokeStyle = PALETTE.darkCount
    ctx.lineWidth = 1.5
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4
      const inner = 6 + progress * 6
      const outer = inner + 5
      ctx.beginPath()
      ctx.moveTo(BOB_X + Math.cos(a) * inner, this.y + Math.sin(a) * inner)
      ctx.lineTo(BOB_X + Math.cos(a) * outer, this.y + Math.sin(a) * outer)
      ctx.stroke()
    }
    ctx.globalAlpha = this.opacity
  }
}
