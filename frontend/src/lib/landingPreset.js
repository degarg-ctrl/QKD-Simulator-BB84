export const DEFAULT_SIMULATION_PARAMS = {
  n_bits: 1000,
  distance_km: 50,
  noise_level: 0.02,
  attack_prob: 0,
  attack_strategy: 'intercept_resend',
  wcp_enabled: false,
  mean_photon_number: 0.2,
  decoy_enabled: false,
}

/** Normalize a landing-page shortcut into the store/API vocabulary.
 * The full default object prevents parameters from a previous run leaking
 * into a newly selected scenario.
 */
export function normalizeLandingPreset(input = {}) {
  const sourceModel = (
    input.source_model === 'realistic' || input.wcp_enabled === true
  ) ? 'realistic' : 'ideal'

  const params = {
    ...DEFAULT_SIMULATION_PARAMS,
    ...input,
    wcp_enabled: sourceModel === 'realistic',
    mean_photon_number:
      input.mean_photon_number ?? input.mu ?? DEFAULT_SIMULATION_PARAMS.mean_photon_number,
    decoy_enabled: sourceModel === 'realistic' && Boolean(input.decoy_enabled),
  }

  delete params.source_model
  delete params.mu

  return { sourceModel, params }
}

export function buildLandingConfiguration(input = {}) {
  const { sourceModel, params } = normalizeLandingPreset(input)
  return {
    params,
    sourceModel,
    activeExperiment: null,
    placedGates: [],
  }
}
