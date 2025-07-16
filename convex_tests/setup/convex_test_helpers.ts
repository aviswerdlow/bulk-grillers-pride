import { GenericMutationCtx, GenericQueryCtx } from 'convex/server';
import { DataModel } from '../../_generated/dataModel';
import { api } from '../../_generated/api';
import { UserIdentity } from 'convex/server';

// Type definitions for our test contexts
export type TestQueryCtx = GenericQueryCtx<DataModel>;
export type TestMutationCtx = GenericMutationCtx<DataModel>;

// Mock user identities for testing
export const mockIdentities = {
  user: {
    subject: 'user_2NNEqL3nrfrEKBCHQhzmt7aQ2EC',
    email: 'test@example.com',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://example.com/avatar.jpg',
    tokenIdentifier:
      'https://discrete-marten-19.clerk.accounts.dev|user_2NNEqL3nrfrEKBCHQhzmt7aQ2EC',
    issuer: 'https://discrete-marten-19.clerk.accounts.dev',
  } as UserIdentity,

  admin: {
    subject: 'user_admin123',
    email: 'admin@example.com',
    given_name: 'Admin',
    family_name: 'User',
    picture: 'https://example.com/admin-avatar.jpg',
    tokenIdentifier: 'https://discrete-marten-19.clerk.accounts.dev|user_admin123',
    issuer: 'https://discrete-marten-19.clerk.accounts.dev',
  } as UserIdentity,

  noEmail: {
    subject: 'user_noemail123',
    given_name: 'NoEmail',
    family_name: 'User',
    tokenIdentifier: 'https://discrete-marten-19.clerk.accounts.dev|user_noemail123',
    issuer: 'https://discrete-marten-19.clerk.accounts.dev',
  } as UserIdentity,
};

// Mock database implementation
export class MockDatabase {
  private data: Map<string, Map<string, any>> = new Map();
  private idCounters: Map<string, number> = new Map();

  constructor() {
    // Initialize collections
    this.data.set('users', new Map());
    this.data.set('organizations', new Map());
    this.data.set('products', new Map());
    this.data.set('categories', new Map());
    this.data.set('organizationMemberships', new Map());
    this.data.set('invitations', new Map());
  }

  // Generate ID for a table
  private generateId(table: string): string {
    const counter = this.idCounters.get(table) || 0;
    this.idCounters.set(table, counter + 1);
    return `${table}_${counter + 1}`;
  }

  // Insert a document
  async insert(table: string, document: any): Promise<string> {
    const collection = this.data.get(table) || new Map();
    const id = this.generateId(table);
    const docWithId = { ...document, _id: id, _creationTime: Date.now() };
    collection.set(id, docWithId);
    this.data.set(table, collection);
    return id;
  }

  // Get a document by ID
  async get(id: string): Promise<any | null> {
    const table = id.split('_')[0];
    const collection = this.data.get(table);
    if (!collection) return null;
    return collection.get(id) || null;
  }

  // Update a document
  async patch(id: string, updates: any): Promise<void> {
    const table = id.split('_')[0];
    const collection = this.data.get(table);
    if (!collection) throw new Error(`Collection ${table} not found`);

    const existing = collection.get(id);
    if (!existing) throw new Error(`Document ${id} not found`);

    collection.set(id, { ...existing, ...updates });
  }

  // Delete a document
  async delete(id: string): Promise<void> {
    const table = id.split('_')[0];
    const collection = this.data.get(table);
    if (!collection) throw new Error(`Collection ${table} not found`);
    collection.delete(id);
  }

