/**
 * Standardized Convex Test Mock Pattern
 * 
 * This module provides a consistent, type-safe approach to mocking Convex
 * functionality in tests. It addresses the issues identified in T178.
 * 
 * Key improvements:
 * 1. Type-safe mock implementations
 * 2. Consistent API across all test files
 * 3. Better query builder implementation
 * 4. Support for advanced Convex features
 * 5. Clear separation of concerns
 */

import { Id } from '../_generated/dataModel';
import { t } from '../../test.setup';
import { QueryCtx, MutationCtx, ActionCtx } from '../_generated/server';

// ============================================================================
// Type Definitions
// ============================================================================

type TableName = string;
type Document = Record<string, any> & { _id: string; _creationTime: number };
type Storage = Map<TableName, Map<string, Document>>;
type IdGenerator = Map<TableName, number>;

export interface ConvexTestContext {
  storage: Storage;
  idGenerator: IdGenerator;
  auth: MockAuth;
  scheduler: MockScheduler;
  db: MockDatabase;
  runQuery: jest.MockedFunction<(name: string, args: any) => Promise<any>>;
  runMutation: jest.MockedFunction<(name: string, args: any) => Promise<any>>;
  runAction: jest.MockedFunction<(name: string, args: any) => Promise<any>>;
  subscriptions: MockSubscriptions;
}

interface MockQueryBuilder<T = any> {
  withIndex(indexName: string, filterFn?: (q: any) => any): MockQueryBuilder<T>;
  filter(filterFn: (doc: T) => boolean): MockQueryBuilder<T>;
  order(order: 'asc' | 'desc'): MockQueryBuilder<T>;
  eq(field: string, value: any): MockQueryBuilder<T>;
  gt(field: string, value: any): MockQueryBuilder<T>;
  gte(field: string, value: any): MockQueryBuilder<T>;
  lt(field: string, value: any): MockQueryBuilder<T>;
  lte(field: string, value: any): MockQueryBuilder<T>;
  collect(): Promise<T[]>;
  first(): Promise<T | null>;
  unique(): Promise<T | null>;
  take(n: number): MockQueryBuilder<T>;
  paginate(opts?: PaginationOptions): Promise<PaginationResult<T>>;
}

interface PaginationOptions {
  numItems?: number;
  cursor?: string | null;
}

interface PaginationResult<T> {
  page: T[];
  continueCursor: string | null;
  isDone: boolean;
}

interface MockDatabase {
  query: jest.MockedFunction<(table: string) => MockQueryBuilder>;
  insert: jest.MockedFunction<(table: string, doc: any) => Promise<string>>;
  get: jest.MockedFunction<(id: string) => Promise<any>>;
  patch: jest.MockedFunction<(id: string, updates: any) => Promise<void>>;
  replace: jest.MockedFunction<(id: string, doc: any) => Promise<void>>;
  delete: jest.MockedFunction<(id: string) => Promise<void>>;
  normalize: jest.MockedFunction<(id: string) => string>;
  system: MockSystemDB;
  run: jest.MockedFunction<(fn: (tx: MockDatabase) => Promise<any>) => Promise<any>>;
}

interface MockSystemDB {
  query: jest.MockedFunction<(table: string) => MockQueryBuilder>;
  get: jest.MockedFunction<(id: string) => Promise<any>>;
}

interface MockAuth {
  getUserIdentity: jest.MockedFunction<() => Promise<any>>;
}

interface MockScheduler {
  runAfter: jest.MockedFunction<(delayMs: number, name: string, args: any) => Promise<void>>;
  runAt: jest.MockedFunction<(timestamp: number, name: string, args: any) => Promise<void>>;
  cancel: jest.MockedFunction<(jobId: string) => Promise<void>>;
}

interface MockSubscriptions {
  subscribe: jest.MockedFunction<(queryName: string, args: any, callback: (data: any) => void) => () => void>;
  notifySubscribers: jest.MockedFunction<(queryName: string, args: any, data: any) => void>;
  getActiveSubscriptions: jest.MockedFunction<() => Array<{ query: string; args: any; listeners: number }>>;
}

