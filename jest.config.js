const nextJest = require('next/jest')

// next/jest wires up SWC transforms for TS/TSX and maps the `@/*` alias from
// tsconfig.json, so tests can import source modules the same way the app does.
const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
}

module.exports = createJestConfig(customJestConfig)
