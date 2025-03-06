module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/__tests__/**/*.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 20,
      functions: 65,
      lines: 70
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/backend/$1'
  },
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  rootDir: '.',
  modulePaths: ['<rootDir>/src/backend']
}; 