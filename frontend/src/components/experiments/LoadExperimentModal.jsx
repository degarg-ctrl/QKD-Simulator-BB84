import { useState, useEffect, useCallback } from 'react';
import useSimulationStore from '../../store/simulationStore';
import { validateParams } from '../../api/simulatorAPI';

const STORAGE_KEY = 'qkd-experiments';

/** Read the saved list, tolerating corrupt or non-array storage. */
function readSaved() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Accept only files that this app can actually load and render.
 * Valid JSON with the wrong shape previously crashed the list render at
 * `exp.params.n_bits`. Parameter ranges are checked with the same
 * `validateParams` the API client uses, so an import that the backend would
 * reject is caught here instead of at run time.
 *
 * @returns {string|null} null when acceptable, otherwise the reason.
 */
function validateExperimentShape(exp) {
  if (!exp || typeof exp !== 'object' || Array.isArray(exp)) {
    return 'the file does not contain a single experiment object';
  }
  if (typeof exp.name !== 'string' || !exp.name.trim()) {
    return 'the experiment has no name';
  }
  if (!exp.params || typeof exp.params !== 'object') {
    return 'the experiment has no parameter set';
  }
  const paramsError = validateParams(exp.params);
  if (paramsError) {
    return paramsError;
  }
  if (exp.gates != null && !Array.isArray(exp.gates)) {
    return 'the gate list is not an array';
  }
  return null;
}

export default function LoadExperimentModal({ isOpen, onClose }) {
  const [experiments, setExperiments] = useState(readSaved);
  // { kind: 'success' | 'error', message } — replaces the native alert().
  const [status, setStatus] = useState(null);
  const applySimulationConfiguration = useSimulationStore((state) => state.applySimulationConfiguration);

  const handleClose = useCallback(() => {
    setStatus(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => setExperiments(readSaved()), 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Escape closes the dialog (A3).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  /** Persist the list; report rather than fail silently on a storage error. */
  const persist = (list, failureMessage) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch {
      setStatus({ kind: 'error', message: failureMessage });
      return false;
    }
  };

  const handleLoad = (experiment) => {
    // An entry written by an older build (or hand-edited storage) may have no
    // usable parameter set. Say so rather than closing with nothing applied.
    if (!experiment.params || typeof experiment.params !== 'object') {
      setStatus({
        kind: 'error',
        message: `“${experiment.name}” has no saved parameters and cannot be loaded. Delete it and save the experiment again.`,
      });
      return;
    }

    const shapeError = validateExperimentShape(experiment);
    if (shapeError) {
      setStatus({
        kind: 'error',
        message: `“${experiment.name || 'Untitled experiment'}” cannot be loaded — ${shapeError}. Delete it and save the experiment again.`,
      });
      return;
    }
    applySimulationConfiguration({
      params: experiment.params,
      sourceModel: experiment.sourceModel || 'ideal',
      activeExperiment: null,
      placedGates: experiment.gates || [],
    });
    handleClose();
  };

  const handleDelete = (id) => {
    const updated = experiments.filter(exp => exp.id !== id);
    if (persist(updated, 'Could not update browser storage. The experiment was not deleted.')) {
      setExperiments(updated);
      setStatus(null);
    }
  };

  const handleExport = (experiment) => {
    const dataStr = JSON.stringify(experiment, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${experiment.name.replace(/\s+/g, '_')}.json`;
    link.click();
    // Release the blob; without this every export leaked one for the lifetime
    // of the document.
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onerror = () => {
        setStatus({
          kind: 'error',
          message: `Could not read “${file.name}”. Check that the file still exists and is readable, then try again.`,
        });
      };

      reader.onload = (event) => {
        let experiment;
        try {
          experiment = JSON.parse(event.target.result);
        } catch {
          setStatus({
            kind: 'error',
            message: `“${file.name}” is not valid JSON. Import a file produced by the Export button.`,
          });
          return;
        }

        const shapeError = validateExperimentShape(experiment);
        if (shapeError) {
          setStatus({
            kind: 'error',
            message: `“${file.name}” is not a usable experiment — ${shapeError}. Import a file produced by the Export button.`,
          });
          return;
        }

        const updated = [...readSaved(), { ...experiment, id: Date.now().toString() }];
        if (persist(updated, 'Could not save the imported experiment — browser storage is full or unavailable.')) {
          setExperiments(updated);
          setStatus({ kind: 'success', message: `Imported “${experiment.name}”.` });
        }
      };

      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="border rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto shadow-2xl"
           role="dialog"
           aria-modal="true"
           aria-labelledby="load-experiment-title"
           style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex justify-between items-center mb-4">
          <h2 id="load-experiment-title" className="text-xl font-semibold text-cyan-400 font-serif">Load Experiment</h2>
          <button
            onClick={handleImport}
            className="text-xs border px-3 py-1.5 rounded font-body font-medium transition-colors"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)'
            }}
          >
            Import JSON
          </button>
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

        {experiments.length === 0 ? (
          <p className="text-center py-8 font-body text-sm" style={{ color: 'var(--text-muted)' }}>No saved experiments</p>
        ) : (
          <div className="space-y-2">
            {experiments.map((exp) => (
              <div key={exp.id} className="border rounded p-3"
                   style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold font-body text-sm" style={{ color: 'var(--text-primary)' }}>{exp.name}</h3>
                    {exp.description && (
                      <p className="text-xs mt-0.5 font-body" style={{ color: 'var(--text-muted)' }}>{exp.description}</p>
                    )}
                    <p className="text-xs mt-1 font-body text-[var(--text-subtle)]">
                      {Number.isNaN(Date.parse(exp.createdAt))
                        ? 'Date unknown'
                        : new Date(exp.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleLoad(exp)}
                      className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-body font-semibold px-2 py-1 rounded"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleExport(exp)}
                      className="text-xs border font-body font-medium px-2 py-1 rounded transition-colors"
                      style={{
                        backgroundColor: 'var(--panel-bg)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      Export
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white font-body font-semibold px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {/* Entries written by an older build may lack params — render
                    what is there rather than crashing the whole list. */}
                <div className="text-xs font-body" style={{ color: 'var(--text-subtle)' }}>
                  <span className="font-mono tabular-nums">{exp.params?.n_bits ?? '—'}</span> bits, <span className="font-mono tabular-nums">{exp.params?.distance_km ?? '—'}</span>km, {exp.sourceModel || 'ideal'}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleClose}
          className="w-full mt-4 border font-body font-medium text-sm px-4 py-2 rounded transition-colors"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--text-muted)'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
