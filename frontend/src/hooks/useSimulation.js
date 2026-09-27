/**
 * src/hooks/useSimulation.js
 *
 * Primary hook for running BB84 simulations.
 * Orchestrates: params → API call → store update → animation trigger
 *
 * Usage:
 *   const { runSimulation, isLoading, error } = useSimulation()
 *   <button onClick={runSimulation}>Run</button>
 */

import { useCallback } from 'react'
import useSimulationStore from '../store/simulationStore'
import { runSimulation as apiRunSimulation, validateParams } from '../api/simulatorAPI'
import { createRunSnapshot } from '../lib/simulationRun'

let activeRequestController = null

export function useSimulation() {

  const {
    beginRun,
    completeRun,
    failRun,
    setError,
    reset,
    isLoading,
    isRunning,
    error,
    results
  } = useSimulationStore()

  /**
   * Run the simulation with current params from store.
   *
   * Sequence:
   * 1. Validate params — set error and return early if invalid
   * 2. Capture an immutable request/configuration snapshot
   * 3. Supersede any earlier request and call the API
   * 4. Commit only if this request is still the active run
   */
  const executeRun = useCallback(async (configuration) => {
    const submittedRun = createRunSnapshot(configuration)
    const requestParams = submittedRun.params

    // 1. Validate params
    const validationError = validateParams(requestParams)
    if (validationError) {
      setError(`Validation Error: ${validationError}`)
      return
    }

    activeRequestController?.abort()
    const controller = new AbortController()
    activeRequestController = controller
    const runId = beginRun(submittedRun)

    try {
      const data = await apiRunSimulation(requestParams, { signal: controller.signal })
      completeRun(runId, data)
    } catch (err) {
      if (err.name !== 'AbortError') {
        failRun(runId, err.message || 'An unexpected error occurred during simulation.')
      }
    } finally {
      if (activeRequestController === controller) activeRequestController = null
    }
  }, [beginRun, completeRun, failRun, setError])

  const runSimulation = useCallback(() => {
    const state = useSimulationStore.getState()
    return executeRun(state)
  }, [executeRun])

  const runWithConfiguration = useCallback((configuration) => (
    executeRun(configuration)
  ), [executeRun])

  /**
   * Reset simulation state to initial values.
   * Clears results, error, animation state.
   */
  const resetSimulation = useCallback(() => {
    activeRequestController?.abort()
    activeRequestController = null
    reset()
  }, [reset])

  return {
    runSimulation,
    runWithConfiguration,
    resetSimulation,
    isLoading,
    isRunning,
    error,
    results,
  }
}
