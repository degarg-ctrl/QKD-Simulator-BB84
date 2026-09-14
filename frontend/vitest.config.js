import { defineConfig } from 'vitest/config'

// Test environment note (audit M13):
//   This project deliberately has NO DOM test environment: jsdom /
//   happy-dom are not dependencies and are not installed. The only
//   frontend tests that exist are pure-logic tests (visual encoding,
//   playback accounting, Particle lifecycle), so `environment: 'node'`
//   is the accurate setting. Do NOT switch to 'jsdom' unless the
//   dependency is actually added — component/canvas/browser behavior
//   is NOT covered by this configuration and must not be implied.
//
//   The include glob matches both `.test.js` and `.test.jsx` so a
//   future pure-logic test file is not silently skipped. It does not
//   add component/canvas coverage.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.{js,jsx}'],
        passWithNoTests: false,
    },
})
