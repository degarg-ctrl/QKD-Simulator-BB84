import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  const mem = new Map()
  globalThis.localStorage = {
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => mem.set(key, String(value)),
    removeItem: (key) => mem.delete(key),
    clear: () => mem.clear(),
  }
  globalThis.document = {
    documentElement: { classList: { add() {}, remove() {} } },
  }
})

import {
  buildExperimentConfiguration,
  createRunSnapshot,
  gatesForExperiment,
} from './simulationRun'
import {
  buildLandingConfiguration,
  DEFAULT_SIMULATION_PARAMS,
} from './landingPreset'
import useSimulationStore from '../store/simulationStore'

const EXPERIMENT_CASES = [
  ['exp1', { n_bits: 1000, distance_km: 10, noise_level: 0, attack_prob: 0 }],
  ['exp2', { n_bits: 300, distance_km: 0, noise_level: 0, attack_prob: 0 }],
  ['exp3', { n_bits: 1000, distance_km: 10, noise_level: 0, attack_prob: 1 }],
  ['exp4', { n_bits: 300, distance_km: 0, noise_level: 0, attack_prob: 1 }],
  ['exp5', { n_bits: 500, distance_km: 0, noise_level: 0, attack_prob: 0 }],
  ['exp6', { n_bits: 500, distance_km: 0, noise_level: 0, attack_prob: 0 }],
  ['exp7', { n_bits: 2000, distance_km: 10, noise_level: 0, attack_prob: 0.8 }],
  ['exp8', { n_bits: 2000, distance_km: 10, noise_level: 0, attack_prob: 0.8 }],
]

const defaults = EXPERIMENT_CASES[0][1]

describe('experiment run configuration', () => {
  it('builds landing shortcuts as gate-free simulator configurations', () => {
    expect(buildLandingConfiguration({ n_bits: 600, attack_prob: 1 }))
      .toMatchObject({
        params: { n_bits: 600, attack_prob: 1 },
        sourceModel: 'ideal',
        activeExperiment: null,
        placedGates: [],
      })
  })

  it('clears prior gates for experiments that own a clean optical path', () => {
    const existing = [{ id: 'gate-1', type: 'H', lane: 0, position: 0.4 }]
    for (const experimentId of ['exp1', 'exp2', 'exp3', 'exp4', 'exp7', 'exp8']) {
      expect(gatesForExperiment(experimentId, existing)).toEqual([])
    }
  })

  it('copies placed components for the gate and no-cloning lessons', () => {
    const existing = [{ id: 'gate-1', type: 'H', lane: 0, position: 0.4 }]
    for (const experimentId of ['exp5', 'exp6']) {
      const selected = gatesForExperiment(experimentId, existing)
      expect(selected).toEqual(existing)
      expect(selected).not.toBe(existing)
    }
  })

  it.each(EXPERIMENT_CASES.slice(0, 6))(
    '%s produces its complete ideal-source configuration',
    (experimentId, experimentDefaults) => {
      const config = buildExperimentConfiguration({
        experimentId,
        defaults: experimentDefaults,
        values: experimentDefaults,
      })

      expect(config.sourceModel).toBe('ideal')
      expect(config.activeExperiment).toBe(experimentId)
      expect(config.params).toMatchObject({
        ...DEFAULT_SIMULATION_PARAMS,
        ...experimentDefaults,
        experiment_mode: experimentId,
        wcp_enabled: false,
        decoy_enabled: false,
        attack_strategy: 'intercept_resend',
      })
    },
  )

  it('builds the PNS experiment without retaining old sidebar fields', () => {
    const experimentDefaults = EXPERIMENT_CASES[6][1]
    const config = buildExperimentConfiguration({
      experimentId: 'exp7',
      defaults: experimentDefaults,
      values: experimentDefaults,
    })

    expect(config.sourceModel).toBe('realistic')
    expect(config.params).toMatchObject({
      attack_strategy: 'pns',
      wcp_enabled: true,
      decoy_enabled: false,
      mean_photon_number: 0.2,
      ...experimentDefaults,
    })
  })

  it('builds the decoy experiment with WCP, PNS, and decoy state enabled', () => {
    const experimentDefaults = EXPERIMENT_CASES[7][1]
    const config = buildExperimentConfiguration({
      experimentId: 'exp8',
      defaults: experimentDefaults,
      values: experimentDefaults,
    })

    expect(config.sourceModel).toBe('realistic')
    expect(config.params).toMatchObject({
      attack_strategy: 'pns',
      wcp_enabled: true,
      decoy_enabled: true,
      ...experimentDefaults,
    })
  })

  it('copies manual bits and bases into the submitted configuration', () => {
    const bits = [0, 1]
    const bases = ['+', 'x']
    const config = buildExperimentConfiguration({
      experimentId: 'exp2', defaults, values: {}, aliceBits: bits, aliceBases: bases,
    })
    bits[0] = 1
    bases[0] = 'x'

    expect(config.params.n_bits).toBe(2)
    expect(config.params.alice_bits).toEqual([0, 1])
    expect(config.params.alice_bases).toEqual(['+', 'x'])
  })
})

