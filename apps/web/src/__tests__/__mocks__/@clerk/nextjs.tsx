import React from 'react';

// Mock user object
const mockUser = {
  id: 'user_test123',
  primaryEmailAddress: {
    emailAddress: 'test@example.com',
  },
  emailAddresses: [{
    id: 'email_123',
    emailAddress: 'test@example.com',
    verification: { status: 'verified' },
  }],
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  username: 'testuser',
  imageUrl: 'https://example.com/avatar.jpg',
  hasImage: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  publicMetadata: {},
  unsafeMetadata: {},
  reload: jest.fn(),
  update: jest.fn(),
};

// Mock organization
const mockOrganization = {
  id: 'org_test123',
  name: 'Test Organization',
  slug: 'test-org',
  imageUrl: 'https://example.com/org.jpg',
  hasImage: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  publicMetadata: {},
  adminDeleteEnabled: false,
  maxAllowedMemberships: 5,
  reload: jest.fn(),
  update: jest.fn(),
  getMemberships: jest.fn(),
  inviteMember: jest.fn(),
  removeMember: jest.fn(),
};

// Mock clerk instance
const mockClerk = {
  user: mockUser,
  organization: mockOrganization,
  session: {
    id: 'session_123',
    status: 'active',
    userId: 'user_test123',
    user: mockUser,
    publicUserData: {
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'https://example.com/avatar.jpg',
      hasImage: true,
      identifier: 'test@example.com',
      userId: 'user_test123',
    },
    reload: jest.fn(),
    touch: jest.fn(),
    end: jest.fn(),
    remove: jest.fn(),
  },
  signOut: jest.fn(() => Promise.resolve()),
  openSignIn: jest.fn(),
  openSignUp: jest.fn(),
  openUserProfile: jest.fn(),
  openOrganizationProfile: jest.fn(),
  redirectToSignIn: jest.fn(),
  redirectToSignUp: jest.fn(),
  redirectToUserProfile: jest.fn(),
  redirectToOrganizationProfile: jest.fn(),
  redirectToCreateOrganization: jest.fn(),
  authenticateWithMetamask: jest.fn(),
  createOrganization: jest.fn(),
  getOrganization: jest.fn(),
};

// Context for providing clerk
const ClerkContext = React.createContext({
  clerk: mockClerk,
  user: mockUser,
  organization: mockOrganization,
  session: mockClerk.session,
  isLoaded: true,
  isSignedIn: true,
});

// Mock hooks
export const useUser = jest.fn(() => ({
  user: mockUser,
  isLoaded: true,
  isSignedIn: true,
}));

export const useAuth = jest.fn(() => ({
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_test123',
  sessionId: 'session_123',
  orgId: 'org_test123',
  orgRole: 'admin',
  orgSlug: 'test-org',
  getToken: jest.fn(() => Promise.resolve('mock-token')),
  signOut: jest.fn(() => Promise.resolve()),
}));

export const useClerk = jest.fn(() => mockClerk);

export const useOrganization = jest.fn(() => ({
  organization: mockOrganization,
  isLoaded: true,
  membership: {
    id: 'mem_123',
    role: 'admin',
    publicMetadata: {},
    permissions: [],
  },
}));

export const useOrganizationList = jest.fn(() => ({
  organizationList: [mockOrganization],
  isLoaded: true,
  createOrganization: jest.fn(),
  setActive: jest.fn(),
}));

export const useSession = jest.fn(() => ({
  session: mockClerk.session,
  isLoaded: true,
  isSignedIn: true,
}));

export const useSessionList = jest.fn(() => ({
  sessions: [mockClerk.session],
  isLoaded: true,
  setActive: jest.fn(),
}));

// Mock components
export const ClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkContext.Provider value={{
      clerk: mockClerk,
      user: mockUser,
      organization: mockOrganization,
      session: mockClerk.session,
      isLoaded: true,
      isSignedIn: true,
    }}>
      {children}
    </ClerkContext.Provider>
  );
};

