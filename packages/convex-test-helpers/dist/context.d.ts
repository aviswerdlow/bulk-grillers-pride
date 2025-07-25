/**
 * Context builders for different Convex function types
 */
import type { ConvexTestContext } from './types';
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
export declare function createQueryContext(test: ConvexTestContext): QueryContext;
/**
 * Creates a mutation context for testing Convex mutations
 */
export declare function createMutationContext(test: ConvexTestContext): MutationContext;
/**
 * Creates an action context for testing Convex actions
 */
export declare function createActionContext(test: ConvexTestContext): ActionContext;
//# sourceMappingURL=context.d.ts.map