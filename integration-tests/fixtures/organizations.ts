/**
 * Organization fixtures for integration tests
 */

export const testOrganizations = {
  default: {
    id: 'org_test_default',
    name: 'Test Organization',
    slug: 'test-org',
    clerkOrganizationId: 'clerk_org_test',
    subscription: {
      plan: 'starter',
      status: 'active',
    },
    settings: {
      allowAiCategorization: true,
      schemaVersion: '1.0',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  
  enterprise: {
    id: 'org_test_enterprise',
    name: 'Enterprise Test Org',
    slug: 'enterprise-test',
    clerkOrganizationId: 'clerk_org_enterprise',
    subscription: {
      plan: 'enterprise',
      status: 'active',
    },
    settings: {
      allowAiCategorization: true,
      schemaVersion: '1.0',
      customDomain: 'test.example.com',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  
  free: {
    id: 'org_test_free',
    name: 'Free Tier Test Org',
    slug: 'free-test',
    clerkOrganizationId: 'clerk_org_free',
    subscription: {
      plan: 'free',
      status: 'active',
    },
    settings: {
      allowAiCategorization: false,
      schemaVersion: '1.0',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
};

export function createTestOrganization(overrides: Partial<typeof testOrganizations.default> = {}) {
  return {
    ...testOrganizations.default,
    ...overrides,
    id: overrides.id || `org_test_${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}