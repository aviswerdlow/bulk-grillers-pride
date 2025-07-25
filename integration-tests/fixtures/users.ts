/**
 * User fixtures for integration tests
 */

export const testUsers = {
  admin: {
    id: 'user_test_admin',
    clerkId: 'clerk_user_admin',
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin',
    imageUrl: 'https://example.com/avatar-admin.jpg',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  
  member: {
    id: 'user_test_member',
    clerkId: 'clerk_user_member',
    email: 'member@test.com',
    firstName: 'Test',
    lastName: 'Member',
    role: 'member',
    imageUrl: 'https://example.com/avatar-member.jpg',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  
  viewer: {
    id: 'user_test_viewer',
    clerkId: 'clerk_user_viewer',
    email: 'viewer@test.com',
    firstName: 'Test',
    lastName: 'Viewer',
    role: 'viewer',
    imageUrl: 'https://example.com/avatar-viewer.jpg',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
};

export function createTestUser(overrides: Partial<typeof testUsers.member> = {}) {
  return {
    ...testUsers.member,
    ...overrides,
    id: overrides.id || `user_test_${Date.now()}`,
    clerkId: overrides.clerkId || `clerk_user_${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createTestMembership(userId: string, organizationId: string, role = 'member') {
  return {
    id: `membership_${userId}_${organizationId}`,
    userId,
    organizationId,
    role,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}