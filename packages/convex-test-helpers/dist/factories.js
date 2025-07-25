/**
 * Factory functions for creating test data
 *
 * These are generic factories that can be extended by users
 * for their specific data models
 */
/**
 * Creates a factory function for generating test data
 */
export function createFactory(defaults) {
    return (overrides) => ({
        ...defaults,
        ...overrides,
        _creationTime: Date.now(),
    });
}
/**
 * Common test data factories
 */
export const createMockUser = createFactory({
    _id: 'user_1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: Date.now(),
    updatedAt: Date.now(),
});
export const createMockOrganization = createFactory({
    _id: 'org_1',
    name: 'Test Organization',
    slug: 'test-org',
    createdAt: Date.now(),
    updatedAt: Date.now(),
});
export const createMockProject = createFactory({
    _id: 'project_1',
    organizationId: 'org_1',
    name: 'Test Project',
    description: 'A test project',
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
});
/**
 * ID generator for creating sequential IDs
 */
export class IdGenerator {
    prefix;
    counters = new Map();
    constructor(prefix = '') {
        this.prefix = prefix;
    }
    /**
     * Generates a new ID for the given type
     */
    next(type) {
        const current = this.counters.get(type) || 0;
        const next = current + 1;
        this.counters.set(type, next);
        return `${this.prefix}${type}_${next}`;
    }
    /**
     * Resets the counter for a specific type
     */
    reset(type) {
        if (type) {
            this.counters.delete(type);
        }
        else {
            this.counters.clear();
        }
    }
}
/**
 * Creates a batch of documents with sequential IDs
 */
export function createBatch(factory, count, overridesOrFn) {
    const results = [];
    for (let i = 0; i < count; i++) {
        const overrides = typeof overridesOrFn === 'function'
            ? overridesOrFn(i)
            : overridesOrFn;
        results.push(factory(overrides));
    }
    return results;
}
export function createRelatedDocuments(specs) {
    const result = {};
    // First pass: create all documents
    for (const [table, spec] of Object.entries(specs)) {
        result[table] = createBatch(spec.factory, spec.count);
    }
    // Second pass: apply relationships
    for (const [table, spec] of Object.entries(specs)) {
        if (spec.relate) {
            result[table] = result[table]?.map((doc, index) => spec.relate(doc, result, index)) || [];
        }
    }
    return result;
}
/**
 * Example usage:
 *
 * const data = createRelatedDocuments({
 *   users: {
 *     factory: createMockUser,
 *     count: 3,
 *   },
 *   organizations: {
 *     factory: createMockOrganization,
 *     count: 2,
 *   },
 *   memberships: {
 *     factory: createMockMembership,
 *     count: 3,
 *     relate: (doc, related, index) => ({
 *       ...doc,
 *       userId: related.users[index]._id,
 *       organizationId: related.organizations[index % 2]._id,
 *     }),
 *   },
 * });
 */ 
//# sourceMappingURL=factories.js.map