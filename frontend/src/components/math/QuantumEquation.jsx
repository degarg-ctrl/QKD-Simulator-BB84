const EQUATIONS = {
  qber: {
    label: 'Quantum bit error rate equals sampled erroneous bits divided by sampled disclosed bits.',
    math: <math display="block"><mi>QBER</mi><mo>=</mo><mfrac><msub><mi>n</mi><mi>error</mi></msub><msub><mi>n</mi><mi>sample</mi></msub></mfrac></math>,
  },
  attenuation: {
    label: 'Fiber transmission equals ten raised to negative alpha distance divided by ten.',
    math: <math display="block"><mi>T</mi><mo>(</mo><mi>d</mi><mo>)</mo><mo>=</mo><msup><mn>10</mn><mrow><mo>−</mo><mfrac><mrow><mi>α</mi><mi>d</mi></mrow><mn>10</mn></mfrac></mrow></msup></math>,
  },
  entropy: {
    label: 'Binary entropy of q.',
    math: <math display="block"><msub><mi>H</mi><mn>2</mn></msub><mo>(</mo><mi>q</mi><mo>)</mo><mo>=</mo><mo>−</mo><mi>q</mi><msub><mi>log</mi><mn>2</mn></msub><mi>q</mi><mo>−</mo><mo>(</mo><mn>1</mn><mo>−</mo><mi>q</mi><mo>)</mo><msub><mi>log</mi><mn>2</mn></msub><mo>(</mo><mn>1</mn><mo>−</mo><mi>q</mi><mo>)</mo></math>,
  },
  hadamard: {
    label: 'Hadamard gate matrix equals one over square root of two times the two by two matrix one one one negative one.',
    math: <math display="block"><mi>H</mi><mo>=</mo><mfrac><mn>1</mn><msqrt><mn>2</mn></msqrt></mfrac><mfenced><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>1</mn></mtd></mtr><mtr><mtd><mn>1</mn></mtd><mtd><mo>−</mo><mn>1</mn></mtd></mtr></mtable></mfenced></math>,
  },
}

export default function QuantumEquation({ name, caption, compact = false, className = '' }) {
  const equation = EQUATIONS[name]
  if (!equation) return null
  return (
    <figure className={`quantum-equation ${compact ? 'quantum-equation--compact' : ''} ${className}`}>
      <div role="math" aria-label={equation.label}>{equation.math}</div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
