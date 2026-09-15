const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

module.exports = createJestConfig({
  clearMocks: true,
  collectCoverageFrom: ['src/services/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.[jt]s?(x)'],
})
