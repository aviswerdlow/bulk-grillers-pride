const React = require('react');

// Create providers that don't do the provider check
const ClerkProvider = ({ children }) => React.createElement(React.Fragment, null, children);

// Mock hooks
const useAuth = jest.fn(() => ({
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_123',
  sessionId: 'session_123',
  orgId: 'org_123',
  orgSlug: 'test-org',
  signOut: jest.fn(),
}));

const useClerk = jest.fn(() => ({
  signOut: jest.fn().mockResolvedValue(undefined),
  redirectToSignIn: jest.fn(),
  redirectToSignUp: jest.fn(),
  openSignIn: jest.fn(),
  openSignUp: jest.fn(),
}));

const useUser = jest.fn(() => ({
  isLoaded: true,
  isSignedIn: true,
  user: {
    id: 'user_123',
    primaryEmailAddress: {
      emailAddress: 'test@example.com',
    },
    fullName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: null,
  },
}));

const useOrganization = jest.fn(() => ({
  isLoaded: true,
  organization: {
    id: 'org_123',
    name: 'Test Organization',
    slug: 'test-org',
    membersCount: 5,
  },
  membership: {
    role: 'org:member',
  },
}));

const useOrganizationList = jest.fn(() => ({
  isLoaded: true,
  organizationList: [
    {
      organization: {
        id: 'org_123',
        name: 'Test Organization',
        slug: 'test-org',
      },
      membership: {
        role: 'org:member',
      },
    },
  ],
  setActive: jest.fn(),
  createOrganization: jest.fn(),
}));

// Mock components
const SignIn = jest.fn(() => React.createElement('div', null, 'Sign In Component'));
const SignUp = jest.fn(() => React.createElement('div', null, 'Sign Up Component'));
const UserButton = jest.fn(() => React.createElement('div', null, 'User Button'));
const OrganizationSwitcher = jest.fn(() => React.createElement('div', null, 'Organization Switcher'));

// Mock server-side functions
const auth = () => ({
  userId: 'user_123',
  sessionId: 'session_123',
  orgId: 'org_123',
});

const currentUser = () => ({
  id: 'user_123',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
});

module.exports = {
  ClerkProvider,
  useAuth,
  useClerk,
  useUser,
  useOrganization,
  useOrganizationList,
  SignIn,
  SignUp,
  UserButton,
  OrganizationSwitcher,
  auth,
  currentUser,
};
