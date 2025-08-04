import { GenericActionCtx, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { DataModel } from "../../_generated/dataModel";

// Mock storage implementation
const mockStorage = {
  getUrl: jest.fn().mockResolvedValue("https://example.com/test-file.jpg"),
  generateUploadUrl: jest.fn().mockResolvedValue("https://example.com/upload"),
  delete: jest.fn().mockResolvedValue(undefined),
};

// Mock scheduler implementation
const mockScheduler = {
  runAfter: jest.fn().mockResolvedValue("scheduled-job-id"),
  runAt: jest.fn().mockResolvedValue("scheduled-job-id"),
  cancel: jest.fn().mockResolvedValue(undefined),
};

// Mock auth implementation
const mockAuth = {
  getUserIdentity: jest.fn().mockResolvedValue({
    tokenIdentifier: "test-user-id",
    subject: "user_test123", // This should match the clerkId in the user record
    issuer: "test-issuer",
    email: "test@example.com",
    emailVerified: true,
    name: "Test User",
    pictureUrl: "https://example.com/avatar.jpg",
  }),
};

// Base mock database implementation
class MockDatabase {
  private data: Map<string, any[]> = new Map();

  constructor() {
    // Initialize with empty collections
    this.data.set("users", []);
    this.data.set("organizations", []);
    this.data.set("projects", []);
    this.data.set("products", []);
    this.data.set("materials", []);
    this.data.set("categories", []);
    this.data.set("activityLogs", []);
    this.data.set("accessibilityPreferences", []);
    
    // Seed default test user
    this.seedDefaultData();
  }
  
  private seedDefaultData() {
    // Create default test user that matches the auth mock
    const testUser = {
      _id: "user_default123",
      _creationTime: Date.now(),
      clerkId: "user_test123", // Matches mockAuth.getUserIdentity().subject
      email: "test@example.com",
      name: "Test User",
      firstName: "Test",
      lastName: "User",
      role: "admin",
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.set("users", [testUser]);
    
    // Create default test organization
    const testOrg = {
      _id: "org_default123",
      _creationTime: Date.now(),
      name: "Test Organization",
      slug: "test-org",
      clerkOrganizationId: "org_clerk_default123",
      status: "active",
      settings: {
        defaultProductStatus: "active",
        requireProductApproval: false,
        enableAiCategorization: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.set("organizations", [testOrg]);
    
    // Create default test project
    const testProject = {
      _id: "proj_default123",
      _creationTime: Date.now(),
      name: "Test Project",
      slug: "test-project",
      organizationId: "org_default123",
      status: "active",
      settings: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.set("projects", [testProject]);
  }

  query(table: string) {
    const data = this.data.get(table) || [];
    return {
      withIndex: (indexName: string, predicate?: (q: any) => any) => {
        // Simple index simulation - for by_clerk_id index on users table
        if (table === 'users' && indexName === 'by_clerk_id') {
          const q = {
            eq: (field: string, value: any) => ({ field, value })
          };
          const condition = predicate ? predicate(q) : null;
          
          return {
            unique: () => {
              if (condition && condition.value) {
                const user = data.find((item: any) => item.clerkId === condition.value);
                return Promise.resolve(user || null);
              }
              return Promise.resolve(null);
            },
            first: () => {
              if (condition && condition.value) {
                const user = data.find((item: any) => item.clerkId === condition.value);
                return Promise.resolve(user || null);
              }
              return Promise.resolve(null);
            },
            collect: () => {
              if (condition && condition.value) {
                const users = data.filter((item: any) => item.clerkId === condition.value);
                return Promise.resolve(users);
              }
              return Promise.resolve([]);
            }
          };
        }
        
        // Default behavior for other indexes
        return {
          unique: () => Promise.resolve(data[0]),
          first: () => Promise.resolve(data[0]),
          collect: () => Promise.resolve(data),
        };
      },
      filter: (predicate: (item: any) => boolean) => ({
        order: (order: "asc" | "desc") => ({
          take: (limit: number) => Promise.resolve(data.filter(predicate).slice(0, limit)),
          collect: () => Promise.resolve(data.filter(predicate)),
        }),
        first: () => Promise.resolve(data.find(predicate)),
        collect: () => Promise.resolve(data.filter(predicate)),
      }),
      order: (order: "asc" | "desc") => ({
        take: (limit: number) => Promise.resolve(data.slice(0, limit)),
        collect: () => Promise.resolve(data),
      }),
      collect: () => Promise.resolve(data),
      first: () => Promise.resolve(data[0]),
    };
  }

  insert(table: string, doc: any) {
    const data = this.data.get(table) || [];
    const newDoc = { ...doc, _id: `${table}_${Date.now()}_${Math.random()}` };
    data.push(newDoc);
    this.data.set(table, data);
    return Promise.resolve(newDoc._id);
  }

  patch(id: string, updates: any) {
    // Find and update the document across all tables
    for (const [table, data] of this.data.entries()) {
      const index = data.findIndex(item => item._id === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...updates };
        return Promise.resolve();
      }
    }
    return Promise.reject(new Error(`Document ${id} not found`));
  }

  replace(id: string, doc: any) {
    // Find and replace the document across all tables
    for (const [table, data] of this.data.entries()) {
      const index = data.findIndex(item => item._id === id);
      if (index !== -1) {
        data[index] = { ...doc, _id: id };
        return Promise.resolve();
      }
    }
    return Promise.reject(new Error(`Document ${id} not found`));
  }

  delete(id: string) {
    // Find and delete the document across all tables
    for (const [table, data] of this.data.entries()) {
      const index = data.findIndex(item => item._id === id);
      if (index !== -1) {
        data.splice(index, 1);
        return Promise.resolve();
      }
    }
    return Promise.reject(new Error(`Document ${id} not found`));
  }

  get(id: string) {
    // Find the document across all tables
    for (const [_, data] of this.data.entries()) {
      const doc = data.find(item => item._id === id);
      if (doc) {
        return Promise.resolve(doc);
      }
    }
    return Promise.resolve(null);
  }

  // Helper method to seed test data
  seed(table: string, docs: any[]) {
    this.data.set(table, docs);
  }

  // Helper method to clear all data
  clear() {
    for (const key of this.data.keys()) {
      this.data.set(key, []);
    }
  }
}

// Create mock database instance
const mockDb = new MockDatabase();

// Export typed context creators
export function createQueryCtx(): GenericQueryCtx<DataModel> {
  return {
    db: mockDb as any,
    auth: mockAuth as any,
  };
}

export function createMutationCtx(): GenericMutationCtx<DataModel> {
  return {
    db: mockDb as any,
    auth: mockAuth as any,
    storage: mockStorage as any,
    scheduler: mockScheduler as any,
  };
}

export function createActionCtx(): GenericActionCtx<DataModel> {
  return {
    auth: mockAuth as any,
    storage: mockStorage as any,
    scheduler: mockScheduler as any,
    runQuery: jest.fn().mockImplementation(async (query: any, args: any) => {
      // Mock implementation of runQuery
      return query({ db: mockDb, auth: mockAuth }, args);
    }),
    runMutation: jest.fn().mockImplementation(async (mutation: any, args: any) => {
      // Mock implementation of runMutation
      return mutation({ db: mockDb, auth: mockAuth, storage: mockStorage, scheduler: mockScheduler }, args);
    }),
  };
}

// Export mock implementations for direct access in tests
export { mockStorage, mockScheduler, mockAuth, mockDb };

// Helper to reset all mocks
export function resetAllMocks() {
  mockStorage.getUrl.mockClear();
  mockStorage.generateUploadUrl.mockClear();
  mockStorage.delete.mockClear();
  mockScheduler.runAfter.mockClear();
  mockScheduler.runAt.mockClear();
  mockScheduler.cancel.mockClear();
  mockAuth.getUserIdentity.mockClear();
  mockDb.clear();
}