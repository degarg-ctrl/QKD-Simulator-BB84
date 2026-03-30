import { useState } from 'react';
import useSimulationStore from '../../store/simulationStore';

export default function ExerciseStep({ step, onNext, onPrev, isFirst, isLast }) {
  const [showHint, setShowHint] = useState(false);
  const params = useSimulationStore((state) => state.params);
  const results = useSimulationStore((state) => state.results);
  const sourceModel = useSimulationStore((state) => state.sourceModel);

  const isComplete = step.verify(params, results, sourceModel);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          {step.instruction}
        </h3>
        {isComplete ? (
          <div className="text-green-400 flex items-center gap-2">
            <span>✓</span>
            <span>Complete!</span>
          </div>
        ) : (
          <div className="text-yellow-400 flex items-center gap-2">
            <span>○</span>
            <span>In progress...</span>
          </div>
        )}
      </div>

      {step.hint && (
        <div className="mb-4">
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-cyan-400 hover:text-cyan-300 text-sm"
          >
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && (
            <p className="text-gray-400 text-sm mt-2 bg-gray-900 p-3 rounded">
              {step.hint}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={isLast || !isComplete}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded"
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