  // Query builder
  query(table: string) {
    const collection = this.data.get(table) || new Map();
    let documents = Array.from(collection.values());
    let filters: Array<(doc: any) => boolean> = [];

    const queryBuilder = {
      withIndex: (indexName: string, filter?: (q: any) => any) => {
        // Simple index simulation - extract field conditions from the filter
        if (filter) {
          const q = {
            eq: (field: string, value: any) => {
              filters.push((doc) => doc[field] === value);
              return {
                eq: (field2: string, value2: any) => {
                  filters.push((doc) => doc[field2] === value2);
                  return {
                    eq: (field3: string, value3: any) => {
                      filters.push((doc) => doc[field3] === value3);
                      return {};
                    },
                  };
                },
              };
            },
          };
          filter(q);
        }
        return queryBuilder;
      },
      filter: (filterFn: (q: any) => any) => {
        const q = {
          eq: (field: any, value: any) => {
            // Handle q.field() syntax
            if (typeof field === 'function') {
              const fieldName = field.toString().match(/field\(["']([^"']+)["']\)/)?.[1];
              if (fieldName) {
                filters.push((doc) => doc[fieldName] === value);
              }
            } else {
              filters.push((doc) => doc[field] === value);
            }
            return true;
          },
          field: (name: string) => name,
        };
        filterFn(q);
        return queryBuilder;
      },
      order: (direction: 'asc' | 'desc') => {
        if (direction === 'desc') {
          documents.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else {
          documents.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        }
        return queryBuilder;
      },
      paginate: async (options: { numItems: number; cursor?: any }) => {
        let filtered = documents;
        for (const filter of filters) {
          filtered = filtered.filter(filter);
        }
        const page = filtered.slice(0, options.numItems);
        const continueCursor = page.length === options.numItems ? 'next' : undefined;
        return { page, continueCursor };
      },
      collect: async () => {
        let filtered = documents;
        for (const filter of filters) {
          filtered = filtered.filter(filter);
        }
        return filtered;
      },
      first: async () => {
        let filtered = documents;
        for (const filter of filters) {
          filtered = filtered.filter(filter);
        }
        return filtered[0] || null;
      },
      unique: async () => {
        let filtered = documents;
        for (const filter of filters) {
          filtered = filtered.filter(filter);
        }
        return filtered[0] || null;
      },
    };

    return queryBuilder;
  }

  // Clear all data
  clear() {
    this.data.clear();
    this.idCounters.clear();
  }
}

// Create mock contexts for testing
export function createMockQueryContext(
  identity?: UserIdentity | null,
  db?: MockDatabase
): TestQueryCtx {
  const database = db || new MockDatabase();

  return {
    db: database as any,
    auth: {
      getUserIdentity: async () => identity || null,
    },
  } as TestQueryCtx;
}

export function createMockMutationContext(
  identity?: UserIdentity | null,
  db?: MockDatabase
): TestMutationCtx {
  const database = db || new MockDatabase();

  return {
    db: database as any,
    auth: {
      getUserIdentity: async () => identity || null,
    },
    scheduler: {
      runAfter: jest.fn(),
      runAt: jest.fn(),
    },
    storage: {
      store: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    },
  } as any;
}

// Setup mock auth functions to work with test data
export function setupMockAuth(db: MockDatabase, testData: any) {
  // Import the mocked auth module
  const authModule = require('../../lib/auth');

  authModule.authenticateAndAuthorize.mockImplementation(
    async (ctx: any, organizationId: string) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error('Not authenticated');

      const user = await db
        .query('users')
        .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', identity.subject))
        .unique();

      if (!user) throw new Error('User not found');

      const membership = await db
        .query('organizationMemberships')
        .withIndex('by_organization_user', (q: any) =>
          q.eq('organizationId', organizationId).eq('userId', user._id)
        )
        .filter((q: any) => q.eq(q.field('status'), 'active'))
        .unique();

      if (!membership) throw new Error('Access denied');

      return { user, membership };
    }
  );

  authModule.requireRole.mockImplementation(
    async (ctx: any, organizationId: string, requiredRoles: string[]) => {
      const auth = await authModule.authenticateAndAuthorize(ctx, organizationId);
      if (!requiredRoles.includes(auth.membership.role)) {
        throw new Error('Insufficient permissions');
      }
      return auth;
    }
  );

  authModule.authenticateUser.mockImplementation(async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const user = await db
      .query('users')
      .withIndex('by_clerk_id', (q: any) => q.eq('clerkId', identity.subject))
      .unique();

    if (!user) throw new Error('User not found');

    return user;
  });

  // Setup category helper mocks if they are mocked
  try {
    const categoryHelpers = require('../../functions/categories/helpers');

    if (categoryHelpers.getUserAndVerifyAccess?.mockImplementation) {
      categoryHelpers.getUserAndVerifyAccess.mockImplementation(
        async (ctx: any, organizationId: string) => {
          return authModule.authenticateAndAuthorize(ctx, organizationId);
        }
      );
    }

    if (categoryHelpers.getUserAndVerifyEditPermissions?.mockImplementation) {
      categoryHelpers.getUserAndVerifyEditPermissions.mockImplementation(
        async (ctx: any, organizationId: string) => {
          return authModule.requireRole(ctx, organizationId, ['owner', 'admin', 'editor']);
        }
      );
    }

    if (categoryHelpers.getUserAndVerifyDeletePermissions?.mockImplementation) {
      categoryHelpers.getUserAndVerifyDeletePermissions.mockImplementation(
        async (ctx: any, organizationId: string) => {
          return authModule.requireRole(ctx, organizationId, ['owner', 'admin']);
        }
      );
    }

    if (categoryHelpers.updateDescendantPaths?.mockImplementation) {
      categoryHelpers.updateDescendantPaths.mockImplementation(async () => {
        // Mock implementation
      });
    }

    if (categoryHelpers.hasChildCategories?.mockImplementation) {
      categoryHelpers.hasChildCategories.mockImplementation(
        async (ctx: any, categoryId: string) => {
          const children = await db
            .query('categories')
            .filter((q: any) => q.eq(q.field('parentId'), categoryId))
            .collect();
          return children.length > 0;
        }
      );
    }

    if (categoryHelpers.getCategoryChildren?.mockImplementation) {
      categoryHelpers.getCategoryChildren.mockImplementation(
        async (ctx: any, categoryId: string) => {
          return db
            .query('categories')
            .filter((q: any) => q.eq(q.field('parentId'), categoryId))
            .collect();
        }
      );
    }

    if (categoryHelpers.updateProductCategoryReferences?.mockImplementation) {
      categoryHelpers.updateProductCategoryReferences.mockImplementation(async () => {
        // Mock implementation
      });
    }
  } catch (e) {
    // Category helpers might not be mocked in some tests
  }
}

