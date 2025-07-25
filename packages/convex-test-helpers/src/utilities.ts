/**
 * Utility functions for test setup and data management
 */

import type { ConvexTestContext, AuthUser, SeedData } from './types';

/**
 * Sets up authentication for a test context
 */
export function setupAuth(test: ConvexTestContext, user: AuthUser | null) {
  test.auth.getUserIdentity.mockResolvedValue(
    user ? {
      tokenIdentifier: user.tokenIdentifier,
      subject: user.subject || user.tokenIdentifier,
      email: user.email || 'test@example.com',
      emailVerified: user.emailVerified ?? true,
      issuer: user.issuer || 'test',
    } : null
  );
}

/**
 * Seeds the test database with initial data
 */
export async function seedDatabase(test: ConvexTestContext, data: SeedData) {
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
        await test.db.insert(table, doc);
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

/**
 * Gets a document by ID
 */
export async function getDocument(test: ConvexTestContext, id: string): Promise<any | null> {
  return test.db.get(id);
}

/**
 * Counts documents in a table
 */
export function countDocuments(test: ConvexTestContext, table: string): number {
  const tableData = test.storage.get(table);
  return tableData ? tableData.size : 0;
}

/**
 * Finds documents matching a predicate
 */
export function findDocuments<T = any>(
  test: ConvexTestContext,
  table: string,
  predicate: (doc: T) => boolean
): T[] {
  const docs = getTableData(test, table) as T[];
  return docs.filter(predicate);
}

/**
 * Finds a single document matching a predicate
 */
export function findDocument<T = any>(
  test: ConvexTestContext,
  table: string,
  predicate: (doc: T) => boolean
): T | undefined {
  const docs = getTableData(test, table) as T[];
  return docs.find(predicate);
}

/**
 * Waits for a condition to be true (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Creates a spy for a specific database operation
 */
export function spyOnDbOperation(
  test: ConvexTestContext,
  operation: keyof ConvexTestContext['db']
): jest.MockedFunction<any> {
  return test.db[operation] as jest.MockedFunction<any>;
}

/**
 * Resets all mock functions to their initial state
 */
export function resetMocks(test: ConvexTestContext) {
  test.db.query.mockClear();
  test.db.insert.mockClear();
  test.db.get.mockClear();
  test.db.patch.mockClear();
  test.db.replace.mockClear();
  test.db.delete.mockClear();
  test.db.normalize.mockClear();
  test.db.system.query.mockClear();
  test.db.system.get.mockClear();
  test.auth.getUserIdentity.mockClear();
  test.scheduler.runAfter.mockClear();
  test.scheduler.runAt.mockClear();
  test.scheduler.cancel.mockClear();
  test.runQuery.mockClear();
  test.runMutation.mockClear();
  test.runAction.mockClear();
}