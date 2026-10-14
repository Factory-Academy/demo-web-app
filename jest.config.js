const nextJest = require('next/jest')

// `next/jest` wires up the SWC transform (TS + JSX) and reads the `@/*` path
// alias from tsconfig.json, so tests resolve imports the same way the app does.
const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
}

module.exports = createJestConfig(customConfig)
