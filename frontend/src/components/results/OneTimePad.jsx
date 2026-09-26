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

  const PRESET_MESSAGES = ['QUANTUM', 'SECURE', 'BB84', 'KEY']

  if (!results || keyBits.length < 8) {
    return (
      <div
        className="p-4 rounded text-center select-none"
        style={{
          backgroundColor: 'var(--q-surface-1, #1a1a1e)',
          border: '1px solid var(--q-border, #34343d)'
        }}
      >
        <div className="text-[var(--q-text-muted,#94a3b8)] text-sm font-body">
          Run a simulation first to generate a sifted key.
          At least 8 sifted key bits are required for one-time pad encryption.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Key telemetry banner */}
      <div
        className="flex items-center justify-between p-3.5 rounded"
        style={{
          backgroundColor: 'var(--q-surface-1, #1a1a1e)',
          border: '1px solid var(--q-border, #34343d)'
        }}
      >
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] font-body uppercase tracking-wider text-[var(--q-text-dim,#64748b)] font-semibold">
            SIFTED QUANTUM KEY AVAILABLE
          </div>
          <div className="text-xl font-mono tabular-nums font-bold text-[var(--q-accent-cyan,#38bdf8)]">
            {keyBits.length} <span className="font-body text-xs font-normal text-[var(--q-text-muted)]">bits</span>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <div className="text-[11px] font-body uppercase tracking-wider text-[var(--q-text-dim,#64748b)] font-semibold">
            MAX PAYLOAD CAPACITY
          </div>
          <div className="text-xl font-mono tabular-nums font-bold text-[var(--q-text-bright,#f1f5f9)]">
            {maxChars} <span className="font-body text-xs font-normal text-[var(--q-text-muted)]">ASCII chars</span>
          </div>
        </div>
      </div>

      {/* Message input & Quick Presets */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-body font-semibold text-[var(--q-text-dim,#64748b)] uppercase tracking-wider">
            PLAINTEXT MESSAGE (MAX {maxChars} CHARS)
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-body font-semibold text-[var(--q-text-dim,#64748b)] mr-1">PRESETS:</span>
            {PRESET_MESSAGES.map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setMessage(preset.slice(0, maxChars))}
                disabled={preset.length > maxChars}
                className="px-2 py-0.5 text-[10px] font-body font-medium rounded transition-colors hover:text-[var(--q-text-bright,#f1f5f9)] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--q-surface-2, #222227)',
                  border: '1px solid var(--q-border-subtle, #282830)',
                  color: 'var(--q-text-muted, #94a3b8)'
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, maxChars))}
          placeholder={maxChars > 0 ? `Enter message (e.g. QUANTUM)...` : `Need more sifted bits...`}
          className="px-3.5 py-2.5 rounded text-sm font-mono outline-none transition-colors"
          style={{
            backgroundColor: 'var(--q-surface-0, #131317)',
            border: '1px solid var(--q-border, #34343d)',
            color: 'var(--q-text-bright, #f1f5f9)',
          }}
          maxLength={maxChars}
        />
        <div className="flex items-center justify-between text-[11px] font-body text-[var(--q-text-dim,#64748b)]">
          <span><span className="font-mono tabular-nums">{message.length}</span>/<span className="font-mono tabular-nums">{maxChars}</span> characters entered</span>
          <span><span className="font-mono tabular-nums">{message.length * 8}</span>/<span className="font-mono tabular-nums">{keyBits.length}</span> key bits consumed</span>
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
          <div
            className="overflow-auto rounded"
            style={{
              backgroundColor: 'var(--q-surface-1, #1a1a1e)',
              border: '1px solid var(--q-border, #34343d)'
            }}
          >
            <table className="w-full text-xs font-mono">
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--q-surface-2, #222227)',
                    borderBottom: '1px solid var(--q-border-subtle, #282830)'
                  }}
                >
                  {['CHAR', 'ASCII', 'PLAINTEXT BITS (M)', 'KEY BITS (K)', 'CIPHERTEXT (M ⊕ K)', 'DECRYPTED'].map(h => (
                    <th
                      key={h}
                      className="text-left px-3.5 py-2.5 text-[var(--q-text-dim,#64748b)] uppercase tracking-wider text-[11px]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {encryption.rows.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid var(--q-border-subtle, #282830)',
                      backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                    }}
                  >
                    <td className="px-3.5 py-2 text-[var(--q-text-bright,#f1f5f9)] font-bold text-sm">
                      {row.char}
                    </td>
                    <td className="px-3.5 py-2 text-[var(--q-text-muted,#94a3b8)]">
                      {row.ascii}
                    </td>
                    <td className="px-3.5 py-2 text-[var(--q-accent-cyan,#38bdf8)]">
                      {formatBinary(row.msgBinary)}
                    </td>
                    <td className="px-3.5 py-2 text-[var(--q-accent-amber,#f59e0b)]">
                      {formatBinary(row.keySlice)}
                    </td>
                    <td className="px-3.5 py-2 text-[var(--q-text-bright,#f1f5f9)] font-semibold">
                      {formatBinary(row.encrypted)}
                    </td>
                    <td className="px-3.5 py-2 text-[var(--q-accent-emerald,#10b981)] font-bold">
                      {row.decrypted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ciphertext and Decrypted Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-3.5 rounded flex flex-col gap-1"
              style={{
                backgroundColor: 'var(--q-surface-1, #1a1a1e)',
                border: '1px solid var(--q-border, #34343d)'
              }}
            >
              <div className="text-[10px] font-body uppercase tracking-wider text-[var(--q-text-dim,#64748b)] font-semibold">
                TRANSMITTED CIPHERTEXT (C = M ⊕ K)
              </div>
              <div className="text-xs font-mono text-[var(--q-text-bright,#f1f5f9)] break-all leading-relaxed font-semibold">
                {encryption.encryptedFull}
              </div>
            </div>
            <div
              className="p-3.5 rounded flex flex-col gap-1"
              style={{
                backgroundColor: 'var(--q-surface-1, #1a1a1e)',
                border: '1px solid var(--q-border, #34343d)'
              }}
            >
              <div className="text-[10px] font-body uppercase tracking-wider text-[var(--q-text-dim,#64748b)] font-semibold">
                DECRYPTED MESSAGE (M = C ⊕ K)
              </div>
              <div className="text-base font-mono font-bold text-[var(--q-accent-emerald,#10b981)] flex items-center gap-2">
                <span>{encryption.decryptedFull}</span>
                <span className="text-xs px-2 py-0.5 rounded font-normal font-body bg-[var(--q-surface-2,#222227)] border border-[var(--q-accent-emerald,#10b981)]/40">
                  {encryption.isCorrect ? '✓ VERIFIED MATCH' : '✕ CORRUPTED'}
                </span>
              </div>
            </div>
          </div>

          {/* Theoretical Security Note */}
          <div
            className="p-3 rounded text-[11px] font-body leading-relaxed"
            style={{
              backgroundColor: 'var(--q-surface-0, #131317)',
              border: '1px solid var(--q-border-subtle, #282830)',
              color: 'var(--q-text-muted, #94a3b8)'
            }}
          >
            <span className="text-[var(--q-accent-cyan,#38bdf8)] font-bold">SHANNON PERFECT SECRECY:</span>
            {' '}XOR encryption using a truly random quantum key provides information-theoretic security (Shannon, 1949). Because the key is generated via quantum mechanical measurements (BB84) and used only once, an adversary with infinite computing power cannot extract any plaintext information from the ciphertext.
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Depends on: store/simulationStore.js
// Used by: pages/ResultsPage.jsx

