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
    attack_strategy: 'intercept_resend',
    wcp_enabled: false,
    mean_photon_number: 0.2,
    decoy_enabled: false,
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

  // ─── VIEW STATE ──────────────────────────────────────────
  activeView: 'landing',   // 'landing' | 'simulator' | 'guide' | 'results'

  // ─── ANIMATION STATE ─────────────────────────────────────
  animation: {
    isPlaying: false,
    currentPhotonIndex: 0,
    speed: 0.5,          // multiplier: 0.5 = slow, 1.0 = normal, 2.0 = fast
    completedPhotons: [], // photons that have finished traveling
    activePhotons: [],     // photons currently in flight on canvas
    isPaused: false
  },

  // ─── GATES ───────────────────────────────────────────────
  // Gates placed on canvas lanes by user drag-drop
  placedGates: [],

  // ─── EXPERIMENT STATE ────────────────────────────────────
  activeExperiment: null,
  // null = free mode, 'exp1'-'exp6' = experiment mode
  
  experimentModalOpen: false,
  experimentModalId: null,

  // ─── INSPECTOR STATE ─────────────────────────────────
  inspector: {
    isOpen: false,
    currentIndex: 0,    // index into results.bit_stream
    isPlaying: false,
    playSpeed: 800,     // ms between auto-advance steps
  },

  bottomPanelCollapsed: false,

  syncMode: false,

  sourceModel: 'ideal',
  // 'ideal' = perfect single photons, standard BB84
  // 'realistic' = WCP source, PNS vulnerable

  theme: 'dark',  // 'dark' | 'light'

  // ─── GATE STATE (Sprint 11) ──────────────────────────────
  selectedGate: null,
  gateStates: {},

  /*
  placedGate shape:
  {
    id: string,          unique id e.g. 'gate-H-1234'
    type: string,        'H'|'X'|'Y'|'Z'|'S'|'T'
    lane: number,        0|1|2
    position: number,    0.0-1.0 (fraction of channel width)
    color: string        gate color for canvas rendering
  }
  */

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

  pauseAnimation: () => set((state) => ({
    animation: { ...state.animation, isPaused: true }
  })),

  resumeAnimation: () => set((state) => ({
    animation: { ...state.animation, isPaused: false }
  })),

  togglePause: () => set((state) => ({
    animation: {
      ...state.animation,
      isPaused: !state.animation.isPaused
    }
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

  setActiveView: (view) => set({ activeView: view }),

  reset: () => set((state) => ({
    results: null,
    isRunning: false,
    isLoading: false,
    error: null,
    placedGates: [],
    animation: {
      isPlaying: false,
      currentPhotonIndex: 0,
      speed: 0.5,
      completedPhotons: [],
      activePhotons: []
    },
    inspector: {
      isOpen: false,
      currentIndex: 0,
      isPlaying: false,
      playSpeed: 800,
    },
    bottomPanelCollapsed: false,
    syncMode: false,
    sourceModel: 'ideal',
    viewResetSignal: (state.viewResetSignal || 0) + 1,
  })),

  addGate: (gate) => set((state) => ({
    placedGates: [...state.placedGates, {
      ...gate,
      id: `gate-${gate.type}-${Date.now()}`
    }]
  })),

  removeGate: (gateId) => set((state) => ({
    placedGates: state.placedGates.filter(g => g.id !== gateId)
  })),

  clearGates: () => set({ placedGates: [] }),

  setActiveExperiment: (expId) => set({
    activeExperiment: expId
  }),

  openExperimentModal: (expId) => set({
    experimentModalOpen: true,
    experimentModalId: expId
  }),

  closeExperimentModal: () => set({
    experimentModalOpen: false,
    experimentModalId: null
  }),

  openInspector: () => set((state) => ({
    inspector: { ...state.inspector, isOpen: true, 
                 currentIndex: 0, isPlaying: false },
    bottomPanelCollapsed: true
  })),

  closeInspector: () => set((state) => ({
    inspector: { ...state.inspector, isOpen: false, 
                 isPlaying: false },
    bottomPanelCollapsed: false
  })),

  setInspectorIndex: (index) => set((state) => ({
    inspector: { ...state.inspector, currentIndex: index }
  })),

  setInspectorPlaying: (isPlaying) => set((state) => ({
    inspector: { ...state.inspector, isPlaying }
  })),

  setBottomPanelCollapsed: (collapsed) => set({ 
    bottomPanelCollapsed: collapsed 
  }),

  toggleBottomPanel: () => set((state) => ({
    bottomPanelCollapsed: !state.bottomPanelCollapsed
  })),

  setSyncMode: (enabled) => set({ syncMode: enabled }),

  setSourceModel: (model) => set((state) => {
    // When switching to ideal: force WCP/decoy off
    if (model === 'ideal') {
      return {
        sourceModel: 'ideal',
        params: {
          ...state.params,
          wcp_enabled: false,
          decoy_enabled: false,
          mean_photon_number: 0.2,
        }
      }
    }
    // When switching to realistic: enable WCP
    return {
      sourceModel: 'realistic',
      params: {
        ...state.params,
        wcp_enabled: true,
        mean_photon_number: 0.2,
      }
    }
  }),

  setTheme: (theme) => {
    // Apply to document root
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    // Persist to localStorage
    localStorage.setItem('qkd-theme', theme)
    return set({ theme })
  },

  // Derived getters

  // ─── GATE ACTIONS (Sprint 11) ────────────────────────────
  setSelectedGate: (gate) => set({ selectedGate: gate }),
  clearSelectedGate: () => set({ selectedGate: null }),
  updateGateState: (gateId, stateVector) => set((state) => ({
    gateStates: { ...state.gateStates, [gateId]: stateVector }
  })),
  deleteGate: (gateId) => set((state) => ({
    placedGates: state.placedGates.filter(g => g.id !== gateId),
    selectedGate: state.selectedGate?.id === gateId ? null : state.selectedGate,
  })),
  copyGate: (gate) => set((state) => ({
    placedGates: [...state.placedGates, { ...gate, id: `gate-${gate.type}-${Date.now()}`, position: gate.position + 0.1 }]
  })),
  getHasResults: () => get().results !== null,
  getIsThresholdBreached: () => 
    get().results?.secure_threshold_breached ?? false,
  getQBER: () => get().results?.qber ?? 0,
  getSKR: () => get().results?.skr ?? 0,

}))

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('qkd-theme') || 'dark'
useSimulationStore.getState().setTheme(savedTheme)

export default useSimulationStore
