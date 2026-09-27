import { describe, expect, it } from 'vitest'

import {
  filterBitStream,
  getFullFilterCount,
  isLostRecord,
} from './bitStreamFilters'

describe('Results bit-stream filters', () => {
  const records = [
    { index: 0, fiber_survived: false, detector_loss: false },
    { index: 1, fiber_survived: true, detector_loss: true },
    { index: 2, fiber_survived: true, detector_loss: false, pns_blocked: true },
    { index: 3, fiber_survived: false, detector_loss: false, wcp_vacuum: true },
    { index: 4, fiber_survived: true, detector_loss: false, bob_bit: 1 },
  ]

  it('includes detector misses with all other photon-loss outcomes', () => {
    expect(records.map(isLostRecord)).toEqual([true, true, true, true, false])
    expect(filterBitStream(records, 'lost').map((record) => record.index))
      .toEqual([0, 1, 2, 3])
  })

  it('counts detector misses in the complete Lost total', () => {
    const transmission = {
      generated: 100,
      fiber_lost: 12,
      vacuum_pulses: 5,
      pns_blocked: 3,
      detector_loss: 7,
    }
    expect(getFullFilterCount(
      'lost', transmission, { sifted_key_length: 0 }, 0,
    )).toBe(27)
  })
})
