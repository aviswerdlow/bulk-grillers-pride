/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'web',
      testMatch: ['<rootDir>/apps/web/**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      preset: 'ts-jest',
      resolver: '<rootDir>/jest.resolver.js',
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: {
              jsx: 'react-jsx',
              jsxImportSource: 'react',
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
        '^.+\\.(mjs|cjs)$': [
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
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        // Specific mocks first (order matters!)
        '^@convex/_generated/api$': '<rootDir>/__mocks__/convex/_generated/api.js',
        '^@convex/_generated/dataModel$': '<rootDir>/__mocks__/convex/_generated/dataModel.js',
        '^.*/convex/_generated/api$': '<rootDir>/__mocks__/convex/_generated/api.js',
        '^convex/_generated/api$': '<rootDir>/__mocks__/convex/_generated/api.js',
        '^.*/convex/_generated/dataModel$': '<rootDir>/__mocks__/convex/_generated/dataModel.js',
        '^convex/_generated/dataModel$': '<rootDir>/__mocks__/convex/_generated/dataModel.js',
        '^convex/react$': '<rootDir>/__mocks__/convex/react.jsx',
        '^lucide-react$': '<rootDir>/apps/web/src/__tests__/__mocks__/lucide-react.jsx',
        '^@radix-ui/react-dialog$':
          '<rootDir>/apps/web/src/__tests__/__mocks__/@radix-ui/react-dialog.tsx',
        // Generic @convex mapping last
        '^@convex/(.*)$': '<rootDir>/convex/$1',
      },
      moduleDirectories: ['node_modules', '<rootDir>'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/apps/web/.next/'],
      transformIgnorePatterns: ['node_modules/(?!(convex|@radix-ui.*|cmdk)/)'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    },
    {
      displayName: 'convex',
      testMatch: ['<rootDir>/convex/**/__tests__/**/*.(test|spec).(ts|js)'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      resolver: '<rootDir>/jest.resolver.js',
      transform: {
        '^.+\\.(ts|js)$': [
          'ts-jest',
          {
            tsconfig: '<rootDir>/convex/tsconfig.json',
            isolatedModules: true,
            useESM: false,
          },
        ],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/convex/$1',
      },
      transformIgnorePatterns: ['node_modules/(?!(convex|convex-test)/)'],
      testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/convex/_generated/'],
      extensionsToTreatAsEsm: [],
    },
    {
      displayName: 'test-factories',
      testMatch: ['<rootDir>/packages/test-factories/**/__tests__/**/*.(test|spec).(ts|js)'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      transform: {
        '^.+\\.(ts|js)$': [
          'ts-jest',
          {
            tsconfig: {
              allowJs: true,
              esModuleInterop: true,
              strict: true,
            },
          },
        ],
      },
      testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/packages/test-factories/dist/',
      ],
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
  // PHASE 1: Coverage thresholds set to 15% (current: 11.85%)
  // Gradual increase plan: 7% → 15% → 30% → 50% → 70%
  // Next milestone: 30% after critical business logic tests are added
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 15,
      lines: 15,
      statements: 15,
    },
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  watchPlugins: ['jest-watch-typeahead/filename', 'jest-watch-typeahead/testname'],
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  // Run tests in parallel within each project
  maxConcurrency: 5,
};
