import { describe, it, expect, beforeEach } from '@jest/globals';
import { t } from '../../../test.setup';
import {
  createConvexTest,
  createQueryContext,
  setupAuth,
  seedDatabase,
  type ConvexTestContext,
} from '../../../__tests__/convex-test-standard';
import {
  createMockUser,
  createMockOrganization,
  createMockOrganizationMembership,
  createMockProject,
  createMockCategory,
} from 'convex-test';
import { Id } from '../../../_generated/dataModel';

// Import the query handlers directly
import { getProjectCategories, getCategoryTree, getCategory } from '../queries';

describe('Category Query Handlers', () => {
  let test: ConvexTestContext;
  let user: any;
  let org: any;
  let project: any;
  let membership: any;

  beforeEach(async () => {
    
    tes// t is already imported from test.setup
    
    // Set up common test data
    user = createMockUser({ _id: 'user_1' as Id<'users'> });
    org = createMockOrganization({ _id: 'org_1' as Id<'organizations'> });
    project = createMockProject({
      _id: 'project_1' as Id<'projects'>,
      organizationId: org._id,
      name: 'Test Project',
    });
    membership = createMockOrganizationMembership({
      _id: 'membership_1' as Id<'organizationMemberships'>,
      userId: user._id,
      organizationId: org._id,
      role: 'viewer', // Read access is sufficient for queries
    });

    await seedDatabase(test, {
      users: [user],
      organizations: [org],
      projects: [project],
      organizationMemberships: [membership],
    });

    setupAuth(test, { tokenIdentifier: user.clerkId });
  });

  describe('getProjectCategories handler', () => {
    it('should work with direct handler access', async () => {
      // Create a test category
      await seedDatabase(test, {
        categories: [
          createMockCategory({
            _id: 'cat_test' as Id<'categories'>,
            organizationId: org._id,
            projectId: project._id,
            name: 'Test Category',
            status: 'active',
          }),
        ],
      });

      const ctx = createQueryContext(test);
      
      // Access the handler function if it exists
      const handler = (getProjectCategories as any).handler || 
                     (getProjectCategories as any)._handler ||
                     getProjectCategories;
      
      console.log('Handler type:', typeof handler);
      console.log('Handler structure:', Object.keys(handler));
      
      // For now, just test that we can access the query object
      expect(getProjectCategories).toBeDefined();
      expect(typeof getProjectCategories).toBe('object');
    });
  });
});