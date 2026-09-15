/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  // Mirror the `@/*` path alias from tsconfig.json so `@/services/...`
  // imports resolve under ts-jest.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    // tsconfig.json already sets "isolatedModules": true, so ts-jest transpiles
    // per-file without whole-program type checking; `tsc` handles type checking.
    '^.+\\.tsx?$': ['ts-jest', {}],
  },
}
