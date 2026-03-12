import { create } from 'zustand'

export const useSimulationStore = create((set) => ({
  params: {
    n_bits: 1000,
    distance_km: 50,
    noise_level: 0.02,
    attack_prob: 0,
    attack_strategy: 'intercept_resend'
  },
  results: null,
  isRunning: false,
  photons: [],
  currentStep: 0,
  
  setParams: (params) => set({ params }),
  setResults: (results) => set({ results }),
  setRunning: (isRunning) => set({ isRunning }),
  reset: () => set({ results: null, isRunning: false, photons: [], currentStep: 0 })
}))
