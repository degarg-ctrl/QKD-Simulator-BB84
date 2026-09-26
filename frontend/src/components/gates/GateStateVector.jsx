import { motion, AnimatePresence } from 'framer-motion';

export default function GateStateVector({ gate, position, isHovered }) {
  const stateVector = calculateStateVector(gate);

  const formatComplex = (amplitude) => {
    const real = amplitude.real.toFixed(3);
    const imag = amplitude.imag.toFixed(3);
    if (Math.abs(amplitude.imag) < 0.001) return real;
    if (amplitude.imag >= 0) return `${real}+${imag}i`;
    return `${real}${imag}i`;
  };

  const prob0 = (stateVector.alpha.real ** 2 + stateVector.alpha.imag ** 2).toFixed(3);
  const prob1 = (stateVector.beta.real ** 2 + stateVector.beta.imag ** 2).toFixed(3);

  return (
    <AnimatePresence>
      {isHovered && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute border border-cyan-500 rounded px-3 py-2 text-xs z-50 pointer-events-none shadow-lg"
          style={{
            left: position.x + 40,
            top: position.y - 80,
            backgroundColor: 'var(--tooltip-bg, var(--panel-bg))'
          }}
        >
          <div className="font-mono text-cyan-400 whitespace-nowrap font-semibold">
            |ψ⟩ = {formatComplex(stateVector.alpha)}|0⟩ + {formatComplex(stateVector.beta)}|1⟩
          </div>
          <div className="mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
            P(0) = {prob0}
          </div>
          <div className="font-mono" style={{ color: 'var(--text-muted)' }}>
            P(1) = {prob1}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function calculateStateVector(gate) {
  let alpha = { real: 1, imag: 0 };
  let beta = { real: 0, imag: 0 };

  switch (gate.type) {
    case 'H':
      alpha = { real: 1/Math.sqrt(2), imag: 0 };
      beta = { real: 1/Math.sqrt(2), imag: 0 };
      break;
    case 'X':
      alpha = { real: 0, imag: 0 };
      beta = { real: 1, imag: 0 };
      break;
    case 'Y':
      alpha = { real: 0, imag: 0 };
      beta = { real: 0, imag: 1 };
      break;
    case 'Z':
      alpha = { real: 1, imag: 0 };
      beta = { real: 0, imag: 0 };
      break;
    case 'S':
      alpha = { real: 1, imag: 0 };
      beta = { real: 0, imag: 1 };
      break;
    case 'T':
      alpha = { real: 1, imag: 0 };
      beta = { real: Math.cos(Math.PI/8), imag: Math.sin(Math.PI/8) };
      break;
  }

  return { alpha, beta };
}
