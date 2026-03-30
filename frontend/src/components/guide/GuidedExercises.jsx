import { useState } from 'react';
import ExerciseStep from './ExerciseStep';

const exercises = [
  {
    id: 1,
    title: 'Run Basic BB84',
    steps: [
      { instruction: 'Set distance to 0km', verify: (params) => params.distance_km === 0 },
      { instruction: 'Set attack probability to 0%', verify: (params) => params.attack_prob === 0 },
      { instruction: 'Click Run Simulation', verify: (results) => results !== null },
      { instruction: 'Observe QBER ≈ 0%', verify: (results) => results?.qber < 0.02 },
    ]
  },
  {
    id: 2,
    title: 'Detect Eavesdropping',
    steps: [
      { instruction: 'Set attack probability to 100%', verify: (params) => params.attack_prob === 1.0 },
      { instruction: 'Run simulation', verify: (results) => results !== null },
      { instruction: 'Observe QBER ≈ 25%', verify: (results) => results?.qber > 0.20 && results?.qber < 0.30 },
    ]
  },
  {
    id: 3,
    title: 'Explore Channel Effects',
    steps: [
      { instruction: 'Set distance to 50km', verify: (params) => params.distance_km === 50 },
      { instruction: 'Run simulation', verify: (results) => results !== null },
      { instruction: 'Note reduced key rate', verify: (results) => results?.skr < 0.1 },
    ]
  },
  {
    id: 4,
    title: 'Compare Source Models',
    steps: [
      { instruction: 'Switch to Realistic mode', verify: (sourceModel) => sourceModel === 'realistic' },
      { instruction: 'Run simulation', verify: (results) => results !== null },
      { instruction: 'Check WCP statistics', verify: (results) => results?.wcp_stats !== undefined },
    ]
  },
  {
    id: 5,
    title: 'Analyze PNS Attack',
    steps: [
      { instruction: 'Ensure Realistic mode', verify: (sourceModel) => sourceModel === 'realistic' },
      { instruction: 'Select PNS attack strategy', verify: (params) => params.attack_strategy === 'pns' },
      { instruction: 'Run simulation', verify: (results) => results !== null },
      { instruction: 'Observe low QBER but security warning', verify: (results) => results?.pns_stats !== undefined },
    ]
  },
];

export default function GuidedExercises() {
  const [activeExercise, setActiveExercise] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  if (activeExercise === null) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">Guided Exercises</h2>
        <p className="text-gray-400 mb-6">
          Complete these exercises to learn BB84 QKD step-by-step
        </p>
        <div className="space-y-3">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => { setActiveExercise(ex); setCurrentStep(0); }}
              className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded p-4"
            >
              <h3 className="text-white font-semibold">Exercise {ex.id}: {ex.title}</h3>
              <p className="text-gray-500 text-sm">{ex.steps.length} steps</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const exercise = activeExercise;
  const step = exercise.steps[currentStep];

  return (
    <div className="p-6">
      <button
        onClick={() => { setActiveExercise(null); setCurrentStep(0); }}
        className="text-cyan-400 hover:text-cyan-300 mb-4"
      >
        ← Back to exercises
      </button>
      
      <h2 className="text-2xl font-semibold text-white mb-2">
        Exercise {exercise.id}: {exercise.title}
      </h2>
      <p className="text-gray-500 mb-6">
        Step {currentStep + 1} of {exercise.steps.length}
      </p>

      <ExerciseStep
        step={step}
        onNext={() => setCurrentStep(Math.min(currentStep + 1, exercise.steps.length - 1))}
        onPrev={() => setCurrentStep(Math.max(currentStep - 1, 0))}
        isFirst={currentStep === 0}
        isLast={currentStep === exercise.steps.length - 1}
      />
    </div>
  );
}
