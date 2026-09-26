import { useState } from 'react';
import useSimulationStore from '../../store/simulationStore';

export default function SaveExperimentModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const params = useSimulationStore((state) => state.params);
  const placedGates = useSimulationStore((state) => state.placedGates);
  const sourceModel = useSimulationStore((state) => state.sourceModel);

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

    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem('qkd-experiments') || '[]');
    saved.push(experiment);
    localStorage.setItem('qkd-experiments', JSON.stringify(saved));

    onClose();
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="border rounded-lg p-6 w-96 shadow-2xl"
           style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
        <h2 className="text-xl font-semibold text-cyan-400 mb-4 font-serif">Save Experiment</h2>
        
        <div className="mb-4">
          <label className="block text-sm mb-2 font-body font-medium" style={{ color: 'var(--text-muted)' }}>Name</label>
          <input
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
          <label className="block text-sm mb-2 font-body font-medium" style={{ color: 'var(--text-muted)' }}>Description (optional)</label>
          <textarea
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

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-body font-semibold px-4 py-2 rounded text-sm transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
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
