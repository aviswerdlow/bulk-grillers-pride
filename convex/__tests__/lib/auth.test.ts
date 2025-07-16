import {
  authenticateAndAuthorize,
  requireRole,
  authenticateUser,
  hasPermission,
  roleHasAccess,
  ROLE_HIERARCHY,
} from '../../lib/auth';

// Mock types
const mockUser = {
  _id: 'user123' as any,
  clerkId: 'clerk_123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
};

const mockMembership = {
  _id: 'membership123' as any,
  role: 'editor' as const,
  permissions: ['products:read', 'products:write'],
  status: 'active' as const,
};

// Mock context
const createMockContext = (
  options: {
    isAuthenticated?: boolean;
    userExists?: boolean;
    membershipExists?: boolean;
    membershipRole?: 'owner' | 'admin' | 'editor' | 'viewer';
  } = {}
) => {
  const {
    isAuthenticated = true,
    userExists = true,
    membershipExists = true,
    membershipRole = 'editor',
  } = options;

  return {
    auth: {
      getUserIdentity: jest
        .fn()
        .mockResolvedValue(isAuthenticated ? { subject: 'clerk_123' } : null),
    },
    db: {
      query: jest.fn().mockReturnValue({
        withIndex: jest.fn().mockReturnValue({
          unique: jest.fn().mockResolvedValue(userExists ? mockUser : null),
          filter: jest.fn().mockReturnValue({
            unique: jest
              .fn()
              .mockResolvedValue(
                membershipExists ? { ...mockMembership, role: membershipRole } : null
              ),
          }),
        }),
      }),
    },
  };
};

describe('Auth Middleware', () => {
  describe('authenticateAndAuthorize', () => {
    it('should authenticate and authorize a valid user', async () => {
      const ctx = createMockContext();
      const result = await authenticateAndAuthorize(ctx as any, 'org123' as any);

      expect(result.user).toEqual(mockUser);
      expect(result.membership.role).toBe('editor');
      expect(ctx.auth.getUserIdentity).toHaveBeenCalledTimes(1);
      expect(ctx.db.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error if not authenticated', async () => {
      const ctx = createMockContext({ isAuthenticated: false });

      await expect(authenticateAndAuthorize(ctx as any, 'org123' as any)).rejects.toThrow(
        'Not authenticated'
      );
    });

    it('should throw error if user not found', async () => {
      const ctx = createMockContext({ userExists: false });

      await expect(authenticateAndAuthorize(ctx as any, 'org123' as any)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error if membership not found', async () => {
      const ctx = createMockContext({ membershipExists: false });

      await expect(authenticateAndAuthorize(ctx as any, 'org123' as any)).rejects.toThrow(
        'Access denied'
      );
    });
  });

  describe('requireRole', () => {
    it('should allow access for valid roles', async () => {
      const ctx = createMockContext({ membershipRole: 'admin' });
      const result = await requireRole(ctx as any, 'org123' as any, ['admin', 'owner']);

      expect(result.membership.role).toBe('admin');
    });

    it('should deny access for invalid roles', async () => {
      const ctx = createMockContext({ membershipRole: 'viewer' });

      await expect(requireRole(ctx as any, 'org123' as any, ['admin', 'owner'])).rejects.toThrow(
        'Insufficient permissions'
      );
    });

    it('should allow editor role when required', async () => {
      const ctx = createMockContext({ membershipRole: 'editor' });
      const result = await requireRole(ctx as any, 'org123' as any, ['editor', 'admin', 'owner']);

      expect(result.membership.role).toBe('editor');
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user without organization context', async () => {
      const ctx = createMockContext();
      const result = await authenticateUser(ctx as any);

      expect(result).toEqual(mockUser);
      expect(ctx.db.query).toHaveBeenCalledTimes(1);
    });

    it('should throw error if not authenticated', async () => {
      const ctx = createMockContext({ isAuthenticated: false });

      await expect(authenticateUser(ctx as any)).rejects.toThrow('Not authenticated');
    });
  });

  describe('hasPermission', () => {
    it('should return true for existing permission', () => {
      const authResult = {
        user: mockUser,
        membership: mockMembership,
      };

      expect(hasPermission(authResult, 'products:read')).toBe(true);
      expect(hasPermission(authResult, 'products:write')).toBe(true);
    });

    it('should return false for missing permission', () => {
      const authResult = {
        user: mockUser,
        membership: mockMembership,
      };

      expect(hasPermission(authResult, 'admin:users')).toBe(false);
      expect(hasPermission(authResult, 'categories:delete')).toBe(false);
    });
  });

  describe('roleHasAccess', () => {
    it('should follow role hierarchy correctly', () => {
      // Owner has access to all roles
      expect(roleHasAccess('owner', 'owner')).toBe(true);
      expect(roleHasAccess('owner', 'admin')).toBe(true);
      expect(roleHasAccess('owner', 'editor')).toBe(true);
      expect(roleHasAccess('owner', 'viewer')).toBe(true);

      // Admin has access to admin and below
      expect(roleHasAccess('admin', 'owner')).toBe(false);
      expect(roleHasAccess('admin', 'admin')).toBe(true);
      expect(roleHasAccess('admin', 'editor')).toBe(true);
      expect(roleHasAccess('admin', 'viewer')).toBe(true);

      // Editor has access to editor and viewer
      expect(roleHasAccess('editor', 'owner')).toBe(false);
      expect(roleHasAccess('editor', 'admin')).toBe(false);
      expect(roleHasAccess('editor', 'editor')).toBe(true);
      expect(roleHasAccess('editor', 'viewer')).toBe(true);

      // Viewer only has access to viewer
      expect(roleHasAccess('viewer', 'owner')).toBe(false);
      expect(roleHasAccess('viewer', 'admin')).toBe(false);
      expect(roleHasAccess('viewer', 'editor')).toBe(false);
      expect(roleHasAccess('viewer', 'viewer')).toBe(true);
    });
  });

  describe('ROLE_HIERARCHY', () => {
    it('should have correct hierarchy definition', () => {
      expect(ROLE_HIERARCHY.owner).toEqual(['owner', 'admin', 'editor', 'viewer']);
      expect(ROLE_HIERARCHY.admin).toEqual(['admin', 'editor', 'viewer']);
      expect(ROLE_HIERARCHY.editor).toEqual(['editor', 'viewer']);
      expect(ROLE_HIERARCHY.viewer).toEqual(['viewer']);
    });
  });
});