// ============================================================================
// Core Implementation
// ============================================================================

// ============================================================================
// Debug Utilities
// ============================================================================

/**
 * Logs all data in a specific table for debugging
 */
export function debugTable(test: ConvexTestContext, tableName: string): void {
  const tableData = test.storage.get(tableName);
  if (!tableData || tableData.size === 0) {
    console.log(`Table '${tableName}' is empty`);
    return;
  }
  
  console.log(`\n=== Table: ${tableName} (${tableData.size} documents) ===`);
  for (const [id, doc] of tableData) {
    console.log(`  ${id}:`, JSON.stringify(doc, null, 2));
  }
}

/**
 * Logs all tables and their document counts
 */
export function debugAllTables(test: ConvexTestContext): void {
  console.log('\n=== Database Overview ===');
  if (test.storage.size === 0) {
    console.log('No tables in database');
    return;
  }
  
  for (const [tableName, tableData] of test.storage) {
    console.log(`  ${tableName}: ${tableData.size} documents`);
  }
}

/**
 * Logs all mock function calls for debugging test failures
 */
export function debugMockCalls(test: ConvexTestContext): void {
  console.log('\n=== Mock Function Calls ===');
  
  const mocks = {
    'db.query': t.db.query,
    'db.insert': t.db.insert,
    'db.get': t.db.get,
    'db.patch': t.db.patch,
    'db.delete': t.db.delete,
    'auth.getUserIdentity': test.auth.getUserIdentity,
    'runQuery': test.runQuery,
    'runMutation': test.runMutation,
    'runAction': test.runAction,
  };
  
  for (const [name, mock] of Object.entries(mocks)) {
    if (mock.mock.calls.length > 0) {
      console.log(`\n  ${name}: ${mock.mock.calls.length} calls`);
      mock.mock.calls.forEach((call, i) => {
        console.log(`    Call ${i + 1}:`, JSON.stringify(call, null, 2));
      });
    }
  }
}

/**
 * Finds documents matching a predicate across all tables
 */
export function findDocuments(
  test: ConvexTestContext,
  predicate: (doc: any, tableName: string) => boolean
): Array<{ table: string; id: string; doc: any }> {
  const results: Array<{ table: string; id: string; doc: any }> = [];
  
  for (const [tableName, tableData] of test.storage) {
    for (const [id, doc] of tableData) {
      if (predicate(doc, tableName)) {
        results.push({ table: tableName, id, doc });
      }
    }
  }
  
  return results;
}

/**
 * Creates mock subscription system for real-time updates
 */
function createMockSubscriptions(): MockSubscriptions {
  const subscriptions = new Map<string, Set<(data: any) => void>>();
  
  return {
    subscribe: jest.fn((queryName: string, args: any, callback: (data: any) => void) => {
      const key = `${queryName}:${JSON.stringify(args)}`;
      if (!subscriptions.has(key)) {
        subscriptions.set(key, new Set());
      }
      subscriptions.get(key)!.add(callback);
      
      // Return unsubscribe function
      return () => {
        const subs = subscriptions.get(key);
        if (subs) {
          subs.delete(callback);
          if (subs.size === 0) {
            subscriptions.delete(key);
          }
        }
      };
    }),
    
    notifySubscribers: jest.fn((queryName: string, args: any, data: any) => {
      const key = `${queryName}:${JSON.stringify(args)}`;
      const subs = subscriptions.get(key);
      if (subs) {
        subs.forEach(callback => callback(data));
      }
    }),
    
    getActiveSubscriptions: jest.fn(() => {
      const active: Array<{ query: string; args: any; listeners: number }> = [];
      for (const [key, subs] of subscriptions) {
        const [query, argsStr] = key.split(':', 2);
        active.push({
          query: query || '',
          args: JSON.parse(argsStr || '{}'),
          listeners: subs.size,
        });
      }
      return active;
    }),
  };
}

