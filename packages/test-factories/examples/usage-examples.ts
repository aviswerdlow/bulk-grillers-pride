/**
 * Example usage of test factories in different testing scenarios
 */

import {
  userFactory,
  organizationFactory,
  productFactory,
  categoryFactory,
  aiCategorizationJobFactory,
  createTestScenario,
  createMockId,
} from '../src/index';

// ===========================
// Unit Test Examples
// ===========================

// Example 1: Testing user authentication
function testUserAuthentication() {
  const activeUser = userFactory.createActive();
  const suspendedUser = userFactory.createSuspended();
  
  // Test that active users can authenticate
  expect(canAuthenticate(activeUser)).toBe(true);
  
  // Test that suspended users cannot authenticate
  expect(canAuthenticate(suspendedUser)).toBe(false);
}

// Example 2: Testing organization permissions
function testOrganizationPermissions() {
  const org = organizationFactory.createEnterprise();
  const basicOrg = organizationFactory.create({
    overrides: {
      subscription: {
        plan: 'free',
        status: 'active',
        trialEnds: undefined,
        seats: 1,
        features: ['basic'],
      }
    }
  });
  
  // Enterprise orgs should have advanced features
  expect(hasFeature(org, 'sso')).toBe(true);
  expect(hasFeature(basicOrg, 'sso')).toBe(false);
}

// Example 3: Testing product categorization
function testProductCategorization() {
  const meatProduct = productFactory.createMeatProduct();
  const meatCategory = categoryFactory.create({
    overrides: {
      name: 'Meat & Poultry',
      handle: 'meat-poultry',
    }
  });
  
  const result = categorizeProduct(meatProduct, [meatCategory]);
  expect(result.suggestedCategories).toContain(meatCategory._id);
}

// ===========================
// Integration Test Examples
// ===========================

// Example 4: Testing complete workflow
function testCompleteCategorizationWorkflow() {
  const scenario = createTestScenario({
    userCount: 1,
    categoryCount: 10,
    productCount: 20,
    includeAiJob: false,
  });
  
  // Create an AI job for the products
  const job = aiCategorizationJobFactory.createPending({
    overrides: {
      organizationId: scenario.organization._id,
      projectId: scenario.products[0].projectId,
      productIds: scenario.products.map(p => p._id),
      createdBy: scenario.users[0]._id,
    }
  });
  
  // Test the workflow
  const result = processCategorizationJob(job, scenario.categories);
  
  expect(result.status).toBe('completed');
  expect(result.categorizedCount).toBe(20);
}

// Example 5: Testing with specific relationships
function testProductWithCategories() {
  const orgId = createMockId('organizations');
  const projectId = createMockId('projects');
  
  // Create a category hierarchy
  const rootCategory = categoryFactory.createRoot({
    overrides: { organizationId: orgId, projectId }
  });
  
  const subCategory = categoryFactory.createSubcategory(
    rootCategory._id,
    rootCategory.path,
    { overrides: { organizationId: orgId, projectId } }
  );
  
  // Create products assigned to these categories
  const products = productFactory.createMany(5, {
    overrides: {
      organizationId: orgId,
      projectId,
      categories: [rootCategory._id, subCategory._id],
    }
  });
  
  // Test category assignment
  const categoryProducts = getProductsByCategory(subCategory._id);
  expect(categoryProducts).toHaveLength(5);
}

// ===========================
// Deterministic Test Examples
// ===========================

// Example 6: Testing with deterministic data
function testWithDeterministicData() {
  // Use a seed for reproducible tests
  const scenario1 = createTestScenario({ seed: 12345 });
  const scenario2 = createTestScenario({ seed: 12345 });
  
  // These will be identical
  expect(scenario1.organization.name).toBe(scenario2.organization.name);
  expect(scenario1.users[0].email).toBe(scenario2.users[0].email);
  
  // Useful for snapshot testing
  expect(scenario1).toMatchSnapshot();
}

// ===========================
// Mock Functions (for example purposes)
// ===========================

function canAuthenticate(user: any): boolean {
  return user.status === 'active';
}

function hasFeature(org: any, feature: string): boolean {
  return org.subscription.features.includes(feature);
}

function categorizeProduct(product: any, categories: any[]): any {
  return {
    suggestedCategories: categories
      .filter(c => product.productType?.includes(c.handle.split('-')[0]))
      .map(c => c._id)
  };
}

function processCategorizationJob(job: any, categories: any[]): any {
  return {
    status: 'completed',
    categorizedCount: job.productIds.length,
  };
}

function getProductsByCategory(categoryId: string): any[] {
  // Mock implementation
  return [];
}

// ===========================
// Advanced Examples
// ===========================

// Example 7: Testing with custom overrides
function testWithCustomOverrides() {
  // Create users with specific attributes
  const users = userFactory.createManyWithOverrides([
    { email: 'admin@company.com', status: 'active' },
    { email: 'user@company.com', status: 'active' },
    { email: 'guest@company.com', status: 'invited' },
  ]);
  
  expect(users[0].email).toBe('admin@company.com');
  expect(users[2].status).toBe('invited');
}

// Example 8: Testing AI job progression
function testAiJobProgression() {
  const productIds = productFactory.createMany(10).map(p => p._id);
  
  // Start with pending job
  let job = aiCategorizationJobFactory.createPending({
    overrides: { productIds }
  });
  
  expect(job.status).toBe('pending');
  expect(job.progress.current).toBe(0);
  
  // Simulate running state
  job = aiCategorizationJobFactory.createRunning({
    overrides: {
      _id: job._id,
      productIds,
      progress: { current: 5, total: 10, percentage: 50 }
    }
  });
  
  expect(job.status).toBe('running');
  expect(job.progress.percentage).toBe(50);
  
  // Simulate completion
  job = aiCategorizationJobFactory.createCompleted({
    overrides: {
      _id: job._id,
      productIds,
    }
  });
  
  expect(job.status).toBe('completed');
  expect(job.results).toHaveLength(productIds.length);
}

// Example 9: Testing error scenarios
function testErrorScenarios() {
  // Create a failed AI job
  const failedJob = aiCategorizationJobFactory.createFailed({
    overrides: {
      errors: [{
        message: 'API rate limit exceeded',
        timestamp: Date.now(),
        type: 'rate_limit',
      }]
    }
  });
  
  expect(failedJob.status).toBe('failed');
  expect(failedJob.errors[0].type).toBe('rate_limit');
  
  // Create a suspended organization
  const suspendedOrg = organizationFactory.createSuspended();
  
  const canRunJobs = checkOrgCanRunJobs(suspendedOrg);
  expect(canRunJobs).toBe(false);
}

function checkOrgCanRunJobs(org: any): boolean {
  return org.status === 'active' && org.subscription.status === 'active';
}

export {
  testUserAuthentication,
  testOrganizationPermissions,
  testProductCategorization,
  testCompleteCategorizationWorkflow,
  testProductWithCategories,
  testWithDeterministicData,
  testWithCustomOverrides,
  testAiJobProgression,
  testErrorScenarios,
};