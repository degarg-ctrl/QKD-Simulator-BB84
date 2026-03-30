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
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96">
        <h2 className="text-xl font-semibold text-cyan-400 mb-4">Save Experiment</h2>
        
        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="My Experiment"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-400 text-sm mb-2">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white h-20"
            placeholder="Describe your experiment..."
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
