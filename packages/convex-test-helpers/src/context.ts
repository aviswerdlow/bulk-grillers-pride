/**
 * Context builders for different Convex function types
 */

import type { ConvexTestContext } from './types';

// We'll use generic types since we don't have access to the actual Convex types
// Users can cast these to the appropriate Convex context types in their tests
export type QueryContext = {
  db: ConvexTestContext['db'];
  auth: ConvexTestContext['auth'];
};

export type MutationContext = {
  db: ConvexTestContext['db'];
  auth: ConvexTestContext['auth'];
  scheduler: ConvexTestContext['scheduler'];
};

export type ActionContext = {
  auth: ConvexTestContext['auth'];
  scheduler: ConvexTestContext['scheduler'];
  runQuery: ConvexTestContext['runQuery'];
  runMutation: ConvexTestContext['runMutation'];
  runAction: ConvexTestContext['runAction'];
};

/**
 * Creates a query context for testing Convex queries
 */
export function createQueryContext(test: ConvexTestContext): QueryContext {
  return {
    db: test.db,
    auth: test.auth,
  };
}

/**
 * Creates a mutation context for testing Convex mutations
 */
export function createMutationContext(test: ConvexTestContext): MutationContext {
  return {
    db: test.db,
    auth: test.auth,
    scheduler: test.scheduler,
  };
}

/**
 * Creates an action context for testing Convex actions
 */
export function createActionContext(test: ConvexTestContext): ActionContext {
  return {
    auth: test.auth,
    scheduler: test.scheduler,
    runQuery: test.runQuery,
    runMutation: test.runMutation,
    runAction: test.runAction,
  };
}