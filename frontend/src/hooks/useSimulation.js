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

export function useSimulation() {

  const {
    params,
    setResults,
    setLoading,
    setError,
    setRunning,
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
   * 2. Set isLoading=true, isRunning=true
   * 3. Call apiRunSimulation(params)
   * 4. On success: setResults(data), setRunning(false)
   * 5. On error: setError(message), setRunning(false)
   * 6. Always: setLoading(false)
   */
  const runSimulation = useCallback(async () => {
    // 1. Validate params
    const validationError = validateParams(params)
    if (validationError) {
      setError(`Validation Error: ${validationError}`)
      return
    }

    // 2. Prepare for API call
    setLoading(true)
    setRunning(true)
    setError(null) // Clear any previous errors

    try {
      // 3. Call API
      const data = await apiRunSimulation(params)
      
      // 4. On success: update results
      setResults(data)
    } catch (err) {
      // 5. On error: update error state
      setError(err.message || 'An unexpected error occurred during simulation.')
    } finally {
      // 6. Always reset loading and internal running flag
      setLoading(false)
      setRunning(false)
    }
  }, [params, setResults, setLoading, setError, setRunning])

  /**
   * Reset simulation state to initial values.
   * Clears results, error, animation state.
   */
  const resetSimulation = useCallback(() => {
    reset()
  }, [reset])

  return {
    runSimulation,
    resetSimulation,
    isLoading,
    isRunning,
    error,
    results,
    params
  }
}
