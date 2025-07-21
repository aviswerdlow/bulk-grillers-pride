/**
 * Context builders for different Convex function types
 */
/**
 * Creates a query context for testing Convex queries
 */
export function createQueryContext(test) {
    return {
        db: test.db,
        auth: test.auth,
    };
}
/**
 * Creates a mutation context for testing Convex mutations
 */
export function createMutationContext(test) {
    return {
        db: test.db,
        auth: test.auth,
        scheduler: test.scheduler,
    };
}
/**
 * Creates an action context for testing Convex actions
 */
export function createActionContext(test) {
    return {
        auth: test.auth,
        scheduler: test.scheduler,
        runQuery: test.runQuery,
        runMutation: test.runMutation,
        runAction: test.runAction,
    };
}
//# sourceMappingURL=context.js.map