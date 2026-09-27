/**
 * SimulationErrorBanner.jsx
 *
 * Renders the store's `error` string, which previously had no UI surface at
 * all: a failed run left the previous verdict on screen and RUN appeared to do
 * nothing. Inline strip under the top bar rather than a toast — the failure is
 * persistent state, not a transient notification.
 *
 * Shows what failed and what to do next. Never renders stack traces or raw
 * internals; the message shown is one the app produced deliberately
 * (`useSimulation` / `simulatorAPI`), not an exception body.
 */
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import useSimulationStore from '../../store/simulationStore'

/**
 * Map an app-produced error string to a heading and a next step.
 * Falls back to a generic pair so an unrecognised message still reads as a
 * failure with an action, never as a bare internal string.
 */
function describe(message) {
  if (message.startsWith('Validation Error:')) {
    return {
      title: 'Simulation parameters are out of range',
      detail: message.replace(/^Validation Error:\s*/, ''),
      next: 'Adjust the highlighted value in the Parameters rail, then run again.',
    }
  }
  if (message.startsWith('Could not connect')) {
    return {
      title: 'Simulation backend unreachable',
      detail: 'The request never reached the simulation service.',
      next: 'Start the backend (uvicorn on port 8000), then run again.',
    }
  }
  return {
    title: 'Simulation did not complete',
    detail: message,
    next: 'Run again. If it keeps failing, check the backend log for this request.',
  }
}

export default function SimulationErrorBanner() {
  const error = useSimulationStore((s) => s.error)
  const setError = useSimulationStore((s) => s.setError)
  const described = error ? describe(error) : null

  return (
    <AnimatePresence>
      {described && (
        <motion.div
          key="simulation-error"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          role="alert"
          aria-live="assertive"
          className="flex-shrink-0 overflow-hidden"
          style={{
            backgroundColor: 'rgba(224, 82, 82, 0.08)',
            borderBottom: '1px solid rgba(224, 82, 82, 0.35)',
          }}
        >
          <div className="flex items-start gap-2.5 px-3 py-2">
            <AlertTriangle
              size={15}
              className="flex-shrink-0 mt-0.5"
              style={{ color: 'var(--q-danger)' }}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1 font-body">
              <div
                className="text-xs font-semibold"
                style={{ color: 'var(--q-danger)' }}
              >
                {described.title}
              </div>
              <div className="text-[11px] mt-0.5 text-[var(--q-text-2)] break-words">
                {described.detail}
              </div>
              <div className="text-[11px] mt-0.5 text-[var(--q-text-3)]">
                {described.next}
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss simulation error"
              className="flex-shrink-0 p-1 rounded transition-colors text-[var(--q-text-3)] hover:text-[var(--q-text-1)] hover:bg-[var(--q-surface-active)]"
            >
              <X size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
