// Add custom jest matchers from jest-dom
require('@testing-library/jest-dom');

// Make React available globally for JSX without imports
const React = require('react');
global.React = React;

// Mock next/router
jest.mock('next/router', () => require('next-router-mock'));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
  useParams() {
    return {};
  },
}));

// Mock convex/react
jest.mock('convex/react', () => ({
  ConvexProvider: ({ children }) => children,
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useAction: jest.fn(),
}));

// Mock convex/react-clerk
jest.mock('convex/react-clerk', () => ({
  ConvexProviderWithClerk: ({ children }) => children,
}));

// Mock environment variables
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-key';

// Mock Convex generated API files
jest.mock('convex/_generated/api', () => require('./__mocks__/convex/_generated/api.js'));

// Mock relative imports to convex generated files
jest.mock('../../../../../convex/_generated/api', () => ({
  api: {
    functions: {
      auth: {
        users: {
          current: 'mock-current',
          currentWithOrganizations: 'mock-currentWithOrganizations',
          getOrganizationUsers: 'mock-getOrganizationUsers',
        },
        sessions: {
          updateProfile: 'mock-updateProfile',
          switchOrganization: 'mock-switchOrganization',
          getActiveSessions: 'mock-getActiveSessions',
        },
        permissions: {
          updateUserRole: 'mock-updateUserRole',
          removeUserFromOrganization: 'mock-removeUserFromOrganization',
        },
      },
      organizations: {
        organizations: {
          getOrganizationBySlug: 'mock-getOrganizationBySlug',
        },
      },
      projects: {
        projects: {
          getOrganizationProjects: 'mock-getOrganizationProjects',
        },
      },
      dashboard: {
        getDashboardStats: 'mock-getDashboardStats',
        getRecentActivity: 'mock-getRecentActivity',
      },
      categories: {
        categories: {
          getCategoryTree: 'mock-getCategoryTree',
        },
        categoryLevels: {
          getCategoryLevels: 'mock-getCategoryLevels',
        },
      },
    },
  },
}), { virtual: true });

jest.mock('../../../../../convex/_generated/dataModel', () => ({
  Id: String,
}), { virtual: true });

// Suppress console errors during tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