export const SignIn = ({ 
  appearance,
  routing,
  path,
  redirectUrl,
  signUpUrl,
}: any) => {
  return (
    <div data-testid="clerk-sign-in">
      <h1>Sign In</h1>
      <form onSubmit={(e) => {
        e.preventDefault();
        // Mock sign in
      }}>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
};

export const SignUp = ({ 
  appearance,
  routing,
  path,
  redirectUrl,
  signInUrl,
}: any) => {
  return (
    <div data-testid="clerk-sign-up">
      <h1>Sign Up</h1>
      <form onSubmit={(e) => {
        e.preventDefault();
        // Mock sign up
      }}>
        <input type="email" placeholder="Email" />
        <input type="password" placeholder="Password" />
        <input type="text" placeholder="First Name" />
        <input type="text" placeholder="Last Name" />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export const UserButton = ({ 
  afterSignOutUrl,
  appearance,
  showName,
  userProfileMode,
  userProfileUrl,
  signInUrl,
}: any) => {
  return (
    <div data-testid="clerk-user-button">
      <button onClick={() => mockClerk.openUserProfile()}>
        <img src={mockUser.imageUrl} alt={mockUser.fullName} />
        {showName && <span>{mockUser.fullName}</span>}
      </button>
    </div>
  );
};

export const UserProfile = ({ 
  appearance,
  routing,
  path,
}: any) => {
  return (
    <div data-testid="clerk-user-profile">
      <h1>User Profile</h1>
      <div>
        <img src={mockUser.imageUrl} alt={mockUser.fullName} />
        <h2>{mockUser.fullName}</h2>
        <p>{mockUser.primaryEmailAddress.emailAddress}</p>
      </div>
    </div>
  );
};

export const OrganizationProfile = ({ 
  appearance,
  routing,
  path,
}: any) => {
  return (
    <div data-testid="clerk-organization-profile">
      <h1>Organization Profile</h1>
      <div>
        <img src={mockOrganization.imageUrl} alt={mockOrganization.name} />
        <h2>{mockOrganization.name}</h2>
        <p>{mockOrganization.slug}</p>
      </div>
    </div>
  );
};

export const OrganizationSwitcher = ({
  appearance,
  createOrganizationUrl,
  organizationProfileUrl,
  createOrganizationMode,
  hidePersonal,
  defaultOpen,
  afterCreateOrganizationUrl,
  afterLeaveOrganizationUrl,
  afterSelectOrganizationUrl,
  afterSelectPersonalUrl,
}: any) => {
  return (
    <div data-testid="clerk-organization-switcher">
      <button>
        {mockOrganization.name}
      </button>
    </div>
  );
};

export const SignedIn = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = React.useContext(ClerkContext);
  return isSignedIn ? <>{children}</> : null;
};

export const SignedOut = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = React.useContext(ClerkContext);
  return !isSignedIn ? <>{children}</> : null;
};

export const RedirectToSignIn = () => {
  return <div>Redirecting to sign in...</div>;
};

export const RedirectToSignUp = () => {
  return <div>Redirecting to sign up...</div>;
};

export const RedirectToUserProfile = () => {
  return <div>Redirecting to user profile...</div>;
};

export const RedirectToOrganizationProfile = () => {
  return <div>Redirecting to organization profile...</div>;
};

export const RedirectToCreateOrganization = () => {
  return <div>Redirecting to create organization...</div>;
};

// Protect component for routes
export const Protect = ({ 
  children,
  fallback,
  role,
  permission,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  role?: string;
  permission?: string;
}) => {
  const { isSignedIn } = React.useContext(ClerkContext);
  
  if (!isSignedIn) {
    return fallback ? <>{fallback}</> : null;
  }
  
  // Mock role/permission check
  if (role && role !== 'admin') {
    return fallback ? <>{fallback}</> : null;
  }
  
  return <>{children}</>;
};

// Additional utilities
export const withClerk = (Component: React.ComponentType<any>) => {
  return (props: any) => (
    <ClerkProvider>
      <Component {...props} />
    </ClerkProvider>
  );
};

export const WithClerk = ({ 
  children,
  ...props 
}: { 
  children: (clerk: any) => React.ReactNode;
}) => {
  return <>{children(mockClerk)}</>;
};

export const withUser = (Component: React.ComponentType<any>) => {
  return (props: any) => <Component {...props} user={mockUser} />;
};

export const WithUser = ({ 
  children,
}: { 
  children: (user: any) => React.ReactNode;
}) => {
  return <>{children(mockUser)}</>;
};

export const withSession = (Component: React.ComponentType<any>) => {
  return (props: any) => <Component {...props} session={mockClerk.session} />;
};

export const WithSession = ({ 
  children,
}: { 
  children: (session: any) => React.ReactNode;
}) => {
  return <>{children(mockClerk.session)}</>;
};

// Auth helper components
export const AuthenticateWithRedirectCallback = () => {
  return <div>Processing authentication...</div>;
};

export const MultisessionAppSupport = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Export mock functions for testing
export const __setMockUser = (user: any) => {
  Object.assign(mockUser, user);
};

export const __setMockOrganization = (org: any) => {
  Object.assign(mockOrganization, org);
};

export const __resetMocks = () => {
  jest.clearAllMocks();
};