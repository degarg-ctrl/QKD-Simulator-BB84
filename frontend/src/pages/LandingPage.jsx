/**
 * src/pages/LandingPage.jsx
 *
 * Landing page for BB84 QKD Simulator.
 * Flat design: one background, one accent color (#00aacc).
 * Font: Inter (loaded in index.html). Line height 1.6 throughout.
 * No gradients, no glassmorphism, no orbs, no decorative blurs,
 * no fake testimonials, no fake dashboards.
 */

import useSimulationStore from '../store/simulationStore'

const ACCENT = '#00aacc'

const STATS = [
  { value: '10,000', label: 'Max photon pulses per run' },
  { value: '25%',    label: 'Exact QBER when Eve intercepts every photon — per BB84 physics' },
  { value: '8',      label: 'Guided experiments, from basic BB84 to PNS attacks and decoy states' },
  { value: '0.11',   label: 'QBER threshold — above this, the simulator aborts the session automatically' },
]

const EXPERIMENTS = [
  { n: 1, title: 'Random bits, clean channel' },
  { n: 2, title: 'Manual photon encoding' },
  { n: 3, title: 'Random bits + Eve intercept' },
  { n: 4, title: 'Manual encoding + Eve' },
  { n: 5, title: 'Quantum gate transmission' },
  { n: 6, title: 'No-cloning theorem' },
  { n: 7, title: 'PNS attack with WCP source' },
  { n: 8, title: 'Decoy state protocol' },
]

const GATES = [
  { symbol: 'H', name: 'Hadamard',  desc: 'Switches polarization basis' },
  { symbol: 'X', name: 'Pauli-X',   desc: 'Bit flip' },
  { symbol: 'Y', name: 'Pauli-Y',   desc: 'Bit + phase flip' },
  { symbol: 'Z', name: 'Pauli-Z',   desc: 'Phase flip only' },
  { symbol: 'S', name: 'S Gate',    desc: '\u03c0/2 phase rotation' },
  { symbol: 'T', name: 'T Gate',    desc: '\u03c0/4 phase rotation' },
]

const STEPS = [
  {
    step: '1',
    title: 'Alice sends photons',
    body: 'Alice generates random bits and picks a random polarization basis for each one. Each bit gets encoded as a photon at 0\u00b0, 45\u00b0, 90\u00b0, or 135\u00b0 depending on the basis.',
  },
  {
    step: '2',
    title: 'The channel adds noise and loss',
    body: 'The fiber attenuates at 0.2 dB/km. Detector efficiency is 85%. Dark count probability is 1\u00d710\u207b\u2075. These are real hardware constants, not placeholders.',
  },
  {
    step: '3',
    title: 'Eve can intercept',
    body: 'Set an attack probability and Eve intercepts that fraction of photons. Intercept-resend adds exactly 25% QBER. PNS attack exploits multi-photon pulses without raising QBER at all \u2014 that\u2019s the whole point of decoy states.',
  },
  {
    step: '4',
    title: 'Bob measures and they sift',
    body: 'Bob measures each photon with a randomly chosen basis. Alice and Bob compare their basis choices over a public channel and discard every photon where they differed. The remaining bits form the sifted key.',
  },
]

// ─── sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'inherit',
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: ACCENT,
      marginBottom: '0.75rem',
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ width: '100%', height: 1, backgroundColor: 'var(--border-color)' }} />
}

