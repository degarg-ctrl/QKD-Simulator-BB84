/**
 * Photon input table for Exp 2 and Exp 4.
 * User configures up to 20 photons manually.
 * Each row: bit toggle (0/1) + basis toggle (+/x) + 
 * auto-computed state label.
 */

import { useState, useCallback } from 'react'

// State label lookup per BB84 rules
const STATE_LABELS = {
  '+_0': { label: '|0⟩', angle: '0°' },
  '+_1': { label: '|1⟩', angle: '90°' },
  'x_0': { label: '|+⟩', angle: '45°' },
  'x_1': { label: '|-⟩', angle: '135°' },
}

const BASIS_COLORS = {
  '+': '#6366f1',
  'x': '#a855f7'
}

const DEFAULT_PHOTON = { bit: 0, basis: '+' }

export default function PhotonInputTable({ 
  onChange,      // callback: (bits, bases) => void
  maxPhotons = 20,
  initialCount = 8
}) {
  const [photons, setPhotons] = useState(() =>
    Array(initialCount).fill(null).map(() => ({ ...DEFAULT_PHOTON }))
  )

  const updatePhoton = useCallback((index, field, value) => {
    setPhotons(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      const bits = next.map(p => p.bit)
      const bases = next.map(p => p.basis)
      onChange(bits, bases)
      return next
    })
  }, [onChange])

  const addPhoton = useCallback(() => {
    if (photons.length >= maxPhotons) return
    setPhotons(prev => {
      const next = [...prev, { ...DEFAULT_PHOTON }]
      onChange(next.map(p => p.bit), next.map(p => p.basis))
      return next
    })
  }, [photons.length, maxPhotons, onChange])

  const removePhoton = useCallback((index) => {
    if (photons.length <= 1) return
    setPhotons(prev => {
      const next = prev.filter((_, i) => i !== index)
      onChange(next.map(p => p.bit), next.map(p => p.basis))
      return next
    })
  }, [photons.length, onChange])

  const randomizeAll = useCallback(() => {
    const next = photons.map(() => ({
      bit: Math.random() < 0.5 ? 0 : 1,
      basis: Math.random() < 0.5 ? '+' : 'x'
    }))
    setPhotons(next)
    onChange(next.map(p => p.bit), next.map(p => p.basis))
  }, [photons.length, onChange])

  const clearAll = useCallback(() => {
    const next = photons.map(() => ({ ...DEFAULT_PHOTON }))
    setPhotons(next)
    onChange(next.map(p => p.bit), next.map(p => p.basis))
  }, [photons.length, onChange])

  return (
    <div className="flex flex-col gap-3">
      {/* Table */}
      <div className="overflow-auto max-h-64 rounded-lg 
                      border border-gray-800">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-gray-950">
            <tr className="border-b border-gray-800">
              <th className="text-left px-3 py-2 text-gray-500 
                             w-8">#</th>
              <th className="text-left px-3 py-2 text-gray-500">
                Bit
              </th>
              <th className="text-left px-3 py-2 text-gray-500">
                Basis
              </th>
              <th className="text-left px-3 py-2 text-gray-500">
                State
              </th>
              <th className="w-6"></th>
            </tr>
          </thead>
          <tbody>
            {photons.map((photon, i) => {
              const stateKey = `${photon.basis}_${photon.bit}`
              const stateInfo = STATE_LABELS[stateKey]
              return (
                <tr key={i} 
                    className="border-b border-gray-900/50 
                               hover:bg-gray-900/30">
                  <td className="px-3 py-1.5 text-gray-600">
                    {i + 1}
                  </td>
                  {/* Bit toggle */}
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1">
                      {[0, 1].map(val => (
                        <button
                          key={val}
                          onClick={() => updatePhoton(i, 'bit', val)}
                          className={`w-7 h-6 rounded text-xs 
                                     font-mono font-bold border
                                     transition-colors
                                     ${photon.bit === val
                                       ? 'bg-quantum-blue border-quantum-blue text-white'
                                       : 'border-gray-700 text-gray-500 hover:text-gray-300'
                                     }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </td>
                  {/* Basis toggle */}
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1">
                      {['+', 'x'].map(val => (
                        <button
                          key={val}
                          onClick={() => updatePhoton(i, 'basis', val)}
                          className={`w-7 h-6 rounded text-xs 
                                     font-mono font-bold border
                                     transition-colors
                                     ${photon.basis === val
                                       ? 'border-transparent text-white'
                                       : 'border-gray-700 text-gray-500 hover:text-gray-300'
                                     }`}
                          style={photon.basis === val ? {
                            backgroundColor: BASIS_COLORS[val] + '30',
                            borderColor: BASIS_COLORS[val],
                            color: BASIS_COLORS[val]
                          } : {}}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </td>
                  {/* Auto state label */}
                  <td className="px-3 py-1.5">
                    <span style={{ 
                      color: BASIS_COLORS[photon.basis] 
                    }}>
                      {stateInfo?.label}
                    </span>
                    <span className="text-gray-600 ml-1">
                      at {stateInfo?.angle}
                    </span>
                  </td>
                  {/* Remove button */}
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => removePhoton(i)}
                      disabled={photons.length <= 1}
                      className="text-gray-700 hover:text-red-400
                                 disabled:opacity-30 transition-colors"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={addPhoton}
          disabled={photons.length >= maxPhotons}
          className="flex items-center gap-1 px-3 py-1.5 
                     text-xs font-mono border border-gray-700
                     text-gray-400 hover:text-white 
                     hover:border-gray-500 rounded
                     disabled:opacity-30 transition-colors"
        >
          + Add Photon
          <span className="text-gray-600">
            ({photons.length}/{maxPhotons})
          </span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={randomizeAll}
            className="px-3 py-1.5 text-xs font-mono 
                       border border-gray-700 text-gray-400
                       hover:text-white hover:border-gray-500 
                       rounded transition-colors"
          >
            Randomize
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs font-mono
                       border border-gray-700 text-gray-400
                       hover:text-red-400 hover:border-red-800
                       rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
