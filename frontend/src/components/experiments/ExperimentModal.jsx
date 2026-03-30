/**
 * Experiment selection modal.
 * Shows experiment description, learning objective,
 * configuration options, and Start button.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'
import { useSimulation } from '../../hooks/useSimulation'
import PhotonInputTable from './PhotonInputTable'
import EditableValue from '../ui/EditableValue'

// Experiment data — mirrors backend experiments.py
const EXPERIMENT_DATA = {
  exp1: {
    name: 'Experiment 1',
    title: 'Random Bit Generation — Clean Channel',
    color: '#22c55e',
    description: 'Alice generates random bits and sends them through a clean quantum channel to Bob. No eavesdropping. Observe how basis sifting produces a shared secret key.',
    learning_objective: 'Understand the baseline BB84 protocol. See how ~50% of bits are discarded during sifting and how QBER stays near zero without an attacker.',
    defaults: { n_bits: 1000, distance_km: 10, noise_level: 0.0, attack_prob: 0.0 },
    locked: ['attack_prob'],
    user_input: false,
  },
  exp2: {
    name: 'Experiment 2',
    title: 'Manual Photon Encoding — Clean Channel',
    color: '#6366f1',
    description: 'You control exactly which bits Alice sends and which polarization basis she uses for each photon. No Eve. Observe precisely how your choices flow through BB84.',
    learning_objective: 'See the direct relationship between polarization basis, bit value, and the final sifted key. Understand why basis mismatches cause bits to be discarded.',
    defaults: { n_bits: 8, distance_km: 0, noise_level: 0.0, attack_prob: 0.0 },
    locked: ['attack_prob', 'n_bits'],
    user_input: true,
  },
  exp3: {
    name: 'Experiment 3',
    title: 'Random Bits — Eve Intercepts',
    color: '#f59e0b',
    description: 'Alice generates random bits. Eve intercepts photons using intercept-resend attack. Watch the QBER spike above 11% as Eve introduces detectable errors.',
    learning_objective: 'Understand how quantum eavesdropping is detected. Eve cannot copy quantum states without disturbing them — the foundation of QKD security.',
    defaults: { n_bits: 1000, distance_km: 10, noise_level: 0.0, attack_prob: 1.0 },
    locked: [],
    user_input: false,
  },
  exp4: {
    name: 'Experiment 4',
    title: 'Manual Photon Encoding — Eve Active',
    color: '#f59e0b',
    description: 'You define each photon manually. Eve intercepts the transmission. See exactly which of your photons were intercepted and how this creates errors.',
    learning_objective: 'Trace exactly what happens to specific photons when Eve intercepts them. See the direct connection between interception and QBER elevation.',
    defaults: { n_bits: 8, distance_km: 0, noise_level: 0.0, attack_prob: 1.0 },
    locked: ['n_bits'],
    user_input: true,
  },
  exp5: {
    name: 'Experiment 5',
    title: 'Quantum Gate Transmission',
    color: '#a855f7',
    description: 'Place quantum gates on the channel lanes before starting. Watch how each gate transforms photon polarization states and affects QBER.',
    learning_objective: 'Understand how quantum gates transform polarization states. See how unexpected transformations introduce errors detectable as eavesdropping.',
    defaults: { n_bits: 500, distance_km: 0, noise_level: 0.0, attack_prob: 0.0 },
    locked: [],
    user_input: false,
    requires_gates: true,
  },
  exp6: {
    name: 'Experiment 6',
    title: 'No-Cloning Theorem',
    color: '#ef4444',
    description: 'Place the Cloning Probe on a channel lane. It attempts to copy photon states. Watch the channel turn red as the original state collapses.',
    learning_objective: 'Demonstrate the quantum no-cloning theorem. Neither the original photon nor the copy retains the correct state. QBER spikes instantly.',
    defaults: { n_bits: 500, distance_km: 0, noise_level: 0.0, attack_prob: 0.0 },
    locked: [],
    user_input: false,
    requires_cloning_probe: true,
  },
  exp7: {
    name: 'Experiment 7',
    title: 'PNS Attack — Undetectable Eavesdropping',
    color: '#ccaa00',
    description: 'Real laser sources emit pulses with varying photon numbers (Weak Coherent Pulses). Eve exploits multi-photon pulses using the PNS attack — introducing ZERO detectable QBER. Standard BB84 security threshold cannot detect this attack.',
    learning_objective: 'Understand why ideal single-photon sources matter. See that QBER staying at 0% does NOT guarantee security when using real laser sources. Eve can steal complete key information silently.',
    defaults: { n_bits: 2000, distance_km: 10, noise_level: 0.0, attack_prob: 0.8 },
    locked: ['attack_strategy', 'wcp_enabled'],
    user_input: false,
  },
  exp8: {
    name: 'Experiment 8',
    title: 'Decoy State Protocol — Detecting PNS',
    color: '#00aacc',
    description: 'Alice sends pulses at three different intensities. By comparing detection rates between signal and decoy states, Alice and Bob can detect whether Eve is performing a PNS attack — even though QBER appears normal.',
    learning_objective: 'Understand the decoy state protocol. See how comparing gain statistics between signal and decoy intensities reveals PNS attack that standard QBER analysis cannot detect.',
    defaults: { n_bits: 2000, distance_km: 10, noise_level: 0.0, attack_prob: 0.8 },
    locked: ['attack_strategy', 'wcp_enabled', 'decoy_enabled'],
    user_input: false,
  },
}

export default function ExperimentModal() {
  const {
    experimentModalOpen,
    experimentModalId,
    closeExperimentModal,
    setParams,
    setActiveExperiment,
    params,
    sourceModel
  } = useSimulationStore()

  const { runSimulation } = useSimulation()

  const [localDistance, setLocalDistance] = useState(10)
  const [localNoise, setLocalNoise] = useState(0)
  const [localAttack, setLocalAttack] = useState(0)
  const [localNBits, setLocalNBits] = useState(1000)
  const [userBits, setUserBits] = useState([])
  const [userBases, setUserBases] = useState([])

  const exp = experimentModalId 
    ? EXPERIMENT_DATA[experimentModalId] 
    : null

  // Initialize local state when modal opens
  useEffect(() => {
    if (exp) {
      setLocalDistance(exp.defaults.distance_km)
      setLocalNoise(exp.defaults.noise_level * 100)
      setLocalAttack(exp.defaults.attack_prob * 100)
      setLocalNBits(exp.defaults.n_bits)
      // Initialize user input defaults
      if (exp.user_input) {
        const defaultBits = Array(8).fill(0)
        const defaultBases = Array(8).fill('+')
        setUserBits(defaultBits)
        setUserBases(defaultBases)
      }
    }
  }, [experimentModalId])

  const handleStart = () => {
    if (!exp) return
    // Safety guard for realistic-only experiments
    if (['exp7', 'exp8'].includes(experimentModalId) &&
        useSimulationStore.getState().sourceModel === 'ideal') {
      return
    }

    // Build params for this experiment
    const newParams = {
      n_bits: exp.user_input ? userBits.length : localNBits,
      distance_km: localDistance,
      noise_level: localNoise / 100,
      attack_prob: exp.locked.includes('attack_prob')
        ? exp.defaults.attack_prob
        : localAttack / 100,
      attack_strategy: 'intercept_resend',
      experiment_mode: experimentModalId,
      gates: useSimulationStore.getState().placedGates.map(g => ({
        type: g.type,
        lane: g.lane,
        position: g.position
      }))
    }

    if (exp.user_input) {
      newParams.alice_bits = userBits
      newParams.alice_bases = userBases
    }

    setParams(newParams)
    setActiveExperiment(experimentModalId)
    closeExperimentModal()
    
    // Run simulation asynchronously so Zustand has time to flush state
    setTimeout(() => {
      useSimulationStore.setState({ params: newParams }) // force latest
      runSimulation()
    }, 50)
  }

  const isLocked = (param) => exp?.locked?.includes(param)

  return (
    <AnimatePresence>
      {experimentModalOpen && exp && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeExperimentModal}
            className="fixed inset-0 bg-black/70 z-[100] 
                       backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] flex items-center 
                       justify-center p-4 pointer-events-none"
          >
            <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] 
                            shadow-2xl w-full max-w-2xl 
                            max-h-[90vh] overflow-y-auto
                            pointer-events-auto rounded-xl"
                 style={{ borderColor: exp.color + '40' }}>

              {/* Header */}
              <div className="flex items-start justify-between 
                              p-6 border-b border-[var(--border-color)]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 
                                     rounded"
                          style={{ 
                            backgroundColor: exp.color + '20',
                            color: exp.color 
                          }}>
                      {exp.name}
                    </span>
                    {['exp7', 'exp8'].includes(experimentModalId) && (
                      <span className="text-xs font-mono px-2 py-0.5
                                       rounded ml-2"
                            style={{
                              backgroundColor: '#ccaa0020',
                              color: '#ccaa00',
                              border: '1px solid #ccaa0040'
                            }}>
                        🔬 Requires Realistic Mode
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] 
                                 font-mono">
                    {exp.title}
                  </h2>
                </div>
                <button
                  onClick={closeExperimentModal}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] 
                             transition-colors text-xl leading-none
                             mt-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 flex flex-col gap-6">

                {/* Description */}
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-[var(--text-muted)] 
                                leading-relaxed">
                    {exp.description}
                  </p>
                  <div className="p-3 bg-[var(--panel-dark)]/10 rounded-lg 
                                  border border-[var(--border-color)]">
                    <div className="text-xs font-mono uppercase 
                                    tracking-wider mb-1"
                         style={{ color: exp.color }}>
                      Learning Objective
                    </div>
                    <p className="text-xs text-[var(--text-subtle)] 
                                  leading-relaxed">
                      {exp.learning_objective}
                    </p>
                  </div>
                </div>

                {/* Special instructions for exp5 and exp6 */}
                {exp.requires_gates && (
                  <div className="p-3 bg-indigo-950/30 rounded-lg 
                                  border border-indigo-800/40">
                    <div className="text-xs font-mono text-indigo-400 
                                    mb-1">
                      ⚠ Before Starting
                    </div>
                    <p className="text-xs text-[var(--text-subtle)]">
                      Drag quantum gates from the Toolbox onto 
                      the channel lanes on the canvas before 
                      clicking Start. Gates placed now will be 
                      used in this experiment.
                    </p>
                  </div>
                )}

                {exp.requires_cloning_probe && (
                  <div className="p-3 bg-red-950/30 rounded-lg 
                                  border border-red-800/40">
                    <div className="text-xs font-mono text-red-400 
                                    mb-1">
                      ⚠ Before Starting
                    </div>
                    <p className="text-xs text-[var(--text-subtle)]">
                      Drag the Cloning Probe from the Toolbox 
                      onto a channel lane before clicking Start. 
                      The probe will attempt to copy photon states, 
                      demonstrating the no-cloning theorem.
                    </p>
                  </div>
                )}

                {/* User input table for exp2 and exp4 */}
                {exp.user_input && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-mono text-[var(--text-muted)] 
                                    uppercase tracking-wider">
                      Photon Configuration
                    </div>
                    <PhotonInputTable
                      onChange={(bits, bases) => {
                        setUserBits(bits)
                        setUserBases(bases)
                      }}
                      maxPhotons={20}
                      initialCount={8}
                    />
                  </div>
                )}

                {/* Channel settings */}
                <div className="flex flex-col gap-4">
                  <div className="text-xs font-mono text-[var(--text-muted)] 
                                  uppercase tracking-wider">
                    Channel Settings
                  </div>

                  {/* Distance */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between 
                                    items-center">
                      <span className="text-xs font-mono 
                                       text-[var(--text-muted)]">
                        Distance
                      </span>
                      <EditableValue
                        value={`${localDistance} km`}
                        numericValue={localDistance}
                        min={0}
                        max={150}
                        step={1}
                        onChange={setLocalDistance}
                        suffix="km"
                        color={exp.color}
                      />
                    </div>
                    <input type="range" min={0} max={150} 
                           step={1}
                           value={localDistance}
                           onChange={e => 
                             setLocalDistance(Number(e.target.value))
                           }
                           className="w-full h-1 bg-[var(--panel-dark)]/20 
                                      rounded-full appearance-none
                                      cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Noise */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between 
                                    items-center">
                      <span className="text-xs font-mono 
                                       text-[var(--text-muted)]">
                        Noise Level
                      </span>
                      <EditableValue
                        value={`${localNoise.toFixed(1)}%`}
                        numericValue={localNoise}
                        min={0}
                        max={10}
                        step={0.1}
                        onChange={setLocalNoise}
                        suffix="%"
                        color={exp.color}
                      />
                    </div>
                    <input type="range" min={0} max={10} 
                           step={0.1}
                           value={localNoise}
                           onChange={e => 
                             setLocalNoise(Number(e.target.value))
                           }
                           className="w-full h-1 bg-[var(--panel-dark)]/20 
                                      rounded-full appearance-none
                                      cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Eve Attack — only if not locked */}
                  {!isLocked('attack_prob') && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between 
                                      items-center">
                        <span className="text-xs font-mono 
                                         text-[var(--text-muted)]">
                          Eve Attack
                        </span>
                        <EditableValue
                          value={`${localAttack.toFixed(0)}%`}
                          numericValue={localAttack}
                          min={0}
                          max={100}
                          step={1}
                          onChange={setLocalAttack}
                          suffix="%"
                          color={exp.color}
                        />
                      </div>
                      <input type="range" min={0} max={100} 
                             step={1}
                             value={localAttack}
                             onChange={e => 
                               setLocalAttack(Number(e.target.value))
                             }
                             className="w-full h-1 bg-[var(--panel-dark)]/20 
                                        rounded-full appearance-none
                                        cursor-pointer accent-indigo-500"
                      />
                    </div>
                  )}

                  {/* Locked params info */}
                  {exp.locked.length > 0 && (
                    <div className="text-xs text-[var(--text-subtle)] 
                                    font-mono">
                      ℹ Eve attack is fixed for this experiment
                      {exp.defaults.attack_prob === 0 
                        ? ' (disabled)' 
                        : ` (${exp.defaults.attack_prob * 100}%)`
                      }
                    </div>
                  )}

                  {/* N bits — only if not user_input and 
                      not locked */}
                  {!exp.user_input && 
                   !isLocked('n_bits') && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between 
                                      items-center">
                        <span className="text-xs font-mono 
                                         text-[var(--text-muted)]">
                          Photons
                        </span>
                        <EditableValue
                          value={localNBits.toLocaleString()}
                          numericValue={localNBits}
                          min={100}
                          max={5000}
                          step={100}
                          onChange={setLocalNBits}
                          color={exp.color}
                        />
                      </div>
                      <input type="range" min={100} max={5000}
                             step={100}
                             value={localNBits}
                             onChange={e => 
                               setLocalNBits(Number(e.target.value))
                             }
                             className="w-full h-1 bg-[var(--panel-dark)]/20 
                                        rounded-full appearance-none
                                        cursor-pointer accent-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="flex justify-between 
                                items-center pt-2 
                                border-t border-[var(--border-color)]">
                  <button
                    onClick={closeExperimentModal}
                    className="px-4 py-2 text-sm font-mono 
                               text-[var(--text-muted)] hover:text-[var(--text-primary)]
                               transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 px-6 py-2 
                               rounded font-mono text-sm 
                               text-white transition-colors"
                    style={{ backgroundColor: exp.color }}
                  >
                    ▶ Start {exp.name}
                  </button>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