describe('run snapshot and lifecycle', () => {
  beforeEach(() => useSimulationStore.getState().reset())

  it('copies request parameters and gates before submission', () => {
    const source = {
      params: { ...DEFAULT_SIMULATION_PARAMS, alice_bits: [0, 1] },
      placedGates: [{ id: 'gate-1', type: 'H', lane: 0, position: 0.4 }],
      sourceModel: 'ideal',
      activeExperiment: 'exp2',
    }
    const snapshot = createRunSnapshot(source)
    source.params.n_bits = 9
    source.params.alice_bits[0] = 1
    source.placedGates[0].position = 0.9

    expect(snapshot.params.n_bits).toBe(1000)
    expect(snapshot.params.alice_bits).toEqual([0, 1])
    expect(snapshot.params.gates[0].position).toBe(0.4)
    expect(snapshot.activeExperiment).toBe('exp2')
  })

  it('ignores a response that arrives after reset', () => {
    const store = useSimulationStore.getState()
    const runId = store.beginRun({ params: { n_bits: 2000 } })
    store.reset()
    useSimulationStore.getState().completeRun(runId, { qber: 0 })

    const state = useSimulationStore.getState()
    expect(state.results).toBeNull()
    expect(state.params).toEqual(DEFAULT_SIMULATION_PARAMS)
    expect(state.submittedRun).toBeNull()
  })

  it('lets only the newest run commit results', () => {
    useSimulationStore.setState({ results: { id: 'previous' } })
    const store = useSimulationStore.getState()
    const first = store.beginRun({ params: { n_bits: 100 } })
    expect(useSimulationStore.getState().results).toBeNull()
    const second = useSimulationStore.getState().beginRun({ params: { n_bits: 200 } })
    useSimulationStore.getState().completeRun(first, { id: 'old' })
    useSimulationStore.getState().completeRun(second, { id: 'new' })

    expect(useSimulationStore.getState().results).toEqual({ id: 'new' })
  })

  it('replaces a loaded configuration instead of retaining experiment-only fields', () => {
    useSimulationStore.setState({
      params: { ...DEFAULT_SIMULATION_PARAMS, experiment_mode: 'exp4', alice_bits: [1] },
    })
    useSimulationStore.getState().applySimulationConfiguration({
      params: { n_bits: 50, distance_km: 5 },
      sourceModel: 'ideal',
      activeExperiment: null,
      placedGates: [],
    })

    const state = useSimulationStore.getState()
    expect(state.params.n_bits).toBe(50)
    expect(state.params).not.toHaveProperty('experiment_mode')
    expect(state.params).not.toHaveProperty('alice_bits')
  })

  it('clears stale gates when a gate-free shortcut supplies an empty gate list', () => {
    useSimulationStore.setState({
      placedGates: [{ id: 'stale-gate', type: 'X', lane: 0, position: 0.5 }],
    })

    useSimulationStore.getState().applySimulationConfiguration({
      params: { n_bits: 1000, distance_km: 10 },
      sourceModel: 'ideal',
      activeExperiment: null,
      placedGates: [],
    })

    expect(useSimulationStore.getState().placedGates).toEqual([])
  })
})
