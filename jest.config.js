/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'web',
      testMatch: ['<rootDir>/apps/web/**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      preset: 'ts-jest',
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react',
            },
          },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/apps/web/src/$1',
        '^~/(.*)$': '<rootDir>/apps/web/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      moduleDirectories: ['node_modules', '<rootDir>'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/apps/web/.next/'],
      transformIgnorePatterns: ['node_modules/(?!(convex)/)'],
    },
    {
      displayName: 'convex',
      testMatch: ['<rootDir>/convex/**/__tests__/**/*.(test|spec).(ts|js)'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      transform: {
        '^.+\\.(ts|js)$': [
          'ts-jest',
          {
            tsconfig: '<rootDir>/convex/tsconfig.json',
          },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/convex/$1',
      },
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/convex/_generated/'],
    },
  ],
  collectCoverageFrom: [
    'apps/web/src/**/*.{ts,tsx}',
    'convex/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/_generated/**',
    '!**/.next/**',
    '!**/coverage/**',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
};
