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
  moduleNameMapper: {
    ...webProjectConfig.moduleNameMapper,
    // Mock the convex generated API
    '^.*/convex/_generated/api$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.ts',
    // Mock Radix UI packages
    '^@radix-ui/react-icons$': '<rootDir>/apps/web/src/__tests__/__mocks__/lucide-react.js',
    '^@radix-ui/(.*)$': '<rootDir>/apps/web/src/__tests__/__mocks__/radix-ui-all.js',
    // Mock lucide-react
    '^lucide-react$': '<rootDir>/apps/web/src/__tests__/__mocks__/lucide-react.js',
    // Mock cmdk
    '^cmdk$': '<rootDir>/apps/web/src/__tests__/__mocks__/cmdk.js',
    // Mock Clerk
    '^@clerk/nextjs$': '<rootDir>/apps/web/src/__tests__/__mocks__/@clerk/nextjs.js',
  },
};
