import * as React from 'react';
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ClerkProvider } from '@clerk/nextjs';
import { ConvexProvider } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { mockRouter } from 'next-router-mock';

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
export const mockUseQuery = jest.fn();
export const mockUseMutation = jest.fn();
export const mockUseAction = jest.fn();

// Mock Convex hooks
jest.mock('convex/react', () => ({
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
  useAction: (...args: any[]) => mockUseAction(...args),
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
  name: 'Test Organization',
  slug: 'test-org',
  imageUrl: 'https://example.com/org-avatar.jpg',
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
