import { describe, expect, it } from 'vitest'
import { BB84_STATE_LIST, getBB84State, getStateFromRecord } from './quantumStates'

describe('shared BB84 state descriptors', () => {
  it('maps all canonical basis/bit pairs exactly once', () => {
    expect(BB84_STATE_LIST.map(({ basis, bit, angle, ket }) => ({ basis, bit, angle, ket }))).toEqual([
      { basis: '+', bit: 0, angle: 0, ket: '|0⟩' },
      { basis: '+', bit: 1, angle: 90, ket: '|1⟩' },
      { basis: 'x', bit: 0, angle: 45, ket: '|+⟩' },
      { basis: 'x', bit: 1, angle: 135, ket: '|−⟩' },
    ])
  })

  it('normalizes the multiplication-sign basis without inventing missing state', () => {
    expect(getBB84State('×', 1)?.ket).toBe('|−⟩')
    expect(getBB84State('?', 0)).toBeNull()
    expect(getStateFromRecord(null)).toBeNull()
  })
})
