/**
 * src/api/simulatorAPI.js
 *
 * Single API client for BB84 QKD Simulator backend.
 * All communication with http://localhost:8000 goes through here.
 *
 * Backend contract:
 * POST /api/simulate → SimulationRequest → SimulationResponse
 * GET  /             → health check
 */

const BASE_URL = import.meta.env.DEV
  ? 'http://127.0.0.1:8000'
  : (import.meta.env.VITE_API_URL || '')

/**
 * Run a complete BB84 simulation.
 *
 * @param {Object} params - Simulation parameters
 * @param {number} params.n_bits          - Number of photons (100-10000)
 * @param {number} params.distance_km     - Fiber distance in km (0-150)
 * @param {number} params.noise_level     - Background noise (0-1)
 * @param {number} params.attack_prob     - Eve interception probability (0-1)
 * @param {string} params.attack_strategy - 'intercept_resend'|'partial'|'burst'
 *
 * @returns {Promise<SimulationResponse>} Full simulation results
 * @throws {Error} If network fails or backend returns non-200
 */
export async function runSimulation(params) {
  const validationError = validateParams(params)
  if (validationError) {
    throw new Error(`Validation Error: ${validationError}`)
  }

  try {
    // Transform frontend gate format to backend format
    const backendGates = (params.gates || []).map(g => ({
      type: g.type,
      lane: g.lane,
      position: g.position
    }))

    const response = await fetch(`${BASE_URL}/api/simulate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        gates: backendGates
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Backend returned status ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Could not connect to the simulation backend. Is it running at localhost:8000?')
    }
    throw error
  }
}

/**
 * Check if the backend is reachable and healthy.
 *
 * @returns {Promise<boolean>} true if backend is up, false otherwise
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`)
    if (!response.ok) return false
    const data = await response.json()
    return data.status === 'ok'
  } catch (error) {
    return false
  }
}

/**
 * Validate simulation params before sending to backend.
 * Returns null if valid, error message string if invalid.
 *
 * @param {Object} params
 * @returns {string|null}
 */
export function validateParams(params) {
  const { n_bits, distance_km, noise_level, attack_prob, attack_strategy } = params

  if (typeof n_bits !== 'number' || n_bits < 1 || n_bits > 10000) {
    return 'n_bits must be between 1 and 10000'
  }

  if (typeof distance_km !== 'number' || distance_km < 0 || distance_km > 150) {
    return 'distance_km must be between 0 and 150 km'
  }

  if (typeof noise_level !== 'number' || noise_level < 0 || noise_level > 1) {
    return 'noise_level must be between 0 and 1'
  }

  if (typeof attack_prob !== 'number' || attack_prob < 0 || attack_prob > 1) {
    return 'attack_prob must be between 0 and 1'
  }

  const validStrategies = ['intercept_resend', 'partial', 'burst', 'pns']
  if (!validStrategies.includes(attack_strategy)) {
    return `attack_strategy must be one of: ${validStrategies.join(', ')}`
  }

  return null
}
