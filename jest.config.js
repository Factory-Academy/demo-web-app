/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    // Mirror the `@/*` alias from tsconfig.json.
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    // Jest injects the test globals at runtime, and the repo ships no
    // `@types/jest`, so ts-jest transpiles without type-checking here;
    // type-checking is handled separately by `tsc`.
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
}
