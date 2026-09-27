import { describe, expect, it } from 'vitest'
import {
  getQberConfidenceStatusLabel,
  getQberPresentation,
} from './qberPresentation'

function resultFor(sifted, errors) {
  const bitStream = Array.from({ length: sifted }, (_, index) => ({
    alice_bit: index < errors ? 1 : 0,
    bob_bit: 0,
    bob_basis: '+',
    sifted: true,
  }))
  return {
    qber: null,
    qber_estimated: false,
    skr: 0,
    sifted_key_length: sifted,
    raw_key_length: 100,
    bit_stream: bitStream,
  }
}

describe('QBER presentation fallback', () => {
  it('derives the very-low tier for fewer than 20 sifted bits', () => {
    const view = getQberPresentation(resultFor(10, 2))
    expect(view.qber).toBeCloseTo(0.2)
    expect(view.confidence).toBe('very_low')
    expect(view.sampleSize).toBe(10)
    expect(view.sampleErrors).toBe(2)
    expect(view.isDerivedPreview).toBe(true)
  })

  it('derives the low tier from 20 through 99 sifted bits', () => {
    const view = getQberPresentation(resultFor(20, 1))
    expect(view.qber).toBeCloseTo(0.05)
    expect(view.confidence).toBe('low')
    expect(view.skr).toBeGreaterThan(0)
  })

  it('keeps the official sampled fields when they are present', () => {
    const view = getQberPresentation({
      qber: 1 / 12,
      qber_estimated: true,
      skr: 0.1,
      qber_sample_size: 12,
      qber_sample_errors: 1,
      qber_full_sifted_errors: 5,
      sifted_key_length: 121,
      raw_key_length: 1000,
    })
    expect(view.qber).toBeCloseTo(1 / 12)
    expect(view.skr).toBe(0.1)
    expect(view.sampleSize).toBe(12)
    expect(view.fullErrors).toBe(5)
  })

  it('maps preview confidence to the compact status-chip labels', () => {
    expect(getQberConfidenceStatusLabel('very_low')).toBe('VERY LOW CONFIDENCE')
    expect(getQberConfidenceStatusLabel('low')).toBe('LOW CONFIDENCE')
  })
})
