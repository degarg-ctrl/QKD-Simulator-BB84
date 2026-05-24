"""
generate_reports.py
Reads .results_cache.json and generates:
  - TEST_RESULTS.md  (averages per combo, pass/fail per assert)
  - TEST_FINDINGS.md (deviations from theory, comparisons)

Usage (from qkd-simulator/backend/):
  & ".\.venv\Scripts\python.exe" tests/runs/2026-05-04_comprehensive-validation/suite/generate_reports.py
"""

import json
import sys
from pathlib import Path
from datetime import date

_SUITE_DIR   = Path(__file__).parent
_RUN_DIR     = _SUITE_DIR.parent
_BACKEND_DIR = _SUITE_DIR.parent.parent.parent.parent

CACHE_PATH   = _RUN_DIR / '.results_cache.json'
RESULTS_PATH = _RUN_DIR / 'TEST_RESULTS.md'
FINDINGS_PATH = _RUN_DIR / 'TEST_FINDINGS.md'

TODAY = date.today().isoformat()

if not CACHE_PATH.exists():
    print(f'ERROR: Cache not found at {CACHE_PATH}')
    print('Run collect_measured_values.py first.')
    sys.exit(1)

with open(CACHE_PATH, encoding='utf-8') as f:
    data = json.load(f)


def rows(section: int):
    return [r for r in data if r.get('section') == section]


def fmt(v, decimals=4):
    if isinstance(v, float):
        return f'{v:.{decimals}f}'
    return str(v)


# ===========================================================================
# TEST_RESULTS.md
# ===========================================================================

lines = [
    f'# TEST RESULTS — Comprehensive Validation',
    f'**Run date:** {TODAY}  ',
    f'**Run folder:** `2026-05-04_comprehensive-validation`  ',
    f'**Total rows in cache:** {len(data)}',
    '',
]

# ─── Section 1 ──────────────────────────────────────────────────────────────
lines += [
    '---',
    '## Section 1 — n_bits Sweep',
    '| n_bits | mean QBER | std QBER | mean SKR | mean sifted | PASS? |',
    '|---|---|---|---|---|---|',
]
for r in rows(1):
    ok = r['mean_qber'] < 0.02
    lines.append(
        f"| {r['n_bits']} | {fmt(r['mean_qber'])} | {fmt(r['std_qber'])} | "
        f"{fmt(r['mean_skr'])} | {fmt(r['mean_sifted_key_length'],0)} | "
        f"{'✅' if ok else '❌'} |"
    )

# ─── Section 2 ──────────────────────────────────────────────────────────────
lines += [
    '',
    '---',
    '## Section 2 — Distance Sweep',
    '| distance_km | survival_fraction | mean QBER | mean SKR | mean sifted |',
    '|---|---|---|---|---|',
]
for r in rows(2):
    lines.append(
        f"| {r['distance_km']} | {fmt(r['mean_survival_fraction'])} | "
        f"{fmt(r['mean_qber'])} | {fmt(r['mean_skr'])} | "
        f"{fmt(r.get('mean_sifted_key_length',0),0)} |"
    )

# ─── Section 3 ──────────────────────────────────────────────────────────────
lines += [
    '',
    '---',
    '## Section 3 — Noise Sweep',
    '| noise_level | mean QBER | std QBER | mean SKR | PASS (QBER≈noise±0.03)? |',
    '|---|---|---|---|---|',
]
for r in rows(3):
    noise = r['noise_level']
    ok = abs(r['mean_qber'] - noise) <= 0.03 if noise <= 0.10 else True
    lines.append(
        f"| {noise} | {fmt(r['mean_qber'])} | {fmt(r['std_qber'])} | "
        f"{fmt(r['mean_skr'])} | {'✅' if ok else '❌'} |"
    )

# ─── Section 4 ──────────────────────────────────────────────────────────────
lines += [
    '',
    '---',
    '## Section 4 — Eve Attack Strategies',
    '| strategy | attack_prob | mean QBER | std QBER | mean SKR |',
    '|---|---|---|---|---|',
]
for r in rows(4):
    lines.append(
        f"| {r['attack_strategy']} | {r['attack_prob']} | "
        f"{fmt(r['mean_qber'])} | {fmt(r['std_qber'])} | {fmt(r['mean_skr'])} |"
    )

# ─── Section 5 ──────────────────────────────────────────────────────────────
lines += [
    '',
    '---',
    '## Section 5 — Realistic Source Model',
    '| μ | decoy | strategy | mean QBER | mean SKR | PASS (PNS QBER<0.05)? |',
    '|---|---|---|---|---|---|',
]
for r in rows(5):
    is_pns = r.get('attack_strategy') == 'pns'
    ok = r['mean_qber'] < 0.05 if is_pns else True
    lines.append(
        f"| {r.get('mu','-')} | {r.get('decoy_enabled','-')} | "
        f"{r.get('attack_strategy')} | {fmt(r['mean_qber'])} | "
        f"{fmt(r['mean_skr'])} | {'✅' if ok else '❌'} |"
    )

# ─── Section 6 ──────────────────────────────────────────────────────────────
lines += [
    '',
    '---',
    '## Section 6 — Gate Functionality',
    '| gate | mean QBER | std QBER | mean SKR |',
    '|---|---|---|---|',
]
for r in rows(6):
    lines.append(
        f"| {r['gate']} | {fmt(r['mean_qber'])} | {fmt(r['std_qber'])} | "
        f"{fmt(r['mean_skr'])} |"
    )

