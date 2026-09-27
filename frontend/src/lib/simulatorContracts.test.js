import { describe, expect, it } from 'vitest'
import { normalizeLandingPreset } from './landingPreset'
import { getOtpDemoState } from './otpDemo'
import { getDetectorTelemetry } from './detectorTelemetry'

describe('landing preset normalization', () => {
  it('maps realistic decoy shortcuts to the store and API vocabulary', () => {
    const { sourceModel, params } = normalizeLandingPreset({
      n_bits: 2000,
      source_model: 'realistic',
      mu: 0.5,
      decoy_enabled: true,
      attack_strategy: 'pns',
    })

    expect(sourceModel).toBe('realistic')
    expect(params.wcp_enabled).toBe(true)
    expect(params.mean_photon_number).toBe(0.5)
    expect(params.decoy_enabled).toBe(true)
    expect(params).not.toHaveProperty('source_model')
    expect(params).not.toHaveProperty('mu')
  })

  it('resets omitted values so previous scenario state cannot leak', () => {
    const { sourceModel, params } = normalizeLandingPreset({
      n_bits: 50,
      distance_km: 5,
    })

    expect(sourceModel).toBe('ideal')
    expect(params.attack_prob).toBe(0)
    expect(params.attack_strategy).toBe('intercept_resend')
    expect(params.wcp_enabled).toBe(false)
    expect(params.decoy_enabled).toBe(false)
  })
})

describe('detector telemetry contract', () => {
  it('shows ideal detector values for the ideal source model', () => {
    expect(getDetectorTelemetry(false)).toEqual({
      sensor: 'Ideal detector model',
      efficiency: 'η = 100%',
      darkCount: '0 / gate',
    })
  })

  it('shows the modeled SPAD values for realistic WCP runs', () => {
    expect(getDetectorTelemetry(true)).toEqual({
      sensor: 'InGaAs SPAD model',
      efficiency: 'η = 85%',
      darkCount: '10⁻⁵ / gate',
    })
  })
})

describe('OTP result contract', () => {
  it('uses only the backend post-sampling key', () => {
    const state = getOtpDemoState({
      otp_demo_allowed: true,
      post_sample_key: [1, 0, 1, 0, 1, 0, 1, 0],
      bit_stream: [{ bob_bit: 0 }, { bob_bit: 0 }],
    })

    expect(state.allowed).toBe(true)
    expect(state.keyBits).toEqual([1, 0, 1, 0, 1, 0, 1, 0])
  })

  it('preserves the backend security block reason', () => {
    const state = getOtpDemoState({
      otp_demo_allowed: false,
      otp_demo_block_reason: 'QBER not estimated',
      post_sample_key: [],
    })

    expect(state.allowed).toBe(false)
    expect(state.reason).toBe('QBER not estimated')
  })
})
