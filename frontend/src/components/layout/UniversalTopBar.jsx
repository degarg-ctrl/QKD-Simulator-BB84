/**
 * UniversalTopBar.jsx
 * 
 * Universal navigation bar for all pages.
 * Contains: QKD Simulator branding, hamburger menu (Home/Simulator/About), theme toggle
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useSimulationStore from '../../store/simulationStore'

export default function UniversalTopBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { activeView, setActiveView, theme, setTheme } = useSimulationStore()

  const menuItems = [
    { id: 'landing', label: 'Home', icon: '🏠' },
    { id: 'simulator', label: 'Simulator', icon: '⚛️' },
    { id: 'guide', label: 'About', icon: '📖' },
  ]

  return (
    <div className="flex items-center justify-between px-4 py-2 h-12 flex-shrink-0"
         style={{
           backgroundColor: 'var(--panel-bg)',
           borderBottom: '1px solid var(--border-color)'
         }}>
      
      {/* Left: Menu + Branding */}
      <div className="flex items-center gap-3">
        {/* Hamburger Menu */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex flex-col gap-1 p-1.5 rounded hover:bg-white/5 transition-colors"
          aria-label="Menu"
        >
          <div className="w-4 h-0.5 bg-[var(--text-primary)] rounded" />
          <div className="w-4 h-0.5 bg-[var(--text-primary)] rounded" />
          <div className="w-4 h-0.5 bg-[var(--text-primary)] rounded" />
        </button>

        {/* QKD Simulator Branding (clickable to home) */}
        <button
          onClick={() => setActiveView('landing')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="font-mono text-sm text-[var(--text-primary)] tracking-wider font-semibold">
            QKD Simulator
          </span>
          <span className="px-1.5 py-0.5 rounded text-xs font-mono"
                style={{
                  backgroundColor: 'rgba(0, 204, 255, 0.15)',
                  border: '1px solid rgba(0, 204, 255, 0.5)',
                  color: '#00c8ff'
                }}>
            BB84
          </span>
        </button>
      </div>

      {/* Right: Theme Toggle + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="px-2 py-1 rounded text-xs font-mono border transition-colors flex items-center justify-center w-7 h-7"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-muted)',
            backgroundColor: 'transparent'
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
        
        <img 
          src="/srmist-logo.png" 
          alt="SRMIST Logo" 
          className="h-10 object-contain"
        />
      </div>

      {/* Dropdown Menu */}
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
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute top-12 left-4 z-50 rounded-lg shadow-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                minWidth: '200px'
              }}
            >
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id)
                    setMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-mono transition-colors ${
                    activeView === item.id
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
