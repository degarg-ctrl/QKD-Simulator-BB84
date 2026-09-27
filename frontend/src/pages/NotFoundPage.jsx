/**
 * NotFoundPage.jsx
 *
 * Shown for any URL the app does not serve.
 *
 * Views inside QKDSimFlow are selected by the Zustand `activeView` field, not by
 * the URL, so the recovery buttons have to do two things: set the view the user
 * asked for, and send the browser back to "/" where the app is actually mounted.
 * Setting `activeView` alone would leave the unknown path in the address bar and
 * this page on screen.
 *
 * Styling reuses the landing page's own heading/button conventions and the
 * existing --q-* tokens; no new branding is introduced.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Play } from 'lucide-react'
import useSimulationStore from '../store/simulationStore'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const setActiveView = useSimulationStore((s) => s.setActiveView)

  useEffect(() => {
    document.title = 'Page Not Found — QKDSimFlow'
  }, [])

  const goTo = (view) => {
    setActiveView(view)
    navigate('/', { replace: true })
  }

  return (
    <div
      className="h-full w-full flex items-center justify-center px-6"
      style={{ backgroundColor: 'var(--canvas-bg)' }}
    >
      <div className="max-w-xl">
        <p
          className="font-mono mb-3"
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--q-accent)',
          }}
        >
          404
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(1.9rem, 4vw, 2.75rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            color: 'var(--q-text-1)',
            marginBottom: '0.85rem',
          }}
        >
          This page does not exist
        </h1>

        <p
          className="font-body"
          style={{
            fontSize: '0.95rem',
            lineHeight: 1.65,
            color: 'var(--q-text-3)',
            marginBottom: '1.75rem',
          }}
        >
          The address you opened is not part of QKDSimFlow. Nothing was lost — any
          simulation you had running is still in this browser session. Pick a
          destination below to return to the bench.
        </p>

        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => goTo('landing')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: '0.35rem',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body), sans-serif',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: 'var(--q-accent, #f59e0b)',
              color: '#0e0e12',
            }}
          >
            <Home size={15} aria-hidden="true" /> Return to Overview
          </button>

          <button
            onClick={() => goTo('simulator')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: '0.35rem',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-body), sans-serif',
              fontWeight: 600,
              cursor: 'pointer',
              backgroundColor: 'var(--q-surface-2, #1c1c23)',
              color: 'var(--q-text-2, #d1d1d8)',
              border: '1px solid var(--q-border, #2e2e38)',
            }}
          >
            <Play size={15} fill="currentColor" aria-hidden="true" /> Open Simulator
          </button>
        </div>
      </div>
    </div>
  )
}
