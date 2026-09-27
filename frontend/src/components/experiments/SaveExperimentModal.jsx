import { useState, useEffect, useRef, useCallback } from 'react';
import useSimulationStore from '../../store/simulationStore';

const STORAGE_KEY = 'qkd-experiments';

export default function SaveExperimentModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  // { kind: 'success' | 'error', message } — rendered inline; a save that
  // silently closed the dialog was previously indistinguishable from Cancel.
  const [status, setStatus] = useState(null);
  const closeTimer = useRef(null);
  const params = useSimulationStore((state) => state.params);
  const placedGates = useSimulationStore((state) => state.placedGates);
  const sourceModel = useSimulationStore((state) => state.sourceModel);

  const handleClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setStatus(null);
    onClose();
  }, [onClose]);

  // Escape closes the dialog (A3).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  // Clear any pending auto-close when the component unmounts.
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleSave = () => {
    const experiment = {
      id: Date.now().toString(),
      name,
      description,
      params,
      gates: placedGates,
      sourceModel,
      createdAt: new Date().toISOString(),
    };

    // Existing storage may be corrupt (hand-edited, or written by an older
    // build). Recover to an empty list rather than throwing out of the click
    // handler, which previously left the dialog open with no explanation.
    let saved = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      saved = Array.isArray(parsed) ? parsed : [];
    } catch {
      saved = [];
    }

    saved.push(experiment);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Quota exceeded, or storage blocked by the browser (private mode).
      setStatus({
        kind: 'error',
        message: 'Could not save — browser storage is full or unavailable. Delete a saved experiment from the Load dialog and try again.',
      });
      return;
    }

    setStatus({ kind: 'success', message: `Saved “${name.trim()}” to this browser.` });
    setName('');
    setDescription('');
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      handleClose();
    }, 1100);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="border rounded-lg p-6 w-96 shadow-2xl"
           role="dialog"
           aria-modal="true"
           aria-labelledby="save-experiment-title"
           style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
        <h2 id="save-experiment-title" className="text-xl font-semibold text-cyan-400 mb-4 font-serif">Save Experiment</h2>

        <div className="mb-4">
          <label htmlFor="save-experiment-name" className="block text-sm mb-2 font-body font-medium" style={{ color: 'var(--text-muted)' }}>Name</label>
          <input
            id="save-experiment-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm font-body outline-none"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)'
            }}
            placeholder="My Experiment"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="save-experiment-description" className="block text-sm mb-2 font-body font-medium" style={{ color: 'var(--text-muted)' }}>Description (optional)</label>
          <textarea
            id="save-experiment-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm font-body h-20 outline-none resize-none"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)'
            }}
            placeholder="Describe your experiment..."
          />
        </div>

        {status && (
          <div
            role="status"
            aria-live="polite"
            className="mb-3 text-xs font-body rounded px-3 py-2"
            style={
              status.kind === 'success'
                ? { color: 'var(--q-secure)', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.35)' }
                : { color: 'var(--q-danger)', backgroundColor: 'rgba(224, 82, 82, 0.08)', border: '1px solid rgba(224, 82, 82, 0.35)' }
            }
          >
            {status.message}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-body font-semibold px-4 py-2 rounded text-sm transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleClose}
            className="flex-1 border text-sm font-body font-medium px-4 py-2 rounded transition-colors"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
              color: 'var(--text-muted)'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
