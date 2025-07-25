/**
 * Utility functions for test setup and data management
 */
import type { ConvexTestContext, AuthUser, SeedData } from './types';
/**
 * Sets up authentication for a test context
 */
export declare function setupAuth(test: ConvexTestContext, user: AuthUser | null): void;
/**
 * Seeds the test database with initial data
 */
export declare function seedDatabase(test: ConvexTestContext, data: SeedData): Promise<void>;
/**
 * Clears all data from the test database
 */
export declare function clearDatabase(test: ConvexTestContext): void;
/**
 * Gets all documents from a table
 */
export declare function getTableData(test: ConvexTestContext, table: string): any[];
/**
 * Gets a document by ID
 */
export declare function getDocument(test: ConvexTestContext, id: string): Promise<any | null>;
/**
 * Counts documents in a table
 */
export declare function countDocuments(test: ConvexTestContext, table: string): number;
/**
 * Finds documents matching a predicate
 */
export declare function findDocuments<T = any>(test: ConvexTestContext, table: string, predicate: (doc: T) => boolean): T[];
/**
 * Finds a single document matching a predicate
 */
export declare function findDocument<T = any>(test: ConvexTestContext, table: string, predicate: (doc: T) => boolean): T | undefined;
/**
 * Waits for a condition to be true (useful for async operations)
 */
export declare function waitFor(condition: () => boolean | Promise<boolean>, timeout?: number, interval?: number): Promise<void>;
/**
 * Creates a spy for a specific database operation
 */
export declare function spyOnDbOperation(test: ConvexTestContext, operation: keyof ConvexTestContext['db']): jest.MockedFunction<any>;
/**
 * Resets all mock functions to their initial state
 */
export declare function resetMocks(test: ConvexTestContext): void;
//# sourceMappingURL=utilities.d.ts.map