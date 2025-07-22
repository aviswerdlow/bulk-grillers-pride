/**
 * @deprecated Use frontend-test-helpers.tsx instead for standardized Convex mocking
 * This file is maintained for backward compatibility during the refactoring process
 */
import * as React from 'react';
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ClerkProvider } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';

// Mock Convex client
const mockConvexClient = {
  watchQuery: jest.fn(),
  mutation: jest.fn(),
  action: jest.fn(),
  query: jest.fn(),
  authenticate: jest.fn(),
  clearAuth: jest.fn(),
};

// Mock Clerk
const mockClerk = {
  loaded: true,
  session: {
    id: 'session_123',
    status: 'active',
    user: {
      id: 'user_123',
      primaryEmailAddress: {
        emailAddress: 'test@example.com',
      },
    },
  },
  user: {
    id: 'user_123',
    primaryEmailAddress: {
      emailAddress: 'test@example.com',
    },
    fullName: 'Test User',
    imageUrl: 'https://example.com/avatar.jpg',
  },
  organization: {
    id: 'org_123',
    name: 'Test Organization',
    slug: 'test-org',
  },
};

// Mock useAuth hook
export const mockUseAuth = {
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_123',
  sessionId: 'session_123',
  orgId: 'org_123',
  orgSlug: 'test-org',
  signOut: jest.fn(),
};

// Mock useClerk hook
export const mockUseClerk = {
  signOut: jest.fn().mockResolvedValue(undefined),
  redirectToSignIn: jest.fn(),
  redirectToSignUp: jest.fn(),
  openSignIn: jest.fn(),
  openSignUp: jest.fn(),
};

// Mock useUser hook
export const mockUseUser = {
  isLoaded: true,
  isSignedIn: true,
  user: mockClerk.user,
};

// Mock useOrganization hook
export const mockUseOrganization = {
  isLoaded: true,
  organization: mockClerk.organization,
  membership: {
    role: 'admin',
  },
};

// Mock useOrganizationList hook
export const mockUseOrganizationList = {
  isLoaded: true,
  organizationList: [
    {
      organization: mockClerk.organization,
      membership: {
        role: 'admin',
      },
    },
  ],
  setActive: jest.fn(),
};

// Clerk is now mocked via jest moduleNameMapper in jest.config.js

// Create mock functions that can be imported and used in tests
export const mockUseQuery = jest.fn((query, args) => {
  // Provide sensible defaults for common queries
  const queryName = query?._functionName || query?.name || '';
  
  if (queryName.includes('getOrganizationBySlug')) {
    return {
      _id: 'org_123',
      name: 'Test Organization',
      slug: args?.slug || 'test-org',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  
  if (queryName.includes('getCurrentUser')) {
    return {
      _id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      firstName: 'Test',
      lastName: 'User',
      clerkId: 'user_123',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
  
  if (queryName.includes('currentWithOrganizations')) {
    return {
      _id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
      organizations: [],
      firstName: 'Test',
      lastName: 'User',
      clerkId: 'user_123',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
  
  if (queryName.includes('getDashboardStats')) {
    return {
      productsCount: 42,
      categorizedProducts: 38,
      uncategorizedProducts: 4,
      projectsCount: 1,
      teamMembersCount: 3,
      categoryPaths: {},
      recentActivity: [],
      recentImports: [],
    };
  }
  
  if (queryName.includes('getRecentActivity')) {
    return [];
  }
  
  if (queryName.includes('getProducts')) {
    return {
      page: [],
      continueCursor: null,
      isDone: true,
    };
  }
  
  if (queryName.includes('getCategories')) {
    return [];
  }
  
  if (queryName.includes('getProjects') || queryName.includes('getOrganizationProjects')) {
    return [];
  }
  
  if (queryName.includes('getImportJobs')) {
    return [];
  }
  
  return undefined;
});

export const mockUseMutation = jest.fn(() => jest.fn().mockResolvedValue(undefined));
export const mockUseAction = jest.fn(() => jest.fn().mockResolvedValue(undefined));

// Store references globally so they can be accessed in the mock
(global as any).__mockUseQuery = mockUseQuery;
(global as any).__mockUseMutation = mockUseMutation;
(global as any).__mockUseAction = mockUseAction;

// Mock Convex hooks
jest.mock('convex/react', () => ({
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useQuery: (...args: any[]) => (global as any).__mockUseQuery(...args),
  useMutation: (...args: any[]) => (global as any).__mockUseMutation(...args),
  useAction: (...args: any[]) => (global as any).__mockUseAction(...args),
}));

// Mock Convex-Clerk integration
jest.mock('convex/react-clerk', () => ({
  ConvexProviderWithClerk: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withAuth?: boolean;
  withConvex?: boolean;
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={mockConvexClient as any} useAuth={mockUseAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};

const customRender = (ui: ReactElement, options?: CustomRenderOptions) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Helper to reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  mockUseAuth.signOut.mockClear();
  mockUseClerk.signOut.mockClear();
  mockUseOrganizationList.setActive.mockClear();
  mockUseQuery.mockReset();
  mockUseMutation.mockReset();
  mockUseAction.mockReset();
  // Reset default mock implementations
  mockUseMutation.mockImplementation(() => jest.fn().mockResolvedValue(undefined));
  mockUseAction.mockImplementation(() => jest.fn().mockResolvedValue(undefined));
  // Update global references
  (global as any).__mockUseMutation = mockUseMutation;
  (global as any).__mockUseAction = mockUseAction;
};

// Helper to set auth state
export const setAuthState = (isSignedIn: boolean, userId?: string) => {
  mockUseAuth.isSignedIn = isSignedIn;
  mockUseAuth.userId = userId || null;
  mockUseUser.isSignedIn = isSignedIn;
  mockUseUser.user = isSignedIn ? mockClerk.user : null;
};

// Helper to set organization state
export const setOrganizationState = (organization: any) => {
  mockUseOrganization.organization = organization;
  mockUseAuth.orgId = organization?.id || null;
  mockUseAuth.orgSlug = organization?.slug || null;
};

// Mock data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user_123',
  primaryEmailAddress: {
    emailAddress: 'test@example.com',
  },
  fullName: 'Test User',
  imageUrl: 'https://example.com/avatar.jpg',
  ...overrides,
});

export const createMockOrganization = (overrides = {}) => ({
  id: 'org_123',
  _id: 'org_123',
  name: 'Test Organization',
  slug: 'test-org',
  imageUrl: 'https://example.com/org-avatar.jpg',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

export const createMockInvitation = (overrides = {}) => ({
  _id: 'inv_123',
  email: 'invited@example.com',
  role: 'member' as const,
  status: 'pending' as const,
  organizationId: 'org_123',
  organizationName: 'Test Organization',
  invitedBy: 'user_123',
  customMessage: 'Welcome to our team!',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

export const createMockTeamMember = (overrides = {}) => ({
  _id: 'member_123',
  userId: 'user_123',
  name: 'Test User',
  email: 'test@example.com',
  imageUrl: 'https://example.com/avatar.jpg',
  role: 'member' as const,
  joinedAt: new Date().toISOString(),
  lastSeen: new Date().toISOString(),
  isActive: true,
  ...overrides,
});