# ─── Section 7 ──────────────────────────────────────────────────────────────
lines += [
    '',
    '---',
    '## Section 7 — Single Photon Mode (200 trials each)',
    '| distance_km | noise | attack_prob | arrived | lost | loss_rate | PASS (100km loss>0.80)? |',
    '|---|---|---|---|---|---|---|',
]
for r in rows(7):
    ok = (r['loss_rate'] > 0.80) if r['distance_km'] == 100 else True
    lines.append(
        f"| {r['distance_km']} | {r['noise_level']} | {r['attack_prob']} | "
        f"{r.get('arrived','?')} | {r.get('lost','?')} | "
        f"{fmt(r.get('loss_rate',0))} | {'✅' if ok else '❌'} |"
    )

RESULTS_PATH.write_text('\n'.join(lines), encoding='utf-8')
print(f'✓ TEST_RESULTS.md written: {RESULTS_PATH}')


# ===========================================================================
# TEST_FINDINGS.md
# ===========================================================================

f_lines = [
    f'# TEST FINDINGS — Comprehensive Validation',
    f'**Run date:** {TODAY}  ',
    '',
    '## Theoretical Comparison',
    '',
    '| Scenario | Theory | Measured | Deviation | Source |',
    '|---|---|---|---|---|',
]

# --- QBER baseline ---
s1 = [r for r in rows(1) if r['n_bits'] == 5000]
if s1:
    mq = s1[0]['mean_qber']
    f_lines.append(f'| No Eve, no noise, 0km | < 2% | {mq*100:.2f}% | '
                   f'{abs(mq - 0.0)*100:.2f}% | BB84 (Bennett & Brassard 1984) |')

# --- Full Eve QBER ---
s4_full = [r for r in rows(4) if r.get('attack_strategy') == 'intercept_resend' and r.get('attack_prob') == 1.0]
if s4_full:
    mq = s4_full[0]['mean_qber']
    f_lines.append(f'| 100% intercept_resend | 25% | {mq*100:.2f}% | '
                   f'{abs(mq - 0.25)*100:.2f}% | BB84 security proof |')

# --- Half Eve QBER ---
s4_half = [r for r in rows(4) if r.get('attack_strategy') == 'intercept_resend' and r.get('attack_prob') == 0.5]
if s4_half:
    mq = s4_half[0]['mean_qber']
    f_lines.append(f'| 50% intercept_resend | 12.5% | {mq*100:.2f}% | '
                   f'{abs(mq - 0.125)*100:.2f}% | Linear scaling |')

# --- 50km survival ---
s2_50 = [r for r in rows(2) if r.get('distance_km') == 50]
if s2_50:
    ms = s2_50[0]['mean_survival_fraction']
    f_lines.append(f'| 50km survival | ~10% | {ms*100:.2f}% | '
                   f'{abs(ms - 0.10)*100:.2f}% | Beer-Lambert α=0.2 dB/km |')

# --- 100km survival ---
s2_100 = [r for r in rows(2) if r.get('distance_km') == 100]
if s2_100:
    ms = s2_100[0]['mean_survival_fraction']
    f_lines.append(f'| 100km survival | ~1% | {ms*100:.2f}% | '
                   f'{abs(ms - 0.01)*100:.2f}% | Beer-Lambert α=0.2 dB/km |')

# --- PNS QBER ---
pns_rows = [r for r in rows(5) if r.get('attack_strategy') == 'pns']
if pns_rows:
    mq = min(r['mean_qber'] for r in pns_rows)
    f_lines.append(f'| PNS attack QBER | < 5% | {mq*100:.2f}% | '
                   f'{"✅ PASS" if mq < 0.05 else "❌ FAIL"} | Lo & Preskill 2007 |')

f_lines += [
    '',
    '## Observations',
    '',
    '*(Generated automatically — add manual observations below)*',
    '',
    '### Section 1 — n_bits Convergence',
    '- QBER variance should decrease as n_bits increases. Check std_qber column in TEST_RESULTS.',
    '',
    '### Section 2 — Distance Attenuation',
    '- Check that survival_fraction at 150km approaches ~0.001 (near complete loss).',
    '',
    '### Section 3 — Noise Linearity',
    '- QBER should track noise_level almost exactly up to 10%. Any deviation > 0.03 is a finding.',
    '',
    '### Section 4 — Eve Strategies',
    '- Partial and Burst attacks at 100% should approach ~25% QBER if they use full interception.',
    '  Lower values indicate they are probabilistic (expected behavior).',
    '',
    '### Section 5 — Realistic Mode',
    '- PNS attack QBER must remain < 5% to satisfy PHYSICS_CONTRACT.',
    '',
    '### Section 6 — Gates',
    '- H gate expected to raise QBER significantly (basis randomisation).',
    '- Z gate expected to have minimal QBER change vs baseline.',
    '- X gate expected to shift bob_bit mean toward 0.5 (bit flip).',
    '',
    '### Section 7 — Single Photon',
    '- Loss rate at 100km should exceed 80% per Beer-Lambert.',
    '- At 0km, most photons should arrive (85% by detector efficiency).',
    '',
    '## References',
    '- Bennett, C.H. & Brassard, G. (1984). Quantum cryptography: Public key distribution and coin tossing.',
    '- Shor, P. & Preskill, J. (2000). Simple proof of security of the BB84 quantum key distribution protocol.',
    '- Lo, H.K. & Preskill, J. (2007). Security of quantum key distribution using weak coherent states with nonrandom phases.',
]

FINDINGS_PATH.write_text('\n'.join(f_lines), encoding='utf-8')
print(f'✓ TEST_FINDINGS.md written: {FINDINGS_PATH}')
print('\nAll reports generated. Test run complete.')
