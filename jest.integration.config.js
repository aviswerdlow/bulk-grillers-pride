/** @type {import('jest').Config} */
module.exports = {
  displayName: 'integration',
  testMatch: [
    '<rootDir>/apps/web/**/__integration__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '<rootDir>/convex/**/__integration__/**/*.(test|spec).(ts|js)',
    '<rootDir>/integration-tests/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  preset: 'ts-jest',
  resolver: '<rootDir>/jest.resolver.js',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          jsxImportSource: 'react',
          allowJs: true,
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
    '^.+\\.(js|jsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          jsxImportSource: 'react',
          allowJs: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/web/src/$1',
    '^~/(.*)$': '<rootDir>/apps/web/$1',
    '^@convex/(.*)$': '<rootDir>/convex/$1',
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/apps/web/.next/',
    '<rootDir>/convex/_generated/',
  ],
  transformIgnorePatterns: ['node_modules/(?!(convex|@radix-ui.*|cmdk)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // Integration test specific settings
  testTimeout: 30000, // 30 seconds for integration tests
  globals: {
    'ts-jest': {
      isolatedModules: false, // Integration tests need full type checking
    },
  },
  // Environment variables for integration tests
  testEnvironmentOptions: {
    env: {
      NODE_ENV: 'test',
      INTEGRATION_TEST: 'true',
    },
  },
  // Ensure tests run sequentially for database operations
  maxWorkers: 1,
  // Verbose output for debugging integration tests
  verbose: true,
};