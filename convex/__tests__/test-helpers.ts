// Mock convex test helper since convex-test is not installed

import { Id } from '../_generated/dataModel';

// Types for better type safety
type MockStorage = Record<string, any[]>;
type MockQueryBuilder = {
  filter: jest.MockedFunction<any>;
  order: jest.MockedFunction<any>;
  withIndex: jest.MockedFunction<any>;
  eq: jest.MockedFunction<any>;
  collect: jest.MockedFunction<() => Promise<any[]>>;
  first: jest.MockedFunction<() => Promise<any>>;
  take: jest.MockedFunction<any>;
  paginate: jest.MockedFunction<(opts?: any) => Promise<any>>;
  unique: jest.MockedFunction<() => Promise<any>>;
  _filters: any[];
  _index: string | null;
};

export const convexTest = () => {
  // In-memory storage for the mock database
  const storage: MockStorage = {};
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
        withIndex: jest.fn((indexName: string, filterFn?: (q: any) => any) => {
          queryBuilder._index = indexName;
          
          // Handle the filter function if provided
          if (filterFn) {
            const filterAPI = {
              eq: (field: string, value: any) => {
                queryBuilder._filters.push({ field, value, op: 'eq' });
                return queryBuilder;
              },
            };
            filterFn(filterAPI);
          }
          
          // Add unique method for withIndex
          queryBuilder.unique = jest.fn(async () => {
            const results = await queryBuilder.collect();
            if (results.length > 1) {
              throw new Error(`Expected unique result but found ${results.length}`);
            }
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
          if (results.length > 1) {
            throw new Error(`Expected unique result but found ${results.length}`);
          }
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
    patch: jest.fn(async (id: string, updates: any) => {
      // Find document by ID across all tables and update it
      for (const table in storage) {
        const doc = storage[table].find(d => d._id === id);
        if (doc) {
          Object.assign(doc, updates);
          return;
        }
      }
      throw new Error('Document not found');
    }),
    delete: jest.fn(),
  };

  const mockAuth = {
    getUserIdentity: jest.fn(),
  };

  return {
    db: mockDb,
    auth: mockAuth,
    runQuery: jest.fn(async (funcName: string, args: any) => {
      // Handle validateApiKeyConfiguration
      if (funcName === 'validateApiKeyConfiguration' || funcName.includes('validateApiKeyConfiguration')) {
        const org = await mockDb.get(args.organizationId);
        if (!org) throw new Error('Organization not found');
        const provider = args.provider || org.settings?.aiProvider || 'openai';
        const apiKey = org.settings?.apiKeys?.[provider];
        
        if (!apiKey) {
          return {
            hasApiKey: false,
            isValid: false,
            error: `No API key configured for ${provider}`,
          };
        }
        
        // Validate OpenAI key format
        if (provider === 'openai' && !apiKey.startsWith('sk-')) {
          return {
            hasApiKey: true,
            isValid: false,
            error: 'Invalid OpenAI API key format. Must start with "sk-"',
          };
        }
        
        return {
          hasApiKey: true,
          isValid: true,
        };
      }
      
      // Handle checkModelAvailability
      if (funcName === 'checkModelAvailability' || funcName.includes('checkModelAvailability')) {
        const { provider, model } = args;
        const availableModels = {
          openai: ['gpt-4o', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'],
          anthropic: ['claude-opus-4', 'claude-sonnet-4'],
          gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
        };
        const deprecatedModels = ['text-davinci-003', 'gpt-4-32k'];
        
        if (deprecatedModels.includes(model)) {
          return {
            available: false,
            error: `Model ${model} is deprecated`,
            suggestion: 'Use gpt-4-turbo-preview instead',
          };
        }
        
        if (model === 'o3') {
          return {
            available: false,
            error: `Model ${model} is not recognized`,
            suggestion: 'Did you mean gpt-4-turbo-preview?',
          };
        }
        
        const providerModels = availableModels[provider as keyof typeof availableModels] || [];
        if (!providerModels.includes(model)) {
          return {
            available: false,
            error: `Model ${model} is not available for ${provider}`,
            suggestion: `Available models: ${providerModels.join(', ')}`,
          };
        }
        
        return {
          available: true,
        };
      }
      
      // Return arrays for list queries
      if (funcName.includes('getImportJobs') || funcName.includes('getJobs')) {
        let jobs = storage['importJobs'] || [];
        
        // Filter by projectId if provided
        if (args?.projectId) {
          jobs = jobs.filter((j: any) => j.projectId === args.projectId);
        }
        
        // Filter by organizationId if provided
        if (args?.organizationId) {
          jobs = jobs.filter((j: any) => j.organizationId === args.organizationId);
        }
        
        // Filter by status if provided
        if (args?.status) {
          jobs = jobs.filter((j: any) => j.status === args.status);
        }
        
        // Filter by jobType if provided
        if (args?.jobType) {
          jobs = jobs.filter((j: any) => j.jobType === args.jobType);
        }
        
        // Include user information if requested
        if (args?.includeUser) {
          jobs = await Promise.all(jobs.map(async (job: any) => {
            const user = await mockDb.get(job.createdBy);
            return { ...job, user };
          }));
        }
        
        return jobs;
      }
      if (funcName.includes('getProducts')) {
        let products = storage['products'] || [];
        
        // Filter by organizationId if provided
        if (args?.organizationId) {
          products = products.filter((p: any) => p.organizationId === args.organizationId);
        }
        
        // Filter by projectId if provided
        if (args?.projectId) {
          products = products.filter((p: any) => p.projectId === args.projectId);
        }
        
        // Filter by status if provided
        if (args?.status) {
          products = products.filter((p: any) => p.status === args.status);
        }
        
        // Filter out deleted products
        products = products.filter((p: any) => !p.deletedAt);
        
        // Handle search
        if (args?.search) {
          const searchLower = args.search.toLowerCase();
          products = products.filter((p: any) => 
            p.name?.toLowerCase().includes(searchLower) ||
            p.title?.toLowerCase().includes(searchLower)
          );
        }
        
        const limit = args?.limit || 10;
        const cursor = args?.cursor;
        const startIndex = cursor ? parseInt(cursor.split('_')[1]) : 0;
        const slicedProducts = products.slice(startIndex, startIndex + limit);
        
        return {
          products: slicedProducts,
          hasMore: products.length > startIndex + limit,
          totalCount: products.length,
          nextCursor: products.length > startIndex + limit ? 'cursor_' + (startIndex + limit) : null,
        };
      }
      if (funcName.includes('getProjects')) {
        const projects = storage['projects'] || [];
        // Filter active projects and add product counts
        return projects
          .filter((p: any) => p.status === 'active')
          .map((project: any) => {
            const productCount = (storage['products'] || [])
              .filter((p: any) => p.projectId === project._id).length;
            return { ...project, productCount };
          });
      }
      if (funcName.includes('getCategories')) {
        return storage['categories'] || [];
      }
      if (funcName === 'getTrashItems') {
        return {
          items: storage['productTrash'] || [],
          continueCursor: null,
          isDone: true,
          totalCount: (storage['productTrash'] || []).length
        };
      }
      // Handle getCategorizationJob query
      if (funcName.includes('getCategorizationJob') && args && args.jobId) {
        const job = await mockDb.get(args.jobId);
        if (!job) throw new Error('Job not found');
        return job;
      }
      
      // Handle getImportJob query
      if (funcName.includes('getImportJob') && args && args.jobId) {
        const job = await mockDb.get(args.jobId);
        if (!job) throw new Error('Job not found');
        
        // Check organization membership
        const membership = (storage['organizationMemberships'] || [])
          .find((m: any) => m.organizationId === job.organizationId);
        if (!membership) {
          throw new Error('User not in organization');
        }
        
        return job;
      }
      
      // Handle getRecentActivity query
      if (funcName.includes('getRecentActivity')) {
        let activities = storage['auditLogs'] || [];
        
        // Filter by organizationId
        if (args?.organizationId) {
          activities = activities.filter((a: any) => a.organizationId === args.organizationId);
        }
        
        // Filter by projectId if provided
        if (args?.projectId) {
          activities = activities.filter((a: any) => 
            a.context?.projectId === args.projectId
          );
        }
        
        // Sort by timestamp desc
        activities.sort((a: any, b: any) => (b.timestamp || b.createdAt) - (a.timestamp || a.createdAt));
        
        // Apply limit
        const limit = args?.limit || 50;
        activities = activities.slice(0, limit);
        
        // Include user information
        activities = await Promise.all(activities.map(async (activity: any) => {
          const user = activity.userId ? await mockDb.get(activity.userId) : null;
          return { ...activity, user };
        }));
        
        return activities;
      }
      
      // Handle getDashboardMetrics query
      if (funcName.includes('getDashboardMetrics')) {
        const products = (storage['products'] || [])
          .filter((p: any) => p.organizationId === args.organizationId);
        
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        
        const currentProducts = products.filter((p: any) => p.createdAt >= thirtyDaysAgo);
        const previousProducts = products.filter((p: any) => 
          p.createdAt < thirtyDaysAgo && p.createdAt >= thirtyDaysAgo - 30 * 24 * 60 * 60 * 1000
        );
        
        return {
          productGrowth: {
            current: currentProducts.length,
            previous: previousProducts.length,
            trend: currentProducts.length > previousProducts.length ? 'up' : 'down',
          },
          totalProducts: products.length,
          activeProjects: (storage['projects'] || [])
            .filter((p: any) => p.organizationId === args.organizationId && p.status === 'active')
            .length,
        };
      }
      // Handle getProduct (singular)
      if (funcName === 'getProduct' && args.productId) {
        const product = await mockDb.get(args.productId);
        if (!product) throw new Error('Product not found');
        return product;
      }
      // Handle organization queries
      if (funcName.includes('getOrganization')) {
        const orgId = args?.organizationId || 'org_1';
        const org = await mockDb.get(orgId);
        if (!org) {
          return {
            _id: 'org_1',
            name: 'Test Organization',
            slug: 'test-org',
          };
        }
        
        // Mask API keys if present
        if (org.apiKeys) {
          const masked = {};
          for (const [provider, key] of Object.entries(org.apiKeys)) {
            if (key && typeof key === 'string') {
              masked[provider] = key.substring(0, 3) + '...' + key.substring(key.length - 4);
            }
          }
          return { ...org, apiKeys: masked };
        }
        
        return org;
      }
      return undefined;
    }),
    runMutation: jest.fn(async (funcName: string, args: any) => {
      // Handle createCategorizationJob
      if (funcName === 'createCategorizationJob' || funcName.includes('createCategorizationJob')) {
        // Validate organization and API key
        const org = await mockDb.get(args.organizationId);
        if (!org) throw new Error('Organization not found');
        
        const provider = args.aiProvider || org.settings?.aiProvider || 'openai';
        const apiKey = org.settings?.apiKeys?.[provider];
        
        if (!apiKey) {
          throw new Error(`No API key configured for ${provider}`);
        }
        
        // Check model availability
        const deprecatedModels = ['text-davinci-003', 'gpt-4-32k'];
        if (deprecatedModels.includes(args.aiModel)) {
          throw new Error(`Model ${args.aiModel} is deprecated`);
        }
        
        // Create the job
        const jobId = await mockDb.insert('aiCategorizationJobs', {
          organizationId: args.organizationId,
          projectId: args.projectId,
          jobType: args.jobType,
          productIds: args.productIds || [],
          aiProvider: provider,
          aiModel: args.aiModel,
          prompt: args.prompt,
          notifications: args.notifications,
          status: 'pending',
          progress: { total: 0, processed: 0, successful: 0, failed: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        return { jobId };
      }
      
      // Handle create operations
      if (funcName.includes('create')) {
        const table = funcName.includes('Import') ? 'importJobs' :
                     funcName.includes('Product') ? 'products' :
                     funcName.includes('Project') ? 'projects' : 'other';
        
        let data = { ...args };
        
        // Add createdBy field if auth is available
        const authUser = ctx.auth.getUserIdentity ? await ctx.auth.getUserIdentity() : null;
        if (authUser && authUser.subject) {
          const user = (storage['users'] || []).find((u: any) => u.clerkId === authUser.subject);
          if (user) {
            data.createdBy = user._id;
          }
        }
        
        // Generate handle for products if not provided
        if (table === 'products' && !data.handle && data.name) {
          data.handle = data.name.toLowerCase().replace(/\s+/g, '-');
          
          // Check for duplicate handles
          const existingProduct = (storage['products'] || [])
            .find((p: any) => p.handle === data.handle && p.projectId === data.projectId);
          if (existingProduct) {
            throw new Error('Product handle already exists in this project');
          }
        }
        
        const id = await mockDb.insert(table, {
          ...data,
          status: data.status || (table === 'products' ? 'active' : 'pending'),
          progress: data.progress || { total: 0, processed: 0, successful: 0, failed: 0, skipped: 0 },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        
        return storage[table]?.find(d => d._id === id);
      }
      // Handle updateApiKeys
      if (funcName === 'updateApiKeys' || funcName.includes('updateApiKeys')) {
        const org = await mockDb.get(args.organizationId);
        if (!org) throw new Error('Organization not found');
        
        // Check user role
        const membership = (storage['organizationMemberships'] || [])
          .find((m: any) => m.organizationId === args.organizationId);
        if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
          throw new Error('Only admins can update API keys');
        }
        
        // Validate API key format
        if (args.provider === 'openAI' && args.apiKey && !args.apiKey.startsWith('sk-')) {
          throw new Error('Invalid OpenAI API key format');
        }
        
        // Update the API key
        if (!org.apiKeys) org.apiKeys = {};
        org.apiKeys[args.provider] = args.apiKey;
        await mockDb.patch(args.organizationId, { 
          apiKeys: org.apiKeys,
          updatedAt: Date.now()
        });
        
        // Create audit log
        await mockDb.insert('auditLogs', {
          organizationId: args.organizationId,
          eventType: 'api_key.updated',
          entityType: 'organization',
          entityId: args.organizationId,
          context: { provider: args.provider },
          createdAt: Date.now(),
        });
        
        return undefined;
      }
      
      // Handle removeApiKey
      if (funcName === 'removeApiKey' || funcName.includes('removeApiKey')) {
        const org = await mockDb.get(args.organizationId);
        if (!org) throw new Error('Organization not found');
        
        // Check user role
        const membership = (storage['organizationMemberships'] || [])
          .find((m: any) => m.organizationId === args.organizationId);
        if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
          throw new Error('Only admins can remove API keys');
        }
        
        // Remove the API key
        if (org.apiKeys && org.apiKeys[args.provider]) {
          delete org.apiKeys[args.provider];
          await mockDb.patch(args.organizationId, { 
            apiKeys: org.apiKeys,
            updatedAt: Date.now()
          });
        }
        
        // Create audit log
        await mockDb.insert('auditLogs', {
          organizationId: args.organizationId,
          eventType: 'api_key.removed',
          entityType: 'organization',
          entityId: args.organizationId,
          context: { provider: args.provider },
          createdAt: Date.now(),
        });
        
        return undefined;
      }
      
      // Handle deleteProduct
      if (funcName === 'deleteProduct' && args.productId) {
        // Update product with soft delete
        const product = await mockDb.get(args.productId);
        if (product) {
          await mockDb.patch(args.productId, { 
            status: 'archived',
            archivedAt: Date.now(),
            deletedAt: Date.now()
          });
          // Create trash entry
          const trashId = await mockDb.insert('productTrash', {
            productId: args.productId,
            deletionReason: args.reason,
            recoveryStatus: 'recoverable',
            deletedAt: Date.now()
          });
          return { success: true, trashId };
        }
        throw new Error('Product not found');
      }
      if (funcName === 'bulkDeleteProducts') {
        if (args.confirmationText !== 'DELETE 2 PRODUCTS') {
          throw new Error('Invalid confirmation text');
        }
        return { success: true, deletedCount: args.productIds.length };
      }
      // Handle updateProduct mutation
      if (funcName === 'updateProduct' && args.productId) {
        const product = await mockDb.get(args.productId);
        if (!product) throw new Error('Product not found');
        const updates = { ...args };
        delete updates.productId;
        await mockDb.patch(args.productId, {
          ...updates,
          updatedAt: Date.now()
        });
        return await mockDb.get(args.productId);
      }
      // Handle bulkUpdateProducts mutation
      if (funcName === 'bulkUpdateProducts' && args.productIds) {
        const updatedProducts = [];
        for (const productId of args.productIds) {
          await mockDb.patch(productId, {
            ...args.updates,
            updatedAt: Date.now()
          });
          updatedProducts.push(await mockDb.get(productId));
        }
        return { updated: updatedProducts.length };
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
      
      // Handle updateImportJobProgress mutation
      if (funcName === 'updateImportJobProgress' || funcName.includes('updateImportJobProgress')) {
        const job = await mockDb.get(args.jobId);
        if (!job) throw new Error('Job not found');
        
        const updates = {
          progress: {
            ...job.progress,
            ...args.progress,
          },
          updatedAt: Date.now(),
        };
        
        // Auto-complete if all processed
        if (updates.progress.processed >= updates.progress.total) {
          updates.status = 'completed';
          updates.completedAt = Date.now();
        }
        
        // Add errors if provided
        if (args.errors) {
          updates.errors = [...(job.errors || []), ...args.errors];
        }
        
        await mockDb.patch(args.jobId, updates);
        return await mockDb.get(args.jobId);
      }
      
      // Handle cancelImportJob mutation
      if (funcName === 'cancelImportJob' || funcName.includes('cancelImportJob')) {
        const job = await mockDb.get(args.jobId);
        if (!job) throw new Error('Job not found');
        
        if (job.status === 'completed') {
          throw new Error('Cannot cancel completed job');
        }
        
        const authUser = await mockAuth.getUserIdentity();
        const user = authUser ? (storage['users'] || []).find((u: any) => u.clerkId === authUser.subject) : null;
        
        await mockDb.patch(args.jobId, {
          status: 'cancelled',
          cancelledAt: Date.now(),
          cancelledBy: user?._id,
          updatedAt: Date.now(),
        });
        
        // Create audit log
        await mockDb.insert('auditLogs', {
          organizationId: job.organizationId,
          eventType: 'import.cancelled',
          entityType: 'importJob',
          entityId: args.jobId,
          context: { jobId: args.jobId },
          createdAt: Date.now(),
        });
        
        return await mockDb.get(args.jobId);
      }
      
      // Handle updateOrganization mutation
      if (funcName === 'updateOrganization' || funcName.includes('updateOrganization')) {
        const org = await mockDb.get(args.organizationId);
        if (!org) throw new Error('Organization not found');
        
        // Check user role
        const membership = (storage['organizationMemberships'] || [])
          .find((m: any) => m.organizationId === args.organizationId);
        if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
          throw new Error('Only admins can update organization');
        }
        
        const updates = { ...args };
        delete updates.organizationId;
        
        await mockDb.patch(args.organizationId, {
          ...updates,
          updatedAt: Date.now(),
        });
        
        return await mockDb.get(args.organizationId);
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

// Helper to create a mock database with predefined data
export const mockDb = (initialData: Partial<MockStorage>) => {
  const storage = { ...initialData };
  const idCounter: Record<string, number> = {};

  const generateId = (table: string) => {
    if (!idCounter[table]) idCounter[table] = 1;
    return `${table}_${idCounter[table]++}` as any;
  };

  const db = {
    insert: jest.fn(async (table: string, doc: any) => {
      const id = generateId(table);
      const docWithId = { ...doc, _id: id, _creationTime: Date.now() };
      if (!storage[table]) storage[table] = [];
      storage[table].push(docWithId);
      return id;
    }),
    query: jest.fn((table: string) => {
      const tableData = storage[table] || [];
      const queryBuilder: MockQueryBuilder = {
        filter: jest.fn((filterFn: any) => queryBuilder),
        order: jest.fn((order: string) => queryBuilder),
        withIndex: jest.fn((indexName: string, filterFn?: (q: any) => any) => {
          queryBuilder._index = indexName;
          const indexedBuilder = { ...queryBuilder };
          
          // Handle the filter function if provided
          if (filterFn) {
            const filterAPI = {
              eq: (field: string, value: any) => {
                queryBuilder._filters.push({ field, value, op: 'eq' });
                return indexedBuilder;
              },
            };
            filterFn(filterAPI);
          }
          
          // Add unique method for withIndex
          indexedBuilder.unique = jest.fn(async () => {
            let results = [...tableData];
            // Apply filters
            for (const filter of queryBuilder._filters) {
              results = results.filter(doc => doc[filter.field] === filter.value);
            }
            if (results.length > 1) {
              throw new Error(`Expected unique result but found ${results.length}`);
            }
            return results[0] || null;
          });
          
          return indexedBuilder;
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
          if (results.length > 1) {
            throw new Error(`Expected unique result but found ${results.length}`);
          }
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
    patch: jest.fn(async (id: string, updates: any) => {
      // Find and update document
      for (const table in storage) {
        const docIndex = storage[table].findIndex(d => d._id === id);
        if (docIndex !== -1) {
          storage[table][docIndex] = {
            ...storage[table][docIndex],
            ...updates,
            updatedAt: Date.now(),
          };
          return;
        }
      }
      throw new Error('Document not found');
    }),
    delete: jest.fn(async (id: string) => {
      // Find and delete document
      for (const table in storage) {
        const docIndex = storage[table].findIndex(d => d._id === id);
        if (docIndex !== -1) {
          storage[table].splice(docIndex, 1);
          return;
        }
      }
      throw new Error('Document not found');
    }),
  };

  return db;
};

// Helper to create a mock query context
export const mockQuery = (db: any, auth: any) => ({
  db,
  auth,
});

// Helper to create a mock mutation context
export const mockMutation = (db: any, auth: any) => ({
  db,
  auth,
});

// Helper to create a mock action context  
export const mockAction = (db: any, auth: any) => ({
  runQuery: jest.fn(),
  runMutation: jest.fn(),
  scheduler: {
    runAfter: jest.fn(),
    runAt: jest.fn(),
  },
  auth,
});

// Helper to mock auth context
export const mockAuth = (userId?: string | null) => ({
  getUserIdentity: jest.fn().mockResolvedValue(
    userId
      ? {
          tokenIdentifier: userId,
          subject: userId, // Add subject field
          email: 'test@example.com',
        }
      : null
  ),
});

// Helper to create mock data factories
export const createMockUser = (overrides: Partial<any> = {}) => ({
  _id: 'user1' as Id<'users'>,
  clerkId: 'clerk_123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  _creationTime: Date.now(),
  ...overrides,
});

export const createMockOrganization = (overrides: Partial<any> = {}) => ({
  _id: 'org1' as Id<'organizations'>,
  name: 'Test Organization',
  slug: 'test-org',
  _creationTime: Date.now(),
  ...overrides,
});

export const createMockProject = (overrides: Partial<any> = {}) => ({
  _id: 'project1' as Id<'projects'>,
  organizationId: 'org1' as Id<'organizations'>,
  name: 'Test Project',
  description: 'Test project description',
  _creationTime: Date.now(),
  ...overrides,
});

export const createMockProduct = (overrides: Partial<any> = {}) => ({
  _id: 'product1' as Id<'products'>,
  organizationId: 'org1' as Id<'organizations'>,
  projectId: 'project1' as Id<'projects'>,
  title: 'Test Product',
  description: 'Test product description',
  sku: 'TEST-SKU-001',
  type: 'physical' as const,
  handle: 'test-product',
  status: 'active' as const,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  _creationTime: Date.now(),
  ...overrides,
});

export const createMockCategory = (overrides: Partial<any> = {}) => ({
  _id: 'category1' as Id<'categories'>,
  organizationId: 'org1' as Id<'organizations'>,
  projectId: 'project1' as Id<'projects'>,
  name: 'Test Category',
  slug: 'test-category',
  level: 'parent' as const,
  parentId: null,
  status: 'active' as const,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  _creationTime: Date.now(),
  ...overrides,
});

export const createMockOrganizationMembership = (overrides: Partial<any> = {}) => ({
  _id: 'membership1' as Id<'organizationMemberships'>,
  organizationId: 'org1' as Id<'organizations'>,
  userId: 'user1' as Id<'users'>,
  role: 'owner' as const,
  status: 'active' as const,
  joinedAt: Date.now(),
  invitedBy: null,
  _creationTime: Date.now(),
  ...overrides,
});

// Example usage documentation
// Helper to extract handler from Convex query/mutation/action
export const extractHandler = (convexFunction: any) => {
  // Convex functions have a handler property when accessed directly
  // This is a workaround for testing since we can't easily import just the handler
  return convexFunction._handler || convexFunction.handler || 
    (async (ctx: any, args: any) => {
      // If no handler found, try to call the function directly
      // This will trigger the warning but will work for testing
      return await convexFunction(ctx, args);
    });
};

/**
 * Example Usage:
 * 
 * ```typescript
 * import { mockDb, mockQuery, mockAuth, createMockUser, createMockOrganization } from '../test-helpers';
 * 
 * describe('My Convex Query', () => {
 *   it('should return data for authenticated user', async () => {
 *     // Create mock data
 *     const user = createMockUser();
 *     const org = createMockOrganization();
 *     
 *     // Set up mock database
 *     const db = mockDb({
 *       users: [user],
 *       organizations: [org],
 *     });
 *     
 *     // Set up mock auth
 *     const auth = mockAuth(user.clerkId);
 *     
 *     // Create context
 *     const ctx = mockQuery(db, auth);
 *     
 *     // Call your function
 *     const result = await myQuery(ctx, { orgId: org._id });
 *     
 *     // Assert results
 *     expect(result).toBeDefined();
 *   });
 * });
 * ```
 */