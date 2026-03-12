/**
 * src/store/simulationStore.js
 * 
 * Zustand store for BB84 QKD Simulator.
 * Single source of truth for all simulation state.
 * 
 * Three state domains:
 * 1. params     — user-configured simulation parameters
 * 2. results    — data returned from POST /api/simulate
 * 3. animation  — photon animation playback state
 */

import { create } from 'zustand'

const useSimulationStore = create((set, get) => ({

  // ─── PARAMS ──────────────────────────────────────────────
  // Default values match PHYSICS_CONTRACT.md Section 9
  params: {
    n_bits: 1000,
    distance_km: 50,
    noise_level: 0.02,
    attack_prob: 0.0,
    attack_strategy: 'intercept_resend'
  },

  // ─── RESULTS ─────────────────────────────────────────────
  // Null until first simulation runs
  results: null,
  /*
  results shape when populated (mirrors SimulationResponse):
  {
    qber: float,
    skr: float,
    sifted_key_length: int,
    raw_key_length: int,
    efficiency: float,
    bit_stream: PhotonRecord[],
    qber_vs_distance: [{distance, qber}],
    skr_vs_distance: [{distance, skr}],
    secure_threshold_breached: bool
  }
  */

  // ─── UI STATE ────────────────────────────────────────────
  isRunning: false,
  isLoading: false,
  error: null,

  // ─── ANIMATION STATE ─────────────────────────────────────
  animation: {
    isPlaying: false,
    currentPhotonIndex: 0,
    speed: 1.0,          // multiplier: 0.5 = slow, 1.0 = normal, 2.0 = fast
    completedPhotons: [], // photons that have finished traveling
    activePhotons: []     // photons currently in flight on canvas
  },

  // ─── ACTIONS ─────────────────────────────────────────────

  setParams: (newParams) => set((state) => ({
    params: { ...state.params, ...newParams }
  })),

  setResults: (results) => set({
    results,
    isLoading: false,
    error: null
  }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({
    error,
    isLoading: false,
    isRunning: false
  }),

  setRunning: (isRunning) => set({ isRunning }),

  setAnimationPlaying: (isPlaying) => set((state) => ({
    animation: { ...state.animation, isPlaying }
  })),

  setAnimationSpeed: (speed) => set((state) => ({
    animation: { ...state.animation, speed }
  })),

  addActivePhoton: (photon) => set((state) => ({
    animation: {
      ...state.animation,
      activePhotons: [...state.animation.activePhotons, photon]
    }
  })),

  completePhoton: (photonIndex) => set((state) => ({
    animation: {
      ...state.animation,
      activePhotons: state.animation.activePhotons
        .filter(p => p.index !== photonIndex),
      completedPhotons: [
        ...state.animation.completedPhotons,
        state.animation.activePhotons
          .find(p => p.index === photonIndex)
      ].filter(Boolean)
    }
  })),

  reset: () => set({
    results: null,
    isRunning: false,
    isLoading: false,
    error: null,
    animation: {
      isPlaying: false,
      currentPhotonIndex: 0,
      speed: 1.0,
      completedPhotons: [],
      activePhotons: []
    }
  }),

  // Derived getters
  getHasResults: () => get().results !== null,
  getIsThresholdBreached: () => 
    get().results?.secure_threshold_breached ?? false,
  getQBER: () => get().results?.qber ?? 0,
  getSKR: () => get().results?.skr ?? 0,

}))

export default useSimulationStore
