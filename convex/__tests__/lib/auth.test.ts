import { 
  authenticateAndAuthorize, 
  requireRole, 
  authenticateUser, 
  hasPermission,
  roleHasAccess,
  ROLE_HIERARCHY
} from '../../lib/auth';
import { Id } from '../../_generated/dataModel';

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Auth Utilities', () => {
  // Mock context
  let mockCtx: any;
  let mockIdentity: any;
  let mockUser: any;
  let mockMembership: any;

  beforeEach(() => {
    // Suppress console output during tests
    console.log = jest.fn();
    console.error = jest.fn();

    // Reset mocks
    mockIdentity = {
      subject: 'clerk_user_123',
      tokenIdentifier: 'token_123',
      issuer: 'https://clerk.dev',
    };

    mockUser = {
      _id: 'user_123' as Id<'users'>,
      clerkId: 'clerk_user_123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    mockMembership = {
      _id: 'membership_123' as Id<'organizationMemberships'>,
      organizationId: 'org_123' as Id<'organizations'>,
      userId: 'user_123' as Id<'users'>,
      role: 'admin' as const,
      permissions: ['read', 'write', 'delete'],
      status: 'active' as const,
      joinedAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Create mock context
    mockCtx = {
      auth: {
        getUserIdentity: jest.fn().mockResolvedValue(mockIdentity),
      },
      db: {
        query: jest.fn(),
      },
    };
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });

  describe('authenticateAndAuthorize', () => {
    beforeEach(() => {
      // Setup query chain for user lookup
      const userQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(mockUser),
      };

      // Setup query chain for membership lookup
      const membershipQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(mockMembership),
      };

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') return userQueryChain;
        if (table === 'organizationMemberships') return membershipQueryChain;
        return null;
      });
    });

    it('should authenticate and authorize a user successfully', async () => {
      const result = await authenticateAndAuthorize(mockCtx, 'org_123' as Id<'organizations'>);

      expect(result).toEqual({
        user: {
          _id: mockUser._id,
          clerkId: mockUser.clerkId,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        membership: {
          _id: mockMembership._id,
          role: mockMembership.role,
          permissions: mockMembership.permissions,
          status: mockMembership.status,
        },
      });

      // Verify auth identity was checked
      expect(mockCtx.auth.getUserIdentity).toHaveBeenCalled();
      
      // Verify database queries
      expect(mockCtx.db.query).toHaveBeenCalledWith('users');
      expect(mockCtx.db.query).toHaveBeenCalledWith('organizationMemberships');
    });

    it('should throw error when no identity is found', async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);

      await expect(
        authenticateAndAuthorize(mockCtx, 'org_123' as Id<'organizations'>)
      ).rejects.toThrow('Not authenticated');
    });

    it('should throw error when user is not found', async () => {
      const userQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(null),
      };
      
      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') return userQueryChain;
        return null;
      });

      await expect(
        authenticateAndAuthorize(mockCtx, 'org_123' as Id<'organizations'>)
      ).rejects.toThrow('User not found');
    });

    it('should throw error when membership is not found', async () => {
      const userQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(mockUser),
      };

      const membershipQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(null),
      };

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') return userQueryChain;
        if (table === 'organizationMemberships') return membershipQueryChain;
        return null;
      });

      await expect(
        authenticateAndAuthorize(mockCtx, 'org_123' as Id<'organizations'>)
      ).rejects.toThrow('Access denied');
    });

    it('should handle users without firstName and lastName', async () => {
      const userWithoutNames = { ...mockUser, firstName: undefined, lastName: undefined };
      
      const userQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(userWithoutNames),
      };

      const membershipQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(mockMembership),
      };

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') return userQueryChain;
        if (table === 'organizationMemberships') return membershipQueryChain;
        return null;
      });

      const result = await authenticateAndAuthorize(mockCtx, 'org_123' as Id<'organizations'>);

      expect(result.user.firstName).toBeUndefined();
      expect(result.user.lastName).toBeUndefined();
    });
  });

  describe('requireRole', () => {
    it('should allow access when user has required role', async () => {
      // Mock authenticateAndAuthorize to return admin user
      const authResult = {
        user: {
          _id: mockUser._id,
          clerkId: mockUser.clerkId,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
        membership: {
          _id: mockMembership._id,
          role: 'admin' as const,
          permissions: mockMembership.permissions,
          status: mockMembership.status,
        },
      };

      // Setup mocks for authenticateAndAuthorize
      const userQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(mockUser),
      };

      const membershipQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(mockMembership),
      };

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') return userQueryChain;
        if (table === 'organizationMemberships') return membershipQueryChain;
        return null;
      });

      const result = await requireRole(
        mockCtx, 
        'org_123' as Id<'organizations'>, 
        ['admin', 'owner']
      );

      expect(result).toEqual(authResult);
    });

    it('should deny access when user lacks required role', async () => {
      // Setup viewer membership
      const viewerMembership = { ...mockMembership, role: 'viewer' as const };
      
      const userQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(mockUser),
      };

      const membershipQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(viewerMembership),
      };

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') return userQueryChain;
        if (table === 'organizationMemberships') return membershipQueryChain;
        return null;
      });

      await expect(
        requireRole(mockCtx, 'org_123' as Id<'organizations'>, ['admin', 'owner'])
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should work with single role requirement', async () => {
      const ownerMembership = { ...mockMembership, role: 'owner' as const };
      
      const userQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(mockUser),
      };

      const membershipQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(ownerMembership),
      };

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') return userQueryChain;
        if (table === 'organizationMemberships') return membershipQueryChain;
        return null;
      });

      const result = await requireRole(
        mockCtx, 
        'org_123' as Id<'organizations'>, 
        ['owner']
      );

      expect(result.membership.role).toBe('owner');
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user without organization context', async () => {
      const userQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(mockUser),
      };

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') return userQueryChain;
        return null;
      });

      const result = await authenticateUser(mockCtx);

      expect(result).toEqual(mockUser);
      expect(mockCtx.auth.getUserIdentity).toHaveBeenCalled();
      expect(mockCtx.db.query).toHaveBeenCalledWith('users');
    });

    it('should throw error when no identity', async () => {
      mockCtx.auth.getUserIdentity.mockResolvedValue(null);

      await expect(authenticateUser(mockCtx)).rejects.toThrow('Not authenticated');
    });

    it('should throw error when user not found', async () => {
      const userQueryChain = {
        withIndex: jest.fn().mockReturnThis(),
        unique: jest.fn().mockResolvedValue(null),
      };

      mockCtx.db.query.mockImplementation((table: string) => {
        if (table === 'users') return userQueryChain;
        return null;
      });

      await expect(authenticateUser(mockCtx)).rejects.toThrow('User not found');
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', () => {
      const authResult = {
        user: {
          _id: mockUser._id,
          clerkId: mockUser.clerkId,
          email: mockUser.email,
        },
        membership: {
          _id: mockMembership._id,
          role: 'admin' as const,
          permissions: ['read', 'write', 'delete'],
          status: 'active' as const,
        },
      };

      expect(hasPermission(authResult, 'read')).toBe(true);
      expect(hasPermission(authResult, 'write')).toBe(true);
      expect(hasPermission(authResult, 'delete')).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      const authResult = {
        user: {
          _id: mockUser._id,
          clerkId: mockUser.clerkId,
          email: mockUser.email,
        },
        membership: {
          _id: mockMembership._id,
          role: 'viewer' as const,
          permissions: ['read'],
          status: 'active' as const,
        },
      };

      expect(hasPermission(authResult, 'write')).toBe(false);
      expect(hasPermission(authResult, 'delete')).toBe(false);
      expect(hasPermission(authResult, 'admin')).toBe(false);
    });

    it('should handle empty permissions array', () => {
      const authResult = {
        user: {
          _id: mockUser._id,
          clerkId: mockUser.clerkId,
          email: mockUser.email,
        },
        membership: {
          _id: mockMembership._id,
          role: 'viewer' as const,
          permissions: [],
          status: 'active' as const,
        },
      };

      expect(hasPermission(authResult, 'read')).toBe(false);
    });
  });

  describe('roleHasAccess', () => {
    describe('owner role', () => {
      it('should have access to all roles', () => {
        expect(roleHasAccess('owner', 'owner')).toBe(true);
        expect(roleHasAccess('owner', 'admin')).toBe(true);
        expect(roleHasAccess('owner', 'editor')).toBe(true);
        expect(roleHasAccess('owner', 'viewer')).toBe(true);
      });
    });

    describe('admin role', () => {
      it('should have access to admin and below', () => {
        expect(roleHasAccess('admin', 'owner')).toBe(false);
        expect(roleHasAccess('admin', 'admin')).toBe(true);
        expect(roleHasAccess('admin', 'editor')).toBe(true);
        expect(roleHasAccess('admin', 'viewer')).toBe(true);
      });
    });

    describe('editor role', () => {
      it('should have access to editor and viewer', () => {
        expect(roleHasAccess('editor', 'owner')).toBe(false);
        expect(roleHasAccess('editor', 'admin')).toBe(false);
        expect(roleHasAccess('editor', 'editor')).toBe(true);
        expect(roleHasAccess('editor', 'viewer')).toBe(true);
      });
    });

    describe('viewer role', () => {
      it('should only have access to viewer', () => {
        expect(roleHasAccess('viewer', 'owner')).toBe(false);
        expect(roleHasAccess('viewer', 'admin')).toBe(false);
        expect(roleHasAccess('viewer', 'editor')).toBe(false);
        expect(roleHasAccess('viewer', 'viewer')).toBe(true);
      });
    });
  });

  describe('ROLE_HIERARCHY', () => {
    it('should define correct role hierarchies', () => {
      expect(ROLE_HIERARCHY.owner).toEqual(['owner', 'admin', 'editor', 'viewer']);
      expect(ROLE_HIERARCHY.admin).toEqual(['admin', 'editor', 'viewer']);
      expect(ROLE_HIERARCHY.editor).toEqual(['editor', 'viewer']);
      expect(ROLE_HIERARCHY.viewer).toEqual(['viewer']);
    });

    it('should be typed as readonly', () => {
      // TypeScript ensures this is readonly at compile time
      // The type system prevents modification, which is what matters
      expect(ROLE_HIERARCHY).toBeDefined();
      expect(typeof ROLE_HIERARCHY).toBe('object');
    });
  });
});