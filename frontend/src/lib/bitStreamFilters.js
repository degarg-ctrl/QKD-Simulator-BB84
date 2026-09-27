export function isSiftedRecord(record) {
  return record.sifted === true || (
    record.sifted == null && record.match === true
  )
}

export function isSiftedErrorRecord(record) {
  return isSiftedRecord(record)
    && record.bob_bit != null
    && record.alice_bit !== record.bob_bit
}

export function isLostRecord(record) {
  return record.wcp_vacuum === true
    || record.pns_blocked === true
    || record.fiber_survived === false
    || record.detector_loss === true
}

export function filterBitStream(records, filter) {
  return records.filter((record) => {
    if (filter === 'matched') return isSiftedRecord(record)
    if (filter === 'mismatch') return (
      !record.lost && record.bob_bit != null && record.match === false
    )
    if (filter === 'siftedErrors') return isSiftedErrorRecord(record)
    if (filter === 'intercepted') return record.intercepted
    if (filter === 'lost') return isLostRecord(record)
    return true
  })
}

export function getFullFilterCount(filter, transmission, results, fallbackCount) {
  if (filter === 'matched') return results.sifted_key_length
  if (filter === 'mismatch') return transmission
    ? Math.max(0, transmission.total_detections - transmission.sifted)
    : fallbackCount
  if (filter === 'siftedErrors') return Math.max(
    results.fullErrors ?? 0,
    transmission?.sifted_errors ?? 0,
    fallbackCount,
  )
  if (filter === 'intercepted') return transmission?.intercepted ?? fallbackCount
  if (filter === 'lost') return transmission
    ? (transmission.fiber_lost ?? 0)
      + (transmission.vacuum_pulses ?? 0)
      + (transmission.pns_blocked ?? 0)
      + (transmission.detector_loss ?? 0)
    : fallbackCount
  return transmission?.generated ?? fallbackCount
}
