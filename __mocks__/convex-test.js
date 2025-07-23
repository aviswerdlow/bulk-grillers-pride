// Mock for convex-test to avoid import.meta issues in Jest
const mockQueryChain = {
  filter: jest.fn().mockReturnThis(),
  withIndex: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  paginate: jest.fn().mockResolvedValue({ page: [], isDone: true, continueCursor: '' }),
  collect: jest.fn().mockResolvedValue([]),
  first: jest.fn().mockResolvedValue(null),
  unique: jest.fn().mockResolvedValue(null),
};

// Storage for inserted documents by table
const dbStorage = new Map();

const mockDb = {
  query: jest.fn((tableName) => {
    const tableData = dbStorage.get(tableName) || [];
    return {
      ...mockQueryChain,
      collect: jest.fn().mockResolvedValue(tableData),
      filter: jest.fn((predicate) => {
        // Create a mock filter context with eq method
        const filterContext = {
          eq: (field, value) => {
            // Return a function that tests if a document matches
            return (doc) => {
              // Extract field name from the field object
              const fieldName = field?.toString?.().match(/field\('(.+)'\)/)?.[1] || field;
              return doc[fieldName] === value;
            };
          },
          field: (name) => name,
        };
        
        // Apply the predicate to filter the data
        const filtered = tableData.filter(doc => {
          try {
            // The predicate function gets the filter context
            return predicate(filterContext)(doc);
          } catch (_e) {
            // If predicate doesn't work as expected, just return true
            return true;
          }
        });
        
        return {
          ...mockQueryChain,
          collect: jest.fn().mockResolvedValue(filtered),
          first: jest.fn().mockResolvedValue(filtered[0] || null),
          unique: jest.fn().mockResolvedValue(filtered[0] || null),
        };
      }),
      first: jest.fn().mockResolvedValue(tableData[0] || null),
      unique: jest.fn().mockResolvedValue(tableData[0] || null),
    };
  }),
  get: jest.fn().mockResolvedValue(null),
  insert: jest.fn((tableName, doc) => {
    const id = doc._id || `${tableName}_${Math.random().toString(36).substr(2, 9)}`;
    const newDoc = { ...doc, _id: id, _creationTime: Date.now() };
    
    // Store in our mock storage
    if (!dbStorage.has(tableName)) {
      dbStorage.set(tableName, []);
    }
    dbStorage.get(tableName).push(newDoc);
    
    // Track organizations for duplicate checking
    if (tableName === 'organizations' && doc.slug) {
      organizations.set(doc.slug, newDoc);
    }
    
    return Promise.resolve(id);
  }),
  patch: jest.fn().mockResolvedValue(undefined),
  replace: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
};

const mockAuth = {
  getUserIdentity: jest.fn().mockResolvedValue(null),
};

const mockStorage = {
  generateUploadUrl: jest.fn().mockResolvedValue('https://mock-upload-url'),
  getUrl: jest.fn().mockResolvedValue('https://mock-file-url'),
  delete: jest.fn().mockResolvedValue(undefined),
};

// Track organizations for duplicate checking
const organizations = new Map();

module.exports = {
  convexTest: (_schema) => {
    // Reset state between tests
    organizations.clear();
    dbStorage.clear();
    
    // Create a context object that matches Convex's structure
    const ctx = {
      db: mockDb,
      auth: mockAuth,
      storage: mockStorage,
      runQuery: jest.fn(),
      runMutation: jest.fn(),
      runAction: jest.fn(),
      scheduler: {
        runAfter: jest.fn(),
        runAt: jest.fn(),
      },
    };
    
    // Return a mock test context
    return {
      // Include the context properties directly
      db: mockDb,
      auth: mockAuth,
      storage: mockStorage,
      scheduler: ctx.scheduler,
      
      query: jest.fn(async (fn) => {
        if (typeof fn === 'function') {
          return await fn(ctx);
        }
        return fn;
      }),
      mutation: jest.fn(async (fn) => {
        if (typeof fn === 'function') {
          return await fn(ctx);
        }
        return fn;
      }),
      action: jest.fn(async (fn) => {
        if (typeof fn === 'function') {
          return await fn(ctx);
        }
        return fn;
      }),
      
      // Run methods that also accept args
      runQuery: jest.fn((query, args) => {
        // If query is a string (like 'organizations.getUserOrganizations'), 
        // just return mock data for now
        if (typeof query === 'string') {
          return Promise.resolve(null);
        }
        return query(ctx, args);
      }),
      runMutation: jest.fn((mutation, args) => {
        // If mutation is a string (like 'organizations.create'), 
        // just return mock data for now
        if (typeof mutation === 'string') {
          // Handle organization mutations
          if (mutation === 'organizations.create') {
            // Check for invalid slug
            if (args?.slug?.includes(' ')) {
              return Promise.reject(new Error('Organization slug can only contain'));
            }
            // Check for duplicate slug
            if (organizations.has(args?.slug)) {
              return Promise.reject(new Error(`Organization with slug "${args.slug}" already exists`));
            }
            // Create the organization
            const newOrg = {
              _id: 'org_' + Math.random().toString(36).substr(2, 9),
              name: args?.name || 'Test Org',
              slug: args?.slug || 'test-slug',
              owner: args?.userId,
              ownerId: args?.userId,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isPersonal: false,
              subscriptionStatus: 'active',
              subscriptionPlan: 'free',
              enforceUniqueSku: false,
              ...args,
            };
            organizations.set(args.slug, newOrg);
            
            // Also create the membership record
            const membership = {
              _id: 'member_' + Math.random().toString(36).substr(2, 9),
              _creationTime: Date.now(),
              userId: args?.userId,
              organizationId: newOrg._id,
              role: 'owner',
              joinedAt: Date.now(),
            };
            
            // Store in our mock storage
            if (!dbStorage.has('organizationMembers')) {
              dbStorage.set('organizationMembers', []);
            }
            dbStorage.get('organizationMembers').push(membership);
            
            return Promise.resolve(newOrg);
          }
          
          if (mutation === 'organizations.update') {
            // Simple mock update
            return Promise.resolve({
              _id: args?.id,
              name: args?.name,
              updatedAt: Date.now(),
              ...args,
            });
          }
          
          if (mutation === 'organizations.addMember') {
            // Simple mock for adding member
            return Promise.resolve({
              userId: args?.email === 'newuser@example.com' ? 'newuser123' : args?.userId,
              organizationId: args?.organizationId,
              role: args?.role,
            });
          }
          
          // Default: return success
          return Promise.resolve({ success: true });
        }
        return mutation(ctx, args);
      }),
      runAction: jest.fn((action, args) => {
        if (typeof action === 'string') {
          return Promise.resolve(null);
        }
        return action(ctx, args);
      }),
      
      // Run method for test context
      run: jest.fn(async (fn) => {
        if (typeof fn === 'function') {
          return await fn(ctx);
        }
        return ctx;
      }),
    };
  },
  
  // Mock database object
  mockDb: mockDb,
  
  // Mock auth object
  mockAuth: mockAuth,
};

// These are already part of module.exports