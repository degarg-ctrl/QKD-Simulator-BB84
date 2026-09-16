/**
 * SimulatorControls.jsx
 *
 * Consolidated Top Bar & Control Center for the QKD Simulator:
 * - Top Left: Navigation menu (≡), QKD Simulator BB84 branding, and Security Status
 * - Top Middle: Live Speed Control & Play/Pause synchronized with transmission rate
 * - Top Right: View switcher (SIM/RESULTS), Action buttons (RESET, SAVE, LOAD, INSPECT, RUN),
 *              Theme toggle, and Logo.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  Menu, Home, Atom, BookOpen, Sun, Moon,
  Save, FolderOpen, Play, Pause, RotateCcw, Search, X,
} from 'lucide-react'
import { useSimulation } from '../../hooks/useSimulation'
import SaveExperimentModal from '../experiments/SaveExperimentModal'
import LoadExperimentModal from '../experiments/LoadExperimentModal'
import useSimulationStore from '../../store/simulationStore'
import Slider from '../ui/Slider'

const BTN = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs ' +
  'font-medium border transition-colors disabled:opacity-40 ' +
  'disabled:cursor-not-allowed'

export default function SimulatorControls() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const { runSimulation, isLoading } = useSimulation()
  const {
    results, reset, placedGates, clearGates,
    openInspector, inspector, activeView, setActiveView,
    theme, setTheme,
    animation, togglePause, setAnimationSpeed,
    setSimulationMode, setPlaybackSlider,
  } = useSimulationStore()

  const isBreached = results?.secure_threshold_breached ?? false
  const hasResults = results !== null
  const currentSpeed = animation.speed ?? 1.0

  // Keyboard shortcut: Spacebar toggles play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (hasResults) {
          e.preventDefault()
          togglePause()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasResults, togglePause])

  const navMenuItems = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'simulator', label: 'Simulator', icon: Atom },
    { id: 'guide', label: 'About', icon: BookOpen },
  ]

  return (
    <>
      <header
        className="relative flex items-center justify-between px-3 py-1.5 h-13 flex-shrink-0 z-30 select-none gap-2"
        style={{
          backgroundColor: 'var(--panel-bg)',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        {/* ── Top Left: Nav Menu + Branding + Security Status ── */}
        <div className="flex items-center gap-3 min-w-0 z-10">
          {/* Hamburger Menu */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded hover:bg-white/5 transition-colors text-[var(--text-primary)]"
            aria-label="Navigation Menu"
            title="Open navigation menu"
          >
            <Menu size={18} />
          </button>

          {/* QKD Simulator Branding */}
          <button
            onClick={() => setActiveView('landing')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Back to Landing Page"
          >
            <span className="font-mono text-base text-[var(--text-primary)] tracking-wider font-semibold whitespace-nowrap">
              QKD Simulator
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
              style={{
                backgroundColor: 'rgba(0, 204, 255, 0.15)',
                border: '1px solid rgba(0, 204, 255, 0.5)',
                color: '#00c8ff'
              }}
            >
              BB84
            </span>
          </button>

          {/* Divider */}
          <div className="h-4 w-[1px] bg-[var(--border-color)] mx-0.5" />

            {/* Security Status Indicator */}
            {(() => {
              const statusConfig = isLoading
                ? { label: 'SIMULATING', dot: '#F59E0B', text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', pulse: true }
                : hasResults && isBreached
                ? { label: 'BREACH DETECTED', dot: '#EF4444', text: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', pulse: true }
                : hasResults
                ? { label: 'SECURE', dot: '#22C55E', text: '#22C55E', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', pulse: false }
                : { label: 'READY', dot: 'var(--text-subtle)', text: 'var(--text-muted)', bg: 'rgba(255, 255, 255, 0.04)', border: 'var(--border-color)', pulse: false }

              return (
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold select-none ${statusConfig.pulse ? 'animate-pulse' : ''}`}
                  style={{ backgroundColor: statusConfig.bg, border: `1px solid ${statusConfig.border}` }}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusConfig.dot }}
                  />
                  <span style={{ color: statusConfig.text }}>{statusConfig.label}</span>
                </div>
              )
            })()}
        </div>

        {/* ── Top Middle: Anchored Center Playback & Mode Control (fixed width, integrated) ── */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center gap-3 px-2 z-20 w-[280px]">
          {/* Circular Play / Pause Button */}
          <button
            onClick={togglePause}
            disabled={!hasResults}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
              !hasResults
                ? 'opacity-40 cursor-not-allowed bg-white/5 text-[var(--text-muted)]'
                : animation.isPaused
                ? 'bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-105'
                : 'bg-white/10 text-[var(--text-primary)] hover:bg-white/20 hover:scale-105'
            }`}
            title={!hasResults ? 'Run simulation first' : animation.isPaused ? 'Resume [Space]' : 'Pause [Space]'}
          >
            {animation.isPaused ? (
              <Play size={14} fill="currentColor" className="ml-0.5" />
            ) : (
              <Pause size={14} fill="currentColor" />
            )}
          </button>

          {/* Unified Dual-Mode Slider */}
          <div className="flex flex-col gap-0.5 w-44">
            {/* Speed Readout Header */}
            <div className="flex items-center justify-between text-xs font-mono leading-none">
              <span className="text-[var(--text-muted)] uppercase tracking-wider">
                {animation.mode === 'waves' ? 'Waves' : 'Beam'}:
              </span>
              <span className="font-bold text-[var(--text-primary)]">
                {animation.mode === 'waves' ? (
                  <>
                    <span className="text-cyan-400">{animation.speed.toFixed(1)}×</span>
                    <span className="text-[var(--text-muted)] text-[11px] ml-1">
                      ({(1.5 / Math.max(0.1, animation.speed)).toFixed(2)}s)
                    </span>
                  </>
                ) : (
                  <span className="text-fuchsia-400">
                    {animation.beamRate || 35} photons/s
                  </span>
                )}
              </span>
            </div>

            {/* Slider Input */}
            <div className="relative flex items-center h-4">
              <Slider
                min={0}
                max={100}
                step={1}
                value={animation.sliderPos ?? 25}
                onChange={setPlaybackSlider}
                accentColor={animation.mode === 'waves' ? '#00e5ff' : '#d946ef'}
                divisions={[50]}
              />
            </div>

            {/* Mode Indicators / Buttons */}
            <div className="flex items-center justify-between text-[11px] font-mono leading-none px-0.5">
              <button
                type="button"
                onClick={() => setSimulationMode('waves')}
                className={`transition-colors uppercase font-semibold ${
                  animation.mode === 'waves'
                    ? 'text-cyan-400 font-bold'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
                title="Waves mode: discrete photons with ~1.5s baseline delay"
              >
                ● waves
              </button>
              <button
                type="button"
                onClick={() => setSimulationMode('beam')}
                className={`transition-colors uppercase font-semibold ${
                  animation.mode === 'beam'
                    ? 'text-fuchsia-400 font-bold'
                    : 'text-[var(--text-muted)] hover:text-white'
                }`}
                title="Beam mode: continuous flowing optical laser beam"
              >
                beam ●
              </button>
            </div>
          </div>
        </div>

        {/* ── Top Right: Actions & Theme ── */}
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0 z-10 ml-auto">
          {/* View Mode Toggle: SIM vs RESULTS */}
          <div
            className="flex items-center gap-0.5 rounded p-0.5"
            style={{ border: '1px solid var(--border-color)' }}
          >
            {[
              { id: 'simulator', label: 'SIM' },
              { id: 'results', label: 'RESULTS' },
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors ${
                  activeView === view.id
                    ? 'bg-white/15 text-white shadow-sm border border-white/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            onClick={reset}
            disabled={isLoading || !hasResults}
            className={`${BTN} text-[var(--text-muted)] hover:text-[var(--text-primary)]`}
            style={{ borderColor: 'var(--border-color)' }}
            title="Reset simulation parameters and canvas"
          >
            <RotateCcw size={12} /> RESET SIM
          </button>

          {/* Save Experiment */}
          <button
            onClick={() => setSaveModalOpen(true)}
            className={`${BTN} text-[var(--text-muted)] hover:text-[var(--text-primary)]`}
            style={{ borderColor: 'var(--border-color)' }}
            title="Save experiment run"
          >
            <Save size={12} /> SAVE
          </button>

          {/* Load Experiment */}
          <button
            onClick={() => setLoadModalOpen(true)}
            className={`${BTN} text-[var(--text-muted)] hover:text-[var(--text-primary)]`}
            style={{ borderColor: 'var(--border-color)' }}
            title="Load saved experiment"
          >
            <FolderOpen size={12} /> LOAD
          </button>

          {/* Gates Count/Clear */}
          {placedGates.length > 0 && (
            <button
              onClick={clearGates}
              className={`${BTN} text-[var(--text-muted)] hover:text-[#EF4444]`}
              style={{ borderColor: 'var(--border-color)' }}
              title="Clear placed gates"
            >
              <X size={12} /> GATES ({placedGates.length})
            </button>
          )}

          {/* Inspector */}
          {results && (results.event_stream?.length > 0 || results.bit_stream?.length > 0) && (
            <button
              onClick={openInspector}
              className={BTN}
              style={{
                borderColor: inspector.isOpen ? 'rgba(255, 255, 255, 0.4)' : 'var(--border-color)',
                color: inspector.isOpen ? '#ffffff' : 'var(--text-muted)',
                backgroundColor: inspector.isOpen ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
              }}
              title="Inspect individual photon polarization states"
            >
              <Search size={12} /> INSPECT
            </button>
          )}

          {/* RUN Button */}
          <button
            onClick={runSimulation}
            disabled={isLoading}
            className="px-3.5 py-1.5 text-xs font-mono font-bold rounded text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:brightness-110 active:scale-95"
            style={{ backgroundColor: isLoading ? '#555555' : '#00aacc' }}
            title="Execute QKD BB84 simulation"
          >
            {isLoading ? 'RUNNING…' : 'RUN'}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded text-xs font-mono border transition-colors flex items-center justify-center w-7 h-7"
            style={{
              borderColor: 'var(--border-color)',
              color: 'var(--text-muted)',
              backgroundColor: 'transparent'
            }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          {/* SRMIST Logo */}
          <img
            src="/srmist-logo.png"
            alt="SRMIST Logo"
            className="h-8 object-contain ml-1 opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
      </header>

      {/* Navigation Dropdown Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
            />

            {/* Menu Modal */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-12 left-3 z-50 rounded-lg shadow-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                minWidth: '210px'
              }}
            >
              <div className="px-4 py-2 text-[10px] font-mono text-[var(--text-subtle)] uppercase tracking-wider border-b border-[var(--border-color)]">
                Navigation
              </div>
              {navMenuItems.map((item) => {
                const IconComponent = item.icon
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id)
                      setMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-mono transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                  >
                    <IconComponent size={15} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Experiment Save/Load Modals */}
      <SaveExperimentModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
      />
      <LoadExperimentModal
        isOpen={loadModalOpen}
        onClose={() => setLoadModalOpen(false)}
      />
    </>
  )
}
