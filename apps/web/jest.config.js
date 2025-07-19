const rootConfig = require('../../jest.config.js');

// Extract the web project configuration from the root config
const webProjectConfig = rootConfig.projects.find((project) => project.displayName === 'web');

module.exports = {
  ...webProjectConfig,
  rootDir: '../..',
  // Override paths to be relative to this file
  testMatch: ['<rootDir>/apps/web/**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)'],
  coverageDirectory: '<rootDir>/apps/web/coverage',
  collectCoverageFrom: [
    '<rootDir>/apps/web/src/**/*.{ts,tsx}',
    '!<rootDir>/apps/web/src/**/*.d.ts',
    '!<rootDir>/apps/web/src/**/__tests__/**',
    '!<rootDir>/apps/web/src/__tests__/**',
  ],
  // Add module directories to help with resolution
  moduleDirectories: ['node_modules', '<rootDir>'],
  // Add resolver to handle convex imports
  resolver: undefined,
  // Don't ignore convex files for transformation
  transformIgnorePatterns: [
    'node_modules/(?!(convex|@radix-ui|cmdk)/)',
    '!convex/_generated/',
  ],
  // Transform JS files from convex
  transform: {
    ...webProjectConfig.transform,
    '^.+\\.js$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        allowJs: true,
      },
    }],
  },
  moduleNameMapper: {
    // Mock all variations of convex imports
    '^(\\.{1,2}/)*\\.\\./convex/_generated/api(\\.js)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.js',
    '^(\\.{1,2}/)*\\.\\./convex/_generated/dataModel(\\.d?\\.ts)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-dataModel.ts',
    '\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./convex/_generated/api(\\.js)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.js',
    '\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./convex/_generated/api$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.js',
    '\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./convex/_generated/api(\\.js)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.js',
    '\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./convex/_generated/api(\\.js)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.js',
    '\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./convex/_generated/dataModel(\\.d?\\.ts)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-dataModel.ts',
    '\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./convex/_generated/dataModel(\\.d?\\.ts)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-dataModel.ts',
    '\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./\\.\\./convex/_generated/dataModel(\\.d?\\.ts)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-dataModel.ts',
    '^convex/_generated/api(\\.js)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.js',
    '^convex/_generated/api\\.js$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.js',
    '^convex/_generated/dataModel(\\.d?\\.ts)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-dataModel.ts',
    ...webProjectConfig.moduleNameMapper,
    // Mock Radix UI packages
    '^@radix-ui/react-icons$': '<rootDir>/apps/web/src/__tests__/__mocks__/lucide-react.js',
    '^@radix-ui/(.*)$': '<rootDir>/apps/web/src/__tests__/__mocks__/radix-ui-all.js',
    // Mock lucide-react
    '^lucide-react$': '<rootDir>/apps/web/src/__tests__/__mocks__/lucide-react.js',
    // Mock cmdk
    '^cmdk$': '<rootDir>/apps/web/src/__tests__/__mocks__/cmdk.js',
    // Mock Clerk
    '^@clerk/nextjs$': '<rootDir>/apps/web/src/__tests__/__mocks__/@clerk/nextjs.js',
    // Mock UI components - commenting out to test real components
    // '^@/components/ui/(.*)$': '<rootDir>/apps/web/src/__tests__/__mocks__/ui-components.tsx',
    // Mock loading component
    '^@/components/loading$': '<rootDir>/apps/web/src/__tests__/__mocks__/loading.tsx',
  },
};
