import { useState } from 'react';
import useSimulationStore from '../../store/simulationStore';

export default function ExerciseStep({ step, onNext, onPrev, isFirst, isLast }) {
  const [showHint, setShowHint] = useState(false);
  const params = useSimulationStore((state) => state.params);
  const results = useSimulationStore((state) => state.results);
  const sourceModel = useSimulationStore((state) => state.sourceModel);

  const isComplete = step.verify(params, results, sourceModel);

  return (
    <div className="border rounded-lg p-6 font-body"
         style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--border-color)' }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold font-body mb-2" style={{ color: 'var(--text-primary)' }}>
          {step.instruction}
        </h3>
        {isComplete ? (
          <div className="text-green-400 flex items-center gap-2 font-body font-semibold text-sm">
            <span>✓</span>
            <span>Complete!</span>
          </div>
        ) : (
          <div className="text-yellow-400 flex items-center gap-2 font-body font-medium text-sm">
            <span>○</span>
            <span>In progress...</span>
          </div>
        )}
      </div>

      {step.hint && (
        <div className="mb-4">
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-cyan-400 hover:text-cyan-300 text-xs font-body font-medium"
          >
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
          {showHint && (
            <p className="text-sm mt-2 p-3 rounded border font-body leading-relaxed"
               style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
              {step.hint}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2 font-body">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="px-4 py-2 border text-sm font-body font-medium rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--card-border)',
            color: 'var(--text-primary)'
          }}
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={isLast || !isComplete}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-body font-semibold text-sm rounded transition-colors"
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

