/**
 * @bulk-grillers-pride/convex-test-helpers
 * 
 * A comprehensive testing library for Convex backend functions.
 * Provides type-safe mocks and utilities for testing queries, mutations, and actions.
 */

// Core exports
export { createConvexTest } from './core';

// Context exports
export {
  createQueryContext,
  createMutationContext,
  createActionContext,
  type QueryContext,
  type MutationContext,
  type ActionContext,
} from './context';

// Utility exports
export {
  setupAuth,
  seedDatabase,
  clearDatabase,
  getTableData,
  getDocument,
  countDocuments,
  findDocuments,
  findDocument,
  waitFor,
  spyOnDbOperation,
  resetMocks,
} from './utilities';

// Assertion exports
export {
  assertDocumentExists,
  assertDocumentNotExists,
  assertTableCount,
  assertDocumentFields,
  assertQueryCalled,
  assertMutationCalled,
  assertJobScheduled,
  assertAuthenticated,
  assertNotAuthenticated,
  assertDbOperationCallCount,
} from './assertions';

// Factory exports
export {
  createFactory,
  createMockUser,
  createMockOrganization,
  createMockProject,
  IdGenerator,
  createBatch,
  createRelatedDocuments,
  type Factory,
  type RelatedDocuments,
} from './factories';

// Type exports
export type {
  ConvexTestContext,
  TableName,
  Document,
  Storage,
  MockQueryBuilder,
  PaginationOptions,
  PaginationResult,
  MockDatabase,
  MockSystemDB,
  MockAuth,
  MockScheduler,
  AuthUser,
  SeedData,
} from './types';