/**
 * Creates a standardized Convex test context with all necessary mocks
 */
export function createConvexTest(): ConvexTestContext {
  const storage: Storage = new Map();
  const idGenerator: IdGenerator = new Map();
  
  // Generate deterministic IDs for testing
  const generateId = (table: string): string => {
    const current = idGenerator.get(table) || 0;
    const next = current + 1;
    idGenerator.set(table, next);
    return `${table}_${next}`;
  };
  
  // Create query builder implementation
  const createQueryBuilder = <T = any>(table: string): MockQueryBuilder<T> => {
    const filters: Array<(doc: T) => boolean> = [];
    let indexName: string | null = null;
    let orderDirection: 'asc' | 'desc' = 'asc';
    let limit: number | null = null;
    
    const applyFilters = (docs: T[]): T[] => {
      let result = [...docs];
      
      // Apply all filters
      for (const filter of filters) {
        result = result.filter(filter);
      }
      
      // Apply ordering
      if (orderDirection === 'desc') {
        result.reverse();
      }
      
      // Apply limit
      if (limit !== null) {
        result = result.slice(0, limit);
      }
      
      return result;
    };
    
    const builder: MockQueryBuilder<T> = {
      withIndex: jest.fn((name: string, filterFn?: (q: any) => any) => {
        indexName = name;
        if (filterFn) {
          const filterAPI = {
            eq: (field: string, value: any) => builder.eq(field, value),
            gt: (field: string, value: any) => builder.gt(field, value),
            gte: (field: string, value: any) => builder.gte(field, value),
            lt: (field: string, value: any) => builder.lt(field, value),
            lte: (field: string, value: any) => builder.lte(field, value),
          };
          filterFn(filterAPI as any);
        }
        return builder;
      }),
      
      filter: jest.fn((filterFn: ((doc: T) => boolean) | ((q: any) => any)) => {
        // Handle Convex-style filter with q.field()
        if (filterFn.length > 1 || filterFn.toString().includes('q.')) {
          // This is a Convex-style filter function
          const filterAPI = {
            eq: (fieldAccessor: any, value: any) => {
              // Handle q.field('fieldName') pattern
              if (typeof fieldAccessor === 'function' && fieldAccessor.toString().includes('field')) {
                // Extract field name from the function
                const fieldMatch = filterFn.toString().match(/q\.field\(['"](\w+)['"]\)/);
                if (fieldMatch) {
                  const fieldName = fieldMatch[1];
                  filters.push((doc: any) => doc[fieldName as string] === value);
                }
              } else if (typeof fieldAccessor === 'string') {
                filters.push((doc: any) => doc[fieldAccessor] === value);
              }
              return true;
            },
            field: (fieldName: string) => fieldName,
          };
          filterFn(filterAPI as any);
        } else {
          // Regular filter function
          filters.push(filterFn as (doc: T) => boolean);
        }
        return builder;
      }),
      
      order: jest.fn((order: 'asc' | 'desc') => {
        orderDirection = order;
        return builder;
      }),
      
      eq: jest.fn((field: string, value: any) => {
        filters.push((doc: any) => doc[field] === value);
        return builder;
      }),
      
      gt: jest.fn((field: string, value: any) => {
        filters.push((doc: any) => doc[field] > value);
        return builder;
      }),
      
      gte: jest.fn((field: string, value: any) => {
        filters.push((doc: any) => doc[field] >= value);
        return builder;
      }),
      
      lt: jest.fn((field: string, value: any) => {
        filters.push((doc: any) => doc[field] < value);
        return builder;
      }),
      
      lte: jest.fn((field: string, value: any) => {
        filters.push((doc: any) => doc[field] <= value);
        return builder;
      }),
      
      collect: jest.fn(async () => {
        const tableData = storage.get(table) || new Map();
        const docs = Array.from(tableData.values()) as T[];
        return applyFilters(docs);
      }),
      
      first: jest.fn(async () => {
        const results = await builder.collect();
        return results[0] || null;
      }),
      
      unique: jest.fn(async () => {
        const results = await builder.collect();
        if (results.length > 1) {
          throw new Error(`Expected unique result but found ${results.length}`);
        }
        return results[0] || null;
      }),
      
      take: jest.fn((n: number) => {
        limit = n;
        return builder;
      }),
      
      paginate: jest.fn(async (opts?: PaginationOptions) => {
        const numItems = opts?.numItems || 10;
        const cursor = opts?.cursor || '0';
        const cursorIndex = parseInt(cursor, 10);
        
        const allResults = await builder.collect();
        const page = allResults.slice(cursorIndex, cursorIndex + numItems);
        const nextCursor = cursorIndex + page.length;
        
        return {
          page,
          continueCursor: nextCursor < allResults.length ? nextCursor.toString() : null,
          isDone: nextCursor >= allResults.length,
        };
      }),
    };
    
    return builder;
  };
  
  // Create mock database
  const db: MockDatabase = {
    query: jest.fn((table: string) => createQueryBuilder(table)),
    
    insert: jest.fn(async (table: string, doc: any) => {
      const id = generateId(table);
      const fullDoc = {
        ...doc,
        _id: id,
        _creationTime: Date.now(),
      };
      
      if (!storage.has(table)) {
        storage.set(table, new Map());
      }
      storage.get(table)!.set(id, fullDoc);
      
      return id;
    }),
    
    get: jest.fn(async (id: string) => {
      for (const [_, tableData] of storage) {
        if (tableData.has(id)) {
          return tableData.get(id);
        }
      }
      return null;
    }),
    
    patch: jest.fn(async (id: string, updates: any) => {
      for (const [_, tableData] of storage) {
        if (tableData.has(id)) {
          const doc = tableData.get(id)!;
          tableData.set(id, { ...doc, ...updates });
          return;
        }
      }
      throw new Error(`Document ${id} not found`);
    }),
    
    replace: jest.fn(async (id: string, doc: any) => {
      for (const [_, tableData] of storage) {
        if (tableData.has(id)) {
          tableData.set(id, { ...doc, _id: id, _creationTime: Date.now() });
          return;
        }
      }
      throw new Error(`Document ${id} not found`);
    }),
    
    delete: jest.fn(async (id: string) => {
      for (const [_, tableData] of storage) {
        if (tableData.has(id)) {
          tableData.delete(id);
          return;
        }
      }
      throw new Error(`Document ${id} not found`);
    }),
    
    normalize: jest.fn((id: string) => id),
    
    system: {
      query: jest.fn((table: string) => createQueryBuilder(table)),
      get: jest.fn(async (id: string) => null),
    },
    
    run: jest.fn(async (fn: (tx: MockDatabase) => Promise<any>) => {
      // Create a transaction context with the same db methods
      // In a real transaction, these would be isolated, but for testing
      // we'll use the same storage with the ability to rollback
      const txStorage = new Map(storage);
      const tx = { ...db }; // Transaction uses same methods
      
      try {
        const result = await fn(tx);
        // Transaction succeeded, changes are already in storage
        return result;
      } catch (error) {
        // Transaction failed, rollback by restoring original storage
        storage.clear();
        for (const [table, data] of txStorage) {
          storage.set(table, new Map(data));
        }
        throw error;
      }
    }),
  };
  
  // Create mock auth
  const auth: MockAuth = {
    getUserIdentity: jest.fn().mockResolvedValue(null),
  };
  
  // Create mock scheduler
  const scheduler: MockScheduler = {
    runAfter: jest.fn().mockResolvedValue(undefined),
    runAt: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  };
  
  // Create run functions
  const runQuery = jest.fn(async (name: string, args: any) => {
    // Default implementations for common queries
    return undefined;
  });
  
  const runMutation = jest.fn(async (name: string, args: any) => {
    // Default implementations for common mutations
    return undefined;
  });
  
  const runAction = jest.fn(async (name: string, args: any) => {
    // Default implementations for common actions
    return undefined;
  });
  
  // Create mock subscriptions
  const subscriptions = createMockSubscriptions();
  
  return {
    storage,
    idGenerator,
    auth,
    scheduler,
    db,
    runQuery,
    runMutation,
    runAction,
    subscriptions,
  };
}

// ============================================================================
// Context Builders
// ============================================================================

/**
 * Creates a query context for testing Convex queries
 */
export function createQueryContext(test: ConvexTestContext): QueryCtx {
  return {
    db: t.db,
    auth: test.auth,
  } as unknown as QueryCtx;
}

/**
 * Creates a mutation context for testing Convex mutations
 */
export function createMutationContext(test: ConvexTestContext): MutationCtx {
  return {
    db: t.db,
    auth: test.auth,
    scheduler: test.scheduler,
  } as unknown as MutationCtx;
}

/**
 * Creates an action context for testing Convex actions
 */
export function createActionContext(test: ConvexTestContext): ActionCtx {
  return {
    auth: test.auth,
    scheduler: test.scheduler,
    runQuery: test.runQuery,
    runMutation: test.runMutation,
    runAction: test.runAction,
  } as unknown as ActionCtx;
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Sets up authentication for a test context
 */
export function setupAuth(test: ConvexTestContext, user: {
  tokenIdentifier: string;
  email?: string;
  subject?: string;
} | null) {
  test.auth.getUserIdentity.mockResolvedValue(
    user ? {
      tokenIdentifier: user.tokenIdentifier,
      subject: user.subject || user.tokenIdentifier,
      email: user.email || 'test@example.com',
      emailVerified: true,
      issuer: 'test',
    } : null
  );
}

/**
 * Seeds the test database with initial data
 */
export async function seedDatabase(test: ConvexTestContext, data: {
  [table: string]: any[];
}) {
  for (const [table, documents] of Object.entries(data)) {
    for (const doc of documents) {
      if (doc._id) {
        // If document has an ID, use it directly
        if (!test.storage.has(table)) {
          test.storage.set(table, new Map());
        }
        test.storage.get(table)!.set(doc._id, {
          ...doc,
          _creationTime: doc._creationTime || Date.now(),
        });
      } else {
        // Otherwise, use the insert method to generate an ID
        await t.db.insert(table, doc);
      }
    }
  }
}

/**
 * Clears all data from the test database
 */
export function clearDatabase(test: ConvexTestContext) {
  test.storage.clear();
  test.idGenerator.clear();
}

/**
 * Gets all documents from a table
 */
export function getTableData(test: ConvexTestContext, table: string): any[] {
  const tableData = test.storage.get(table);
  return tableData ? Array.from(tableData.values()) : [];
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Asserts that a document exists in the database
 */
export async function assertDocumentExists(
  test: ConvexTestContext,
  table: string,
  predicate: (doc: any) => boolean
) {
  const docs = getTableData(test, table);
  const exists = docs.some(predicate);
  if (!exists) {
    throw new Error(`No document in ${table} matches the predicate`);
  }
}

/**
 * Asserts that a document does not exist in the database
 */
export async function assertDocumentNotExists(
  test: ConvexTestContext,
  table: string,
  predicate: (doc: any) => boolean
) {
  const docs = getTableData(test, table);
  const exists = docs.some(predicate);
  if (exists) {
    throw new Error(`Document in ${table} matches the predicate but should not exist`);
  }
}

// ============================================================================
// Legacy Compatibility
// ============================================================================

/**
 * Legacy compatibility wrapper for existing tests
 * @deprecated Use createConvexTest() instead
 */
export function t() {
  const test = createConvexTest();
  
  return {
    db: test.db,
    auth: test.auth,
    runQuery: test.runQuery,
    runMutation: test.runMutation,
    runAction: test.runAction,
  };
}

// Re-export data factories from the original test-helpers
export {
  createMockUser,
  createMockOrganization,
  createMockProject,
  createMockProduct,
  createMockCategory,
  createMockOrganizationMembership,
} from './test-helpers';