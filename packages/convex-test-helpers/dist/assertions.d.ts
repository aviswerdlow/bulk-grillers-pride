/**
 * Assertion helpers for Convex tests
 */
import type { ConvexTestContext } from './types';
/**
 * Asserts that a document exists in the database
 */
export declare function assertDocumentExists(test: ConvexTestContext, table: string, predicate: (doc: any) => boolean, message?: string): Promise<void>;
/**
 * Asserts that a document does not exist in the database
 */
export declare function assertDocumentNotExists(test: ConvexTestContext, table: string, predicate: (doc: any) => boolean, message?: string): Promise<void>;
/**
 * Asserts that a table has a specific number of documents
 */
export declare function assertTableCount(test: ConvexTestContext, table: string, expectedCount: number, message?: string): void;
/**
 * Asserts that a document has specific field values
 */
export declare function assertDocumentFields(test: ConvexTestContext, table: string, documentId: string, expectedFields: Record<string, any>, message?: string): void;
/**
 * Asserts that a query was called with specific arguments
 */
export declare function assertQueryCalled(test: ConvexTestContext, queryName: string, expectedArgs?: any, message?: string): void;
/**
 * Asserts that a mutation was called with specific arguments
 */
export declare function assertMutationCalled(test: ConvexTestContext, mutationName: string, expectedArgs?: any, message?: string): void;
/**
 * Asserts that a job was scheduled
 */
export declare function assertJobScheduled(test: ConvexTestContext, jobName: string, expectedArgs?: any, message?: string): void;
/**
 * Asserts that the user is authenticated
 */
export declare function assertAuthenticated(test: ConvexTestContext, message?: string): Promise<void>;
/**
 * Asserts that the user is not authenticated
 */
export declare function assertNotAuthenticated(test: ConvexTestContext, message?: string): Promise<void>;
/**
 * Asserts that a database operation was called a specific number of times
 */
export declare function assertDbOperationCallCount(test: ConvexTestContext, operation: keyof ConvexTestContext['db'], expectedCount: number, message?: string): void;
//# sourceMappingURL=assertions.d.ts.map