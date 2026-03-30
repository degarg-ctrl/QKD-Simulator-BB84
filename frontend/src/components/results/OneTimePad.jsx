/**
 * src/components/results/OneTimePad.jsx
 *
 * One-time pad encryption demonstration.
 * Uses the sifted key bits from simulation results
 * to encrypt and decrypt a user-provided message.
 *
 * Physics basis: BB84 key used as OTP key.
 * Perfect secrecy when: key is random, used once,
 * at least as long as the message. (Shannon, 1949)
 */

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'

function toBinary(char) {
  return char.charCodeAt(0).toString(2).padStart(8, '0')
}

function fromBinary(binary) {
  return String.fromCharCode(parseInt(binary, 2))
}

function xorBinary(a, b) {
  return a.split('').map((bit, i) => 
    bit === b[i] ? '0' : '1'
  ).join('')
}

function formatBinary(binary) {
  return binary.match(/.{1,4}/g)?.join(' ') || binary
}

export default function OneTimePad() {
  const { results } = useSimulationStore()
  const [message, setMessage] = useState('')

  // Extract key bits from sifted key
  // Use bob_bit from matched photons as the key
  const keyBits = useMemo(() => {
    if (!results?.bit_stream) return []
    return results.bit_stream
      .filter(p => p.match && !p.lost)
      .map(p => p.bob_bit)
  }, [results])

  const maxChars = Math.floor(keyBits.length / 8)

  const encryption = useMemo(() => {
    if (!message || keyBits.length < 8) return null

    const chars = message.slice(0, maxChars).split('')
    const rows = chars.map((char, i) => {
      const msgBinary = toBinary(char)
      const keySlice = keyBits
        .slice(i * 8, (i + 1) * 8)
        .join('')
      const encrypted = xorBinary(msgBinary, keySlice)
      const decrypted = fromBinary(
        xorBinary(encrypted, keySlice)
      )
      return {
        char,
        msgBinary,
        keySlice,
        encrypted,
        decrypted,
        ascii: char.charCodeAt(0)
      }
    })

    const encryptedFull = rows
      .map(r => r.encrypted).join(' ')
    const decryptedFull = rows
      .map(r => r.decrypted).join('')
    const isCorrect = decryptedFull === 
      message.slice(0, maxChars)

    return { rows, encryptedFull, decryptedFull, isCorrect }
  }, [message, keyBits, maxChars])

  if (!results || keyBits.length < 8) {
    return (
      <div className="p-4 rounded-lg text-center"
           style={{ 
             backgroundColor: 'var(--panel-dark)',
             border: '1px solid var(--border-color)'
           }}>
        <div className="text-[var(--text-muted)] text-sm font-mono">
          Run a simulation first to generate a key.
          Need at least 8 sifted key bits for encryption.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Key info */}
      <div className="flex items-center justify-between 
                      p-3 rounded-lg"
           style={{ 
             backgroundColor: '#00aacc15',
             border: '1px solid #00aacc30'
           }}>
        <div className="flex flex-col gap-0.5">
          <div className="text-xs font-mono text-[var(--text-muted)]">
            Sifted Key Available
          </div>
          <div className="text-lg font-mono font-bold 
                          text-quantum-blue">
            {keyBits.length} bits
          </div>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <div className="text-xs font-mono text-[var(--text-muted)]">
            Max message length
          </div>
          <div className="text-lg font-mono font-bold 
                          text-[var(--text-primary)]">
            {maxChars} characters
          </div>
        </div>
      </div>

      {/* Message input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-mono text-gray-400 
                          uppercase tracking-wider">
          Message to Encrypt (max {maxChars} chars)
        </label>
        <input
          type="text"
          value={message}
          onChange={e => 
            setMessage(e.target.value.slice(0, maxChars))
          }
          placeholder={`Enter up to ${maxChars} characters...`}
          className="px-3 py-2 rounded-lg text-sm font-mono
                     text-[var(--text-primary)] placeholder-[var(--text-subtle)]
                     outline-none transition-colors"
          style={{
            backgroundColor: 'var(--panel-dark)',
            border: '1px solid var(--border-color)',
          }}
          maxLength={maxChars}
        />
        <div className="text-xs font-mono text-[var(--text-subtle)]">
          {message.length}/{maxChars} characters used
          · {message.length * 8}/{keyBits.length} key bits consumed
        </div>
      </div>

      {/* Encryption table */}
      {encryption && message.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          {/* Per-character table */}
          <div className="overflow-auto rounded-lg"
               style={{ 
                 border: '1px solid var(--border-color)' 
               }}>
            <table className="w-full text-xs font-mono">
              <thead>
                <tr style={{ 
                  backgroundColor: 'var(--panel-dark)',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  {['Char', 'ASCII', 'Message (bin)', 
                    'Key bits', 'XOR Result', 
                    'Decrypted'].map(h => (
                    <th key={h} 
                        className="text-left px-3 py-2 
                                   text-gray-500 uppercase 
                                   tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {encryption.rows.map((row, i) => (
                  <tr key={i}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: i % 2 === 0 
                          ? 'var(--panel-bg)' : 'transparent'
                      }}>
                    <td className="px-3 py-2 text-[var(--text-primary)] 
                                   font-bold text-sm">
                      {row.char}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {row.ascii}
                    </td>
                    <td className="px-3 py-2 text-quantum-blue">
                      {formatBinary(row.msgBinary)}
                    </td>
                    <td className="px-3 py-2 text-yellow-500">
                      {formatBinary(row.keySlice)}
                    </td>
                    <td className="px-3 py-2 text-orange-400">
                      {formatBinary(row.encrypted)}
                    </td>
                    <td className="px-3 py-2 text-quantum-green 
                                   font-bold">
                      {row.decrypted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg"
                 style={{ 
                   backgroundColor: 'var(--panel-dark)',
                   border: '1px solid var(--border-color)'
                 }}>
              <div className="text-xs font-mono text-[var(--text-muted)] 
                              uppercase tracking-wider mb-1">
                Encrypted Message
              </div>
              <div className="text-xs font-mono text-orange-400 
                              break-all leading-relaxed">
                {encryption.encryptedFull}
              </div>
            </div>
            <div className="p-3 rounded-lg"
                 style={{
                   backgroundColor: encryption.isCorrect
                     ? '#00ff8815' : '#ff444415',
                   border: `1px solid ${encryption.isCorrect
                     ? '#00ff8840' : '#ff444440'}`
                 }}>
              <div className="text-xs font-mono uppercase 
                              tracking-wider mb-1"
                   style={{ 
                     color: encryption.isCorrect
                       ? '#00ff88' : '#ff4444' 
                   }}>
                Decrypted Message
              </div>
              <div className="text-lg font-mono font-bold 
                              text-[var(--text-primary)]">
                {encryption.decryptedFull}
                <span className="ml-2 text-sm"
                      style={{ 
                        color: encryption.isCorrect
                          ? '#00ff88' : '#ff4444' 
                      }}>
                  {encryption.isCorrect ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>

          {/* Theory note */}
          <div className="p-3 rounded-lg text-xs font-mono 
                          text-gray-500 leading-relaxed"
               style={{ 
                 backgroundColor: 'var(--panel-dark)',
                 border: '1px solid var(--border-color)'
               }}>
            <span className="text-[var(--text-muted)]">ℹ</span>
            {' '}XOR encryption with a random key is the 
            one-time pad — proven by Claude Shannon (1949) 
            to be information-theoretically secure when the 
            key is random, secret, used only once, and at 
            least as long as the message. BB84 provides 
            exactly such a key.
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Depends on: store/simulationStore.js
// Used by: pages/ResultsPage.jsx
