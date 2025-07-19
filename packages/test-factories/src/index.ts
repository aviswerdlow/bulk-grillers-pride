// Export all factories
export { UserFactory } from './factories/user.factory';
export { OrganizationFactory } from './factories/organization.factory';
export { ProductFactory } from './factories/product.factory';
export { CategoryFactory } from './factories/category.factory';
export { AiCategorizationJobFactory } from './factories/ai-categorization-job.factory';

// Export utilities
export { createMockId, createMockIdFromString, createMockIds, createIdGenerator } from './utils/ids';
export { BaseFactory, type FactoryOptions } from './utils/factory';

// Re-export types from types file
export type { Id, Doc } from './types';

// Create singleton instances for easy access
import { UserFactory } from './factories/user.factory';
import { OrganizationFactory } from './factories/organization.factory';
import { ProductFactory } from './factories/product.factory';
import { CategoryFactory } from './factories/category.factory';
import { AiCategorizationJobFactory } from './factories/ai-categorization-job.factory';

export const userFactory = new UserFactory();
export const organizationFactory = new OrganizationFactory();
export const productFactory = new ProductFactory();
export const categoryFactory = new CategoryFactory();
export const aiCategorizationJobFactory = new AiCategorizationJobFactory();

// Import createMockId for use in the function
import { createMockId } from './utils/ids';

// Helper function to create a complete test scenario
export interface TestScenario {
  organization: ReturnType<OrganizationFactory['create']>;
  users: ReturnType<UserFactory['create']>[];
  categories: ReturnType<CategoryFactory['create']>[];
  products: ReturnType<ProductFactory['create']>[];
  aiJob?: ReturnType<AiCategorizationJobFactory['create']>;
}

export function createTestScenario(options?: {
  userCount?: number;
  categoryCount?: number;
  productCount?: number;
  includeAiJob?: boolean;
  seed?: number;
}): TestScenario {
  const {
    userCount = 3,
    categoryCount = 5,
    productCount = 10,
    includeAiJob = false,
    seed
  } = options || {};
  
  // Create factories with optional seed
  const orgFactory = new OrganizationFactory(seed);
  const userFact = new UserFactory(seed);
  const catFactory = new CategoryFactory(seed);
  const prodFactory = new ProductFactory(seed);
  const aiJobFact = new AiCategorizationJobFactory(seed);
  
  // Create organization
  const organization = orgFactory.createActive();
  
  // Create users
  const users = userFact.createMany(userCount, {
    overrides: { status: 'active' }
  });
  
  // Create categories with hierarchy
  const categories: ReturnType<CategoryFactory['create']>[] = [];
  
  // Create root categories
  const rootCount = Math.ceil(categoryCount / 3);
  for (let i = 0; i < rootCount; i++) {
    categories.push(catFactory.createRoot({
      overrides: {
        organizationId: organization._id,
        projectId: createMockId('projects'),
      }
    }));
  }
  
  // Create subcategories
  const remainingCount = categoryCount - rootCount;
  for (let i = 0; i < remainingCount; i++) {
    const parent = categories[i % rootCount];
    categories.push(catFactory.createSubcategory(parent._id, parent.path, {
      overrides: {
        organizationId: organization._id,
        projectId: parent.projectId,
      }
    }));
  }
  
  // Create products
  const products = prodFactory.createMany(productCount, {
    overrides: {
      organizationId: organization._id,
      projectId: categories[0]?.projectId || createMockId('projects'),
      createdBy: users[0]?._id,
      categories: categories.slice(0, 2).map(c => c._id), // Assign to first 2 categories
    }
  });
  
  // Create AI job if requested
  let aiJob;
  if (includeAiJob) {
    aiJob = aiJobFact.createCompleted({
      overrides: {
        organizationId: organization._id,
        projectId: products[0]?.projectId,
        productIds: products.slice(0, 5).map(p => p._id),
        createdBy: users[0]?._id,
      }
    });
  }
  
  return {
    organization,
    users,
    categories,
    products,
    aiJob,
  };
}

// Export a function to reset all factories
export function resetAllFactories(): void {
  // Create new instances to reset internal state
  Object.assign(userFactory, new UserFactory());
  Object.assign(organizationFactory, new OrganizationFactory());
  Object.assign(productFactory, new ProductFactory());
  Object.assign(categoryFactory, new CategoryFactory());
  Object.assign(aiCategorizationJobFactory, new AiCategorizationJobFactory());
}