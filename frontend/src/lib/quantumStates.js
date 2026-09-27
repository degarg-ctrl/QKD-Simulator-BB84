const STATE_KEYS = {
  '+_0': 'rectilinearZero',
  '+_1': 'rectilinearOne',
  'x_0': 'diagonalPlus',
  'x_1': 'diagonalMinus',
}

export const BB84_STATES = {
  rectilinearZero: {
    key: 'rectilinearZero', basis: '+', bit: 0, angle: 0,
    ket: '|0⟩', shortLabel: 'H', basisLabel: 'Rectilinear',
    description: 'Bit 0 in the rectilinear basis, horizontal polarization at 0 degrees.',
  },
  rectilinearOne: {
    key: 'rectilinearOne', basis: '+', bit: 1, angle: 90,
    ket: '|1⟩', shortLabel: 'V', basisLabel: 'Rectilinear',
    description: 'Bit 1 in the rectilinear basis, vertical polarization at 90 degrees.',
  },
  diagonalPlus: {
    key: 'diagonalPlus', basis: 'x', bit: 0, angle: 45,
    ket: '|+⟩', shortLabel: 'D+', basisLabel: 'Diagonal',
    description: 'Bit 0 in the diagonal basis, polarization at 45 degrees.',
  },
  diagonalMinus: {
    key: 'diagonalMinus', basis: 'x', bit: 1, angle: 135,
    ket: '|−⟩', shortLabel: 'D−', basisLabel: 'Diagonal',
    description: 'Bit 1 in the diagonal basis, polarization at 135 degrees.',
  },
}

export const BB84_STATE_LIST = Object.values(BB84_STATES)

export function getBB84State(basis, bit) {
  const normalizedBasis = basis === '×' ? 'x' : basis
  const key = STATE_KEYS[`${normalizedBasis}_${Number(bit)}`]
  return key ? BB84_STATES[key] : null
}

export function getStateFromRecord(record) {
  if (!record || record.alice_bit == null || !record.alice_basis) return null
  return getBB84State(record.alice_basis, record.alice_bit)
}

export const UNKNOWN_QUANTUM_STATE = {
  key: 'unknown', ket: '?', shortLabel: '?', basisLabel: 'Unknown',
  angle: null,
  description: 'Quantum state unavailable or mixed; no definite polarization is inferred.',
}
