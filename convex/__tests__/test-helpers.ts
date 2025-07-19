// Mock convex test helper since convex-test is not installed
export const convexTest = () => {
  // In-memory storage for the mock database
  const storage: Record<string, any[]> = {};
  const idCounter: Record<string, number> = {};
  
  // Helper to generate IDs
  const generateId = (table: string) => {
    if (!idCounter[table]) idCounter[table] = 1;
    return `${table}_${idCounter[table]++}`;
  };
  
  const mockDb = {
    insert: jest.fn(async (table: string, doc: any) => {
      const id = generateId(table);
      const docWithId = { ...doc, _id: id, _creationTime: Date.now() };
      if (!storage[table]) storage[table] = [];
      storage[table].push(docWithId);
      return id;
    }),
    query: jest.fn((table: string) => {
      const tableData = storage[table] || [];
      const queryBuilder = {
        filter: jest.fn((filterFn: any) => queryBuilder),
        order: jest.fn((order: string) => queryBuilder),
        withIndex: jest.fn((indexName: string) => {
          queryBuilder._index = indexName;
          // Add unique method for withIndex
          queryBuilder.unique = jest.fn(async () => {
            const results = await queryBuilder.collect();
            return results[0] || null;
          });
          return queryBuilder;
        }),
        eq: jest.fn((field: string, value: any) => {
          queryBuilder._filters.push({ field, value, op: 'eq' });
          return queryBuilder;
        }),
        collect: jest.fn(async () => {
          let results = [...tableData];
          // Apply filters
          for (const filter of queryBuilder._filters) {
            results = results.filter(doc => doc[filter.field] === filter.value);
          }
          return results;
        }),
        first: jest.fn(async () => {
          const results = await queryBuilder.collect();
          return results[0] || null;
        }),
        take: jest.fn((n: number) => queryBuilder),
        paginate: jest.fn(async (opts: any) => ({
          page: tableData.slice(0, opts?.numItems || 10),
          continueCursor: null,
          isDone: true,
        })),
        unique: jest.fn(async () => {
          const results = await queryBuilder.collect();
          return results[0] || null;
        }),
        _filters: [] as any[],
        _index: null as string | null,
      };
      return queryBuilder;
    }),
    get: jest.fn(async (id: string) => {
      // Find document by ID across all tables
      for (const table in storage) {
        const doc = storage[table].find(d => d._id === id);
        if (doc) return doc;
      }
      return null;
    }),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockAuth = {
    getUserIdentity: jest.fn(),
  };

  return {
    db: mockDb,
    auth: mockAuth,
    runQuery: jest.fn(async (funcName: string, args: any) => {
      // Return arrays for list queries
      if (funcName.includes('getImportJobs') || funcName.includes('getJobs')) {
        return storage['importJobs'] || [];
      }
      if (funcName.includes('getProducts')) {
        return {
          page: storage['products'] || [],
          continueCursor: null,
          isDone: true,
        };
      }
      if (funcName.includes('getProjects')) {
        return storage['projects'] || [];
      }
      if (funcName.includes('getCategories')) {
        return storage['categories'] || [];
      }
      // Handle getCategorizationJob query
      if (args && args.jobId) {
        const job = await mockDb.get(args.jobId);
        if (!job) throw new Error('Job not found');
        return job;
      }
      // Handle organization queries
      if (funcName.includes('getOrganization')) {
        return {
          _id: 'org_1',
          name: 'Test Organization',
          slug: 'test-org',
        };
      }
      return undefined;
    }),
    runMutation: jest.fn(async (funcName: string, args: any) => {
      // Handle create operations
      if (funcName.includes('create')) {
        const table = funcName.includes('Import') ? 'importJobs' :
                     funcName.includes('Product') ? 'products' :
                     funcName.includes('Project') ? 'projects' : 'other';
        
        const id = await mockDb.insert(table, {
          ...args,
          status: args.status || 'pending',
          progress: args.progress || { total: 0, processed: 0, successful: 0, failed: 0, skipped: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        return storage[table]?.find(d => d._id === id);
      }
      // Handle applyCategorization mutation
      if (args && args.productId && args.categoryId) {
        const assignmentId = await mockDb.insert('categoryProductAssignments', {
          categoryId: args.categoryId,
          productId: args.productId,
          assignedBy: 'ai',
          confidence: args.confidence,
          rationale: args.rationale,
          status: 'active',
          jobId: args.jobId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        return args.productId;
      }
      return undefined;
    }),
    runAction: jest.fn(),
  };
};

// Helper function to create a mock context
export const createMockCtx = () => ({
  auth: {
    getUserIdentity: jest.fn().mockResolvedValue({
      tokenIdentifier: 'user_123',
      email: 'test@example.com',
    }),
  },
  db: {
    query: jest.fn(),
    insert: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
});

// Helper to mock auth context
export const mockAuth = (userId?: string | null) => ({
  getUserIdentity: jest.fn().mockResolvedValue(
    userId
      ? {
          tokenIdentifier: userId,
          email: 'test@example.com',
        }
      : null
  ),
});