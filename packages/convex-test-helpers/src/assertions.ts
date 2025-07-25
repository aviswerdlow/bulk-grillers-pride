/**
 * Assertion helpers for Convex tests
 */

import type { ConvexTestContext } from './types';
import { getTableData, findDocument } from './utilities';

/**
 * Asserts that a document exists in the database
 */
export async function assertDocumentExists(
  test: ConvexTestContext,
  table: string,
  predicate: (doc: any) => boolean,
  message?: string
): Promise<void> {
  const docs = getTableData(test, table);
  const exists = docs.some(predicate);
  if (!exists) {
    throw new Error(message || `No document in ${table} matches the predicate`);
  }
}

/**
 * Asserts that a document does not exist in the database
 */
export async function assertDocumentNotExists(
  test: ConvexTestContext,
  table: string,
  predicate: (doc: any) => boolean,
  message?: string
): Promise<void> {
  const docs = getTableData(test, table);
  const exists = docs.some(predicate);
  if (exists) {
    throw new Error(message || `Document in ${table} matches the predicate but should not exist`);
  }
}

/**
 * Asserts that a table has a specific number of documents
 */
export function assertTableCount(
  test: ConvexTestContext,
  table: string,
  expectedCount: number,
  message?: string
): void {
  const tableData = test.storage.get(table);
  const actualCount = tableData ? tableData.size : 0;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      message || 
      `Expected ${table} to have ${expectedCount} documents but found ${actualCount}`
    );
  }
}

/**
 * Asserts that a document has specific field values
 */
export function assertDocumentFields(
  test: ConvexTestContext,
  table: string,
  documentId: string,
  expectedFields: Record<string, any>,
  message?: string
): void {
  const doc = findDocument(test, table, d => d._id === documentId);
  
  if (!doc) {
    throw new Error(`Document ${documentId} not found in ${table}`);
  }
  
  for (const [field, expectedValue] of Object.entries(expectedFields)) {
    if (doc[field] !== expectedValue) {
      throw new Error(
        message ||
        `Expected document ${documentId}.${field} to be ${JSON.stringify(expectedValue)} but got ${JSON.stringify(doc[field])}`
      );
    }
  }
}

/**
 * Asserts that a query was called with specific arguments
 */
export function assertQueryCalled(
  test: ConvexTestContext,
  queryName: string,
  expectedArgs?: any,
  message?: string
): void {
  const calls = test.runQuery.mock.calls.filter(call => call[0] === queryName);
  
  if (calls.length === 0) {
    throw new Error(message || `Query ${queryName} was not called`);
  }
  
  if (expectedArgs !== undefined) {
    const matchingCall = calls.find(call => 
      JSON.stringify(call[1]) === JSON.stringify(expectedArgs)
    );
    
    if (!matchingCall) {
      throw new Error(
        message ||
        `Query ${queryName} was not called with expected args: ${JSON.stringify(expectedArgs)}`
      );
    }
  }
}

/**
 * Asserts that a mutation was called with specific arguments
 */
export function assertMutationCalled(
  test: ConvexTestContext,
  mutationName: string,
  expectedArgs?: any,
  message?: string
): void {
  const calls = test.runMutation.mock.calls.filter(call => call[0] === mutationName);
  
  if (calls.length === 0) {
    throw new Error(message || `Mutation ${mutationName} was not called`);
  }
  
  if (expectedArgs !== undefined) {
    const matchingCall = calls.find(call => 
      JSON.stringify(call[1]) === JSON.stringify(expectedArgs)
    );
    
    if (!matchingCall) {
      throw new Error(
        message ||
        `Mutation ${mutationName} was not called with expected args: ${JSON.stringify(expectedArgs)}`
      );
    }
  }
}

/**
 * Asserts that a job was scheduled
 */
export function assertJobScheduled(
  test: ConvexTestContext,
  jobName: string,
  expectedArgs?: any,
  message?: string
): void {
  const afterCalls = test.scheduler.runAfter.mock.calls.filter(call => call[1] === jobName);
  const atCalls = test.scheduler.runAt.mock.calls.filter(call => call[1] === jobName);
  
  const allCalls = [...afterCalls, ...atCalls];
  
  if (allCalls.length === 0) {
    throw new Error(message || `Job ${jobName} was not scheduled`);
  }
  
  if (expectedArgs !== undefined) {
    const matchingCall = allCalls.find(call => 
      JSON.stringify(call[2]) === JSON.stringify(expectedArgs)
    );
    
    if (!matchingCall) {
      throw new Error(
        message ||
        `Job ${jobName} was not scheduled with expected args: ${JSON.stringify(expectedArgs)}`
      );
    }
  }
}

/**
 * Asserts that the user is authenticated
 */
export async function assertAuthenticated(
  test: ConvexTestContext,
  message?: string
): Promise<void> {
  const identity = await test.auth.getUserIdentity();
  if (!identity) {
    throw new Error(message || 'Expected user to be authenticated but was not');
  }
}

/**
 * Asserts that the user is not authenticated
 */
export async function assertNotAuthenticated(
  test: ConvexTestContext,
  message?: string
): Promise<void> {
  const identity = await test.auth.getUserIdentity();
  if (identity) {
    throw new Error(message || 'Expected user to not be authenticated but was');
  }
}

/**
 * Asserts that a database operation was called a specific number of times
 */
export function assertDbOperationCallCount(
  test: ConvexTestContext,
  operation: keyof ConvexTestContext['db'],
  expectedCount: number,
  message?: string
): void {
  const actualCount = (test.db[operation] as jest.MockedFunction<any>).mock.calls.length;
  
  if (actualCount !== expectedCount) {
    throw new Error(
      message ||
      `Expected ${operation} to be called ${expectedCount} times but was called ${actualCount} times`
    );
  }
}