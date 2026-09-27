import { DEFAULT_SIMULATION_PARAMS } from './landingPreset'

const REALISTIC_EXPERIMENTS = new Set(['exp7', 'exp8'])
const GATE_DRIVEN_EXPERIMENTS = new Set(['exp5', 'exp6'])

export function cloneGates(gates = []) {
  return gates.map(({ type, lane, position, id, color }) => ({
    ...(id == null ? {} : { id }),
    type,
    lane,
    position,
    ...(color == null ? {} : { color }),
  }))
}

/** Only component-driven lessons inherit gates already placed on the bench. */
export function gatesForExperiment(experimentId, existingGates = []) {
  return GATE_DRIVEN_EXPERIMENTS.has(experimentId)
    ? cloneGates(existingGates)
    : []
}

/**
 * Build the complete state applied by an experiment launch.
 * Experiments 1–6 use the ideal source; 7–8 are the WCP/PNS studies.
 */
export function buildExperimentConfiguration({
  experimentId,
  defaults,
  values,
  aliceBits,
  aliceBases,
}) {
  const realistic = REALISTIC_EXPERIMENTS.has(experimentId)
  const params = {
    ...DEFAULT_SIMULATION_PARAMS,
    ...defaults,
    ...values,
    experiment_mode: experimentId,
    wcp_enabled: realistic,
    mean_photon_number: realistic ? 0.2 : DEFAULT_SIMULATION_PARAMS.mean_photon_number,
    decoy_enabled: experimentId === 'exp8',
    attack_strategy: realistic ? 'pns' : 'intercept_resend',
  }

  if (aliceBits && aliceBases) {
    params.n_bits = aliceBits.length
    params.alice_bits = [...aliceBits]
    params.alice_bases = [...aliceBases]
  }

  return {
    sourceModel: realistic ? 'realistic' : 'ideal',
    activeExperiment: experimentId,
    params,
  }
}

/**
 * Capture the exact request and UI configuration for one run. All arrays are
 * copied so later sidebar edits cannot relabel or mutate the submitted run.
 */
export function createRunSnapshot({
  params,
  placedGates,
  sourceModel,
  activeExperiment,
}) {
  const gates = cloneGates(placedGates)
  const requestParams = {
    ...params,
    gates: gates.map(({ type, lane, position }) => ({ type, lane, position })),
    experiment_mode: params.experiment_mode || activeExperiment || 'free',
    alice_bits: params.alice_bits ? [...params.alice_bits] : undefined,
    alice_bases: params.alice_bases ? [...params.alice_bases] : undefined,
    wcp_enabled: sourceModel === 'realistic' && Boolean(params.wcp_enabled),
    decoy_enabled: sourceModel === 'realistic' && Boolean(params.decoy_enabled),
    mean_photon_number: params.mean_photon_number ?? 0.2,
  }

  return {
    params: requestParams,
    placedGates: gates,
    sourceModel,
    activeExperiment: activeExperiment || null,
  }
}