// Helper to seed test data
export async function seedTestData(db: MockDatabase) {
  const now = Date.now();

  // Create test user
  const userId = await db.insert('users', {
    clerkId: mockIdentities.user.subject,
    email: mockIdentities.user.email,
    firstName: mockIdentities.user.given_name,
    lastName: mockIdentities.user.family_name,
    avatar: mockIdentities.user.picture,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  });

  // Create test organization with full schema
  const orgId = await db.insert('organizations', {
    name: 'Test Organization',
    slug: 'test-org',
    status: 'active',
    subscription: {
      plan: 'professional',
      status: 'active',
      seats: 10,
      features: ['advanced-categorization', 'api-access'],
    },
    settings: {
      aiProvider: 'openai',
      aiModel: 'gpt-3.5-turbo',
      apiKeys: {},
      categorization: {
        batchSize: 50,
        prompt: 'Categorize the following products',
        autoApprove: false,
        confidenceThreshold: 0.8,
      },
      storage: {
        maxFileSize: 10485760, // 10MB
        totalStorageLimit: 1073741824, // 1GB
        allowedFileTypes: ['.csv', '.xlsx', '.jpg', '.png'],
      },
    },
    createdAt: now,
    updatedAt: now,
    version: 1,
  });

  // Create membership
  await db.insert('organizationMemberships', {
    organizationId: orgId,
    userId: userId,
    role: 'owner',
    permissions: ['*'],
    status: 'active',
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // Create test project
  const projectId = await db.insert('projects', {
    organizationId: orgId,
    name: 'Test Project',
    description: 'Default test project',
    slug: 'test-project',
    status: 'active',
    settings: {
      defaultCurrency: 'USD',
      importSettings: {
        autoValidate: true,
        duplicateHandling: 'skip',
        requiredFields: ['title', 'sku'],
      },
    },
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    version: 1,
  });

  // Create test categories
  const rootCategoryId = await db.insert('categories', {
    organizationId: orgId,
    projectId: projectId,
    name: 'Test Category',
    handle: 'test-category',
    level: 0,
    path: '/test-category',
    sortOrder: 0,
    status: 'active',
    isVisible: true,
    metadata: {},
    version: 1,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    lastModifiedBy: userId,
  });

  const subCategoryId = await db.insert('categories', {
    organizationId: orgId,
    projectId: projectId,
    name: 'Sub Category',
    handle: 'sub-category',
    parentId: rootCategoryId,
    level: 1,
    path: '/test-category/sub-category',
    sortOrder: 0,
    status: 'active',
    isVisible: true,
    metadata: {},
    version: 1,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    lastModifiedBy: userId,
  });

  // Create test product with new schema
  const productId = await db.insert('products', {
    organizationId: orgId,
    projectId: projectId,
    title: 'Test Product',
    description: 'A test product',
    handle: 'test-product',
    status: 'active',
    tags: [],
    categories: [rootCategoryId, subCategoryId],
    images: [],
    metadata: {},
    version: 1,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    lastModifiedBy: userId,
  });

  return {
    userId,
    orgId,
    projectId,
    rootCategoryId,
    subCategoryId,
    productId,
  };
}

// Assertion helpers
export const convexAssertions = {
  expectToBeAuthenticated: (identity: UserIdentity | null) => {
    expect(identity).not.toBeNull();
    expect(identity?.subject).toBeDefined();
  },

  expectToHavePermission: (permissions: string[] | undefined, permission: string) => {
    expect(permissions).toBeDefined();
    expect(permissions?.includes(permission) || permissions?.includes('*')).toBe(true);
  },

  expectToBeValidId: (id: string, table: string) => {
    expect(id).toMatch(new RegExp(`^${table}_\\d+$`));
  },

  expectToHaveTimestamps: (doc: any) => {
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
    expect(typeof doc.createdAt).toBe('number');
    expect(typeof doc.updatedAt).toBe('number');
  },
};
