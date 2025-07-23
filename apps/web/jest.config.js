// eslint-disable-next-line @typescript-eslint/no-require-imports
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
  resolver: '<rootDir>/jest.resolver.js',
  // Don't ignore convex files for transformation
  transformIgnorePatterns: [
    'node_modules/(?!(convex|@radix-ui|cmdk)/)',
    '!convex/_generated/',
  ],
  // Transform JS files from convex
  transform: {
    ...webProjectConfig.transform,
    '^.+\\.(js|jsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        allowJs: true,
        esModuleInterop: true,
      },
    }],
    // Transform convex generated files specifically
    '^.+convex/_generated/.+\\.js$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        module: 'commonjs',
      },
    }],
  },
  moduleNameMapper: {
    // Mock all variations of convex imports - order matters!
    '^@/\\.\\./\\.\\./\\.\\./convex/_generated/api(\\.js)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.js',
    '^@/\\.\\./\\.\\./\\.\\./convex/_generated/dataModel(\\.d?\\.ts)?$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-dataModel.ts',
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
    '^@convex/_generated/api$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-api.js',
    '^@convex/_generated/dataModel$': '<rootDir>/apps/web/src/__tests__/__mocks__/convex-dataModel.ts',
    ...webProjectConfig.moduleNameMapper,
    // Mock Radix UI packages
    '^@radix-ui/react-icons$': '<rootDir>/apps/web/src/__tests__/__mocks__/lucide-react.js',
    '^@radix-ui/react-dialog$': '<rootDir>/apps/web/src/__tests__/__mocks__/@radix-ui/react-dialog.js',
    '^@radix-ui/react-popover$': '<rootDir>/apps/web/src/__tests__/__mocks__/@radix-ui/react-popover.js',
    '^@radix-ui/react-scroll-area$': '<rootDir>/apps/web/src/__tests__/__mocks__/@radix-ui/react-scroll-area.js',
    '^@radix-ui/react-label$': '<rootDir>/apps/web/src/__tests__/__mocks__/@radix-ui/react-label.js',
    '^@radix-ui/react-select$': '<rootDir>/apps/web/src/__tests__/__mocks__/@radix-ui/react-select.js',
    '^@radix-ui/react-slot$': '<rootDir>/apps/web/src/__tests__/__mocks__/@radix-ui/react-slot.js',
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
    // Mock accessibility context
    '^@/contexts/accessibility/AccessibilityContext$': '<rootDir>/apps/web/src/__tests__/__mocks__/contexts/accessibility/AccessibilityContext.tsx',
  },
};
