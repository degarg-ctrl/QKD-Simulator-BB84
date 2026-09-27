export function getDetectorTelemetry(wcpEnabled) {
  if (wcpEnabled) {
    return {
      sensor: 'InGaAs SPAD model',
      efficiency: 'η = 85%',
      darkCount: '10⁻⁵ / gate',
    }
  }

  return {
    sensor: 'Ideal detector model',
    efficiency: 'η = 100%',
    darkCount: '0 / gate',
  }
}