function AccentBadge({ children }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '1.75rem',
      height: '1.75rem',
      flexShrink: 0,
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: 700,
      backgroundColor: ACCENT + '1a',
      color: ACCENT,
    }}>
      {children}
    </div>
  )
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { setActiveView } = useSimulationStore()
  const launch = () => setActiveView('simulator')

  const page = {
    minHeight: '100vh',
    backgroundColor: 'var(--canvas-bg)',
    color: 'var(--text-primary)',
    fontFamily: "'Inter', system-ui, sans-serif",
    lineHeight: 1.6,
  }

  const section = { maxWidth: '56rem', margin: '0 auto', padding: '5rem 1.5rem' }
  const sectionAlt = { backgroundColor: 'var(--panel-bg)' }

  const h2 = {
    fontSize: '1.5rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    marginBottom: '2.5rem',
    lineHeight: 1.3,
  }

  const bodyText = { color: 'var(--text-muted)', lineHeight: 1.6 }

  return (
    <div style={page}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ ...section, paddingTop: '6rem', paddingBottom: '5rem' }}>
        <SectionLabel>QtHack04 · BB84 Protocol · Research Tool</SectionLabel>

        <h1 style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          marginBottom: '1.5rem',
        }}>
          Quantum Key{' '}
          <span style={{ color: ACCENT }}>Distribution</span>
          <br />Simulator
        </h1>

        <p style={{ ...bodyText, fontSize: '1.0625rem', maxWidth: '40rem', marginBottom: '2.5rem' }}>
          A physics-accurate simulator of the BB84 quantum cryptography protocol.
          Set your parameters, run photons through a simulated fiber channel, and
          watch the QBER and secret key rate update in real time.
          Every formula is verified against the BB84 physics contract.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={launch}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: ACCENT,
              color: '#ffffff',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            Open Simulator
          </button>
          <button
            onClick={() => setActiveView('guide')}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              transition: 'color 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Read the Guide
          </button>
        </div>
      </section>

      <Divider />

      {/* ── CONCRETE NUMBERS ─────────────────────────────────────────────── */}
      <section style={section}>
        <SectionLabel>By the numbers</SectionLabel>
        <h2 style={h2}>What the simulator actually measures</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
          gap: '2rem',
          marginBottom: '3rem',
        }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{
                fontSize: '2.25rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                color: ACCENT,
                lineHeight: 1,
              }}>
                {s.value}
              </div>
              <div style={{ ...bodyText, fontSize: '0.8125rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Plain-text pipeline — no fake mockup */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--panel-bg)',
        }}>
          <div style={{ ...bodyText, fontSize: '0.75rem', marginBottom: '0.75rem' }}>
            Simulation pipeline — executed in this order on every run
          </div>
          <div style={{ fontFamily: "'Inter', monospace", fontSize: '0.8125rem', lineHeight: 2, overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <span style={{ color: ACCENT }}>Alice</span>
            <span style={{ color: 'var(--text-muted)' }}> — bits + bases + photon encoding</span>
            <span style={{ color: 'var(--text-subtle)' }}> → </span>
            <span>Fiber channel</span>
            <span style={{ color: 'var(--text-muted)' }}> — attenuation, noise, dark counts</span>
            <span style={{ color: 'var(--text-subtle)' }}> → </span>
            <span style={{ color: '#ff6060' }}>Eve</span>
            <span style={{ color: 'var(--text-muted)' }}> — optional intercept / PNS</span>
            <span style={{ color: 'var(--text-subtle)' }}> → </span>
            <span style={{ color: '#33cc88' }}>Bob</span>
            <span style={{ color: 'var(--text-muted)' }}> — measurement + sifting + QBER + SKR</span>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ ...sectionAlt }}>
        <div style={section}>
          <SectionLabel>How it works</SectionLabel>
          <h2 style={h2}>The BB84 protocol, step by step</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
            gap: '2.5rem',
          }}>
            {STEPS.map(item => (
              <div key={item.step} style={{ display: 'flex', gap: '1rem' }}>
                <AccentBadge>{item.step}</AccentBadge>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>
                    {item.title}
                  </div>
                  <div style={{ ...bodyText, fontSize: '0.875rem' }}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── EXPERIMENTS ──────────────────────────────────────────────────── */}
      <section style={section}>
        <SectionLabel>Experiments</SectionLabel>
        <h2 style={{ ...h2, marginBottom: '0.75rem' }}>8 guided experiment modes</h2>
        <p style={{ ...bodyText, fontSize: '0.875rem', maxWidth: '38rem', marginBottom: '2.5rem' }}>
          Each experiment pre-sets the simulator parameters and shows a modal explaining what
          you should expect to see and why. Good for walking through the protocol in order or
          for classroom demonstrations.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))',
          gap: '0.75rem',
        }}>
          {EXPERIMENTS.map(exp => (
            <div
              key={exp.n}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--panel-bg)',
              }}
            >
              <AccentBadge>{exp.n}</AccentBadge>
              <span style={{ fontSize: '0.8125rem', lineHeight: 1.5, paddingTop: '0.125rem' }}>
                {exp.title}
              </span>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── QUANTUM GATES ────────────────────────────────────────────────── */}
      <section style={{ ...sectionAlt }}>
        <div style={section}>
          <SectionLabel>Interactive</SectionLabel>
          <h2 style={{ ...h2, marginBottom: '0.75rem' }}>Drag-and-drop quantum gates</h2>
          <p style={{ ...bodyText, fontSize: '0.875rem', maxWidth: '38rem', marginBottom: '2.5rem' }}>
            Place single-qubit gates on the quantum channel lane. The gate applies its
            polarization transformation before Bob measures. Useful for studying gate-induced
            decoherence and the no-cloning theorem.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(7rem, 1fr))',
            gap: '0.75rem',
          }}>
            {GATES.map(gate => (
              <div
                key={gate.symbol}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--canvas-bg)',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  fontWeight: 700,
                  backgroundColor: ACCENT + '15',
                  color: ACCENT,
                }}>
                  {gate.symbol}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{gate.name}</div>
                <div style={{ ...bodyText, fontSize: '0.7rem', lineHeight: 1.4 }}>{gate.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section style={section}>
        <h2 style={{ ...h2, marginBottom: '1rem' }}>Ready to run it?</h2>
        <p style={{ ...bodyText, fontSize: '0.9375rem', maxWidth: '32rem', marginBottom: '2rem' }}>
          No login, no install, no setup. Set your parameters and click Run.
          The results, per-photon bit stream, and charts appear straight away.
        </p>
        <button
          onClick={launch}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: ACCENT,
            color: '#ffffff',
            transition: 'opacity 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          Open Simulator
        </button>
      </section>

    </div>
  )
}
