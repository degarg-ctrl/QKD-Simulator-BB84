/**
 * Frontend-only QBER display fallback.
 *
 * New backends provide qber_preview and its confidence tier directly. This
 * helper derives the same diagnostic value from the complete detected table
 * for older backend responses, but only when the sifted count is below the
 * official 100-bit floor. It never changes qber_estimated or the certified
 * SKR/security fields.
 */

const OFFICIAL_MIN_SIFTED_COUNT = 100

function binaryEntropy(q) {
  if (q <= 0 || q >= 1) return 0
  return -q * Math.log2(q) - (1 - q) * Math.log2(1 - q)
}

function previewSkr(sifted, raw, qber) {
  if (!Number.isFinite(qber) || raw <= 0 || qber >= 0.11) return 0
  return Math.max(0, (sifted / raw) * (1 - 2 * binaryEntropy(qber)))
}

function deriveSiftedCounts(results) {
  const rows = Array.isArray(results?.bit_stream)
    ? results.bit_stream.filter((row) => (
      row?.bob_bit !== null && row?.bob_bit !== undefined &&
      (row?.sifted === true || (row?.sifted == null && row?.match === true))
    ))
    : []
  const expected = results?.sifted_key_length ?? 0
  if (expected <= 0 || expected >= OFFICIAL_MIN_SIFTED_COUNT || rows.length !== expected) {
    return null
  }
  return {
    errors: rows.reduce((total, row) => (
      total + (row.alice_bit !== row.bob_bit ? 1 : 0)
    ), 0),
    count: rows.length,
  }
}

export function getQberPresentation(results) {
  const estimated = results?.qber_estimated === true && results?.qber != null
  const derived = !estimated ? deriveSiftedCounts(results) : null
  const preview = !estimated && results?.qber_preview != null
    ? results.qber_preview
    : derived && derived.count > 0 ? derived.errors / derived.count : null
  const previewCount = !estimated
    ? results?.qber_preview_sample_size || derived?.count || 0
    : 0
  const previewErrors = !estimated
    ? results?.qber_preview_errors ?? derived?.errors ?? 0
    : 0
  const confidence = !estimated
    ? results?.qber_preview_confidence || (
      previewCount > 0 ? previewCount < 20 ? 'very_low' : 'low' : null
    )
    : null
  const fullErrors = results?.qber_full_sifted_errors ?? derived?.errors ?? 0
  const skrPreview = !estimated && preview != null
    ? results?.skr_preview ?? previewSkr(
      results?.sifted_key_length ?? 0,
      results?.raw_key_length ?? 0,
      preview
    )
    : null

  return {
    estimated,
    qber: estimated ? results.qber : preview,
    skr: estimated ? results.skr : skrPreview,
    confidence,
    sampleSize: estimated ? results?.qber_sample_size ?? 0 : previewCount,
    sampleErrors: estimated ? results?.qber_sample_errors ?? 0 : previewErrors,
    fullErrors,
    isDerivedPreview: !estimated && results?.qber_preview == null && derived != null,
  }
}

export function getQberConfidenceLabel(confidence) {
  if (confidence === 'very_low') return 'Very low-confidence preview'
  if (confidence === 'low') return 'Low-confidence preview'
  return 'Diagnostic preview'
}

export function getQberConfidenceStatusLabel(confidence) {
  if (confidence === 'very_low') return 'VERY LOW CONFIDENCE'
  if (confidence === 'low') return 'LOW CONFIDENCE'
  return 'UNDETERMINED'
}

