/**
 * UniversalTopBar.jsx
 * 
 * Universal navigation bar for all pages.
 * Contains: QKD Simulator branding, hamburger menu (Home/Simulator/About), theme toggle
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Atom, BookOpen, Sun, Moon, Menu } from 'lucide-react'
import useSimulationStore from '../../store/simulationStore'

export default function UniversalTopBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { activeView, setActiveView, theme, setTheme } = useSimulationStore()

  const menuItems = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'simulator', label: 'Simulator', icon: Atom },
    { id: 'guide', label: 'About', icon: BookOpen },
  ]

  return (
    <div className="flex items-center justify-between px-3 py-1.5 h-12 flex-shrink-0 z-30 select-none"
         style={{
           backgroundColor: 'var(--q-surface-1)',
           borderBottom: '1px solid var(--q-border)'
         }}>
      
      {/* Left: Menu + Branding */}
      <div className="flex items-center gap-3">
        {/* Hamburger Menu */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 rounded transition-colors text-[var(--q-text-2)] hover:text-[var(--q-text-1)] hover:bg-[var(--q-surface-active)]"
          aria-label="Menu"
        >
          <Menu size={17} />
        </button>

        {/* QKD Simulator Branding (clickable to home) */}
        <button
          onClick={() => setActiveView('landing')}
          className="flex items-center gap-2 hover:opacity-85 transition-opacity"
        >
          <span className="font-body text-sm tracking-wide font-bold text-[var(--q-text-1)]">
            QKDSimFlow
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-body font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'var(--q-surface-2)',
                  border: '1px solid var(--q-border)',
                  color: 'var(--q-accent)'
                }}>
            BB84
          </span>
        </button>
      </div>

      {/* Right: Theme Toggle + Logo */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1 rounded text-xs border transition-colors flex items-center justify-center w-7 h-7 text-[var(--q-text-3)] hover:text-[var(--q-text-1)] hover:bg-[var(--q-surface-active)]"
          style={{
            borderColor: 'var(--q-border)',
            backgroundColor: 'var(--q-surface-2)'
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
        
        <img 
          src="/srmist-logo.png" 
          alt="SRMIST Logo" 
          className="h-8 object-contain ml-1 opacity-90 hover:opacity-100 transition-opacity"
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
              {menuItems.map((item) => {
                const IconComponent = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id)
                      setMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-body font-medium transition-colors ${
                      activeView === item.id
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                  >
                    <IconComponent size={16} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
