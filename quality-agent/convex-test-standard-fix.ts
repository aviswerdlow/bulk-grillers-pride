import { Id } from '../_generated/dataModel';
import { t } from '../test.setup';
// Import missing functions from the convex-test-helpers package
import {
  assertDocumentExists as _assertDocumentExists,
  assertDocumentNotExists as _assertDocumentNotExists,
  getTableData as _getTableData,
} from '@bulk-grillers-pride/convex-test-helpers';

export interface ConvexTestContext {
  db: any;
  auth: any;
  storage: any;
  scheduler: any;
  runQuery: any;
  runMutation: any;
  runAction: any;
  run: any;
  query: any;
  mutation: any;
  action: any;
}

export function createConvexTest(): ConvexTestContext {
  return t;
}

export function createQueryContext(testContext: ConvexTestContext, overrides?: any) {
  return {
    db: testContext.db,
    auth: testContext.auth,
    ...overrides
  };
}

export function createMutationContext(testContext: ConvexTestContext, overrides?: any) {
  return {
    db: testContext.db,
    auth: testContext.auth,
    storage: testContext.storage,
    scheduler: testContext.scheduler,
    ...overrides
  };
}

export async function setupAuth(testContext: ConvexTestContext, user: any) {
  if (user === null) {
    testContext.auth.getUserIdentity = jest.fn().mockResolvedValue(null);
    return;
  }
  
  testContext.auth.getUserIdentity = jest.fn().mockResolvedValue({
    tokenIdentifier: user.tokenIdentifier || `${user.provider}|${user._id}`,
    subject: user.clerkId || user._id, // Use clerkId as subject for auth
    name: user.name,
    email: user.email,
    pictureUrl: user.pictureUrl,
    emailVerified: user.emailVerified || true,
  });
}

export async function seedDatabase(testContext: ConvexTestContext, data: {
  users?: any[];
  organizations?: any[];
  projects?: any[];
  organizationMemberships?: any[];
  categories?: any[];
  products?: any[];
}) {
  // Clear existing data
  const dbStorage = (testContext.db as any).storage || new Map();
  dbStorage.clear();

  // Seed each table
  for (const [tableName, items] of Object.entries(data)) {
    if (items && items.length > 0) {
      for (const item of items) {
        await testContext.db.insert(tableName, item);
      }
    }
  }
}

// Re-export mock creation functions from convex-test
export function createMockUser(overrides?: any) {
  const id = overrides?._id || ('user_' + Math.random().toString(36).substr(2, 9)) as Id<'users'>;
  const tokenIdentifier = overrides?.tokenIdentifier || 'test-provider|test-user';
  return {
    _id: id,
    _creationTime: Date.now(),
    name: overrides?.name || 'Test User',
    email: overrides?.email || 'test@example.com',
    tokenIdentifier: tokenIdentifier,
    clerkId: overrides?.clerkId || id, // Use the user ID as clerkId for testing
    provider: overrides?.provider || 'test-provider',
    emailVerified: overrides?.emailVerified ?? true,
    pictureUrl: overrides?.pictureUrl,
    ...overrides
  };
}

export function createMockOrganization(overrides?: any) {
  return {
    _id: overrides?._id || ('org_' + Math.random().toString(36).substr(2, 9)) as Id<'organizations'>,
    _creationTime: Date.now(),
    name: overrides?.name || 'Test Organization',
    slug: overrides?.slug || 'test-org',
    ownerId: overrides?.ownerId,
    subscriptionStatus: overrides?.subscriptionStatus || 'active',
    subscriptionPlan: overrides?.subscriptionPlan || 'free',
    isPersonal: overrides?.isPersonal || false,
    enforceUniqueSku: overrides?.enforceUniqueSku || false,
    createdAt: overrides?.createdAt || Date.now(),
    updatedAt: overrides?.updatedAt || Date.now(),
    ...overrides
  };
}

export function createMockOrganizationMembership(overrides?: any) {
  return {
    _id: overrides?._id || ('membership_' + Math.random().toString(36).substr(2, 9)) as Id<'organizationMemberships'>,
    _creationTime: Date.now(),
    userId: overrides?.userId,
    organizationId: overrides?.organizationId,
    role: overrides?.role || 'viewer',
    status: overrides?.status || 'active',
    joinedAt: overrides?.joinedAt || Date.now(),
    ...overrides
  };
}

export function createMockProject(overrides?: any) {
  return {
    _id: overrides?._id || ('project_' + Math.random().toString(36).substr(2, 9)) as Id<'projects'>,
    _creationTime: Date.now(),
    organizationId: overrides?.organizationId,
    name: overrides?.name || 'Test Project',
    description: overrides?.description,
    createdAt: overrides?.createdAt || Date.now(),
    updatedAt: overrides?.updatedAt || Date.now(),
    ...overrides
  };
}

export function createMockCategory(overrides?: any) {
  return {
    _id: overrides?._id || ('category_' + Math.random().toString(36).substr(2, 9)) as Id<'categories'>,
    _creationTime: Date.now(),
    projectId: overrides?.projectId,
    name: overrides?.name || 'Test Category',
    parentId: overrides?.parentId || null,
    level: overrides?.level || 1,
    path: overrides?.path || [],
    orderIndex: overrides?.orderIndex || 0,
    productCount: overrides?.productCount || 0,
    createdAt: overrides?.createdAt || Date.now(),
    updatedAt: overrides?.updatedAt || Date.now(),
    ...overrides
  };
}

export function createMockProduct(overrides?: any) {
  return {
    _id: overrides?._id || ('product_' + Math.random().toString(36).substr(2, 9)) as Id<'products'>,
    _creationTime: Date.now(),
    projectId: overrides?.projectId,
    sku: overrides?.sku || 'TEST-SKU-' + Math.random().toString(36).substr(2, 5),
    name: overrides?.name || 'Test Product',
    description: overrides?.description,
    categoryId: overrides?.categoryId,
    categoryIds: overrides?.categoryIds || [],
    price: overrides?.price || 0,
    createdAt: overrides?.createdAt || Date.now(),
    updatedAt: overrides?.updatedAt || Date.now(),
    ...overrides
  };
}

// Reset function for clearing mock state
export function resetMockState() {
  jest.clearAllMocks();
}

// RE-EXPORT THE MISSING FUNCTIONS FROM THE PACKAGE
export const assertDocumentExists = _assertDocumentExists;
export const assertDocumentNotExists = _assertDocumentNotExists;
export const getTableData = _getTableData;