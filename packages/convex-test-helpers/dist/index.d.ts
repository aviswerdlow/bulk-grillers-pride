/**
 * @bulk-grillers-pride/convex-test-helpers
 *
 * A comprehensive testing library for Convex backend functions.
 * Provides type-safe mocks and utilities for testing queries, mutations, and actions.
 */
export { createConvexTest } from './core';
export { createQueryContext, createMutationContext, createActionContext, type QueryContext, type MutationContext, type ActionContext, } from './context';
export { setupAuth, seedDatabase, clearDatabase, getTableData, getDocument, countDocuments, findDocuments, findDocument, waitFor, spyOnDbOperation, resetMocks, } from './utilities';
export { assertDocumentExists, assertDocumentNotExists, assertTableCount, assertDocumentFields, assertQueryCalled, assertMutationCalled, assertJobScheduled, assertAuthenticated, assertNotAuthenticated, assertDbOperationCallCount, } from './assertions';
export { createFactory, createMockUser, createMockOrganization, createMockProject, IdGenerator, createBatch, createRelatedDocuments, type Factory, type RelatedDocuments, } from './factories';
export type { ConvexTestContext, TableName, Document, Storage, MockQueryBuilder, PaginationOptions, PaginationResult, MockDatabase, MockSystemDB, MockAuth, MockScheduler, AuthUser, SeedData, } from './types';
//# sourceMappingURL=index.d.ts.map