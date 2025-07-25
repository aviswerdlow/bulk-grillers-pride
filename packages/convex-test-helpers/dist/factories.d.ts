/**
 * Factory functions for creating test data
 *
 * These are generic factories that can be extended by users
 * for their specific data models
 */
/**
 * Base factory function type
 */
export type Factory<T> = (overrides?: Partial<T>) => T;
/**
 * Creates a factory function for generating test data
 */
export declare function createFactory<T>(defaults: T): Factory<T>;
/**
 * Common test data factories
 */
export declare const createMockUser: Factory<{
    _id: string;
    email: string;
    name: string;
    role: string;
    createdAt: number;
    updatedAt: number;
}>;
export declare const createMockOrganization: Factory<{
    _id: string;
    name: string;
    slug: string;
    createdAt: number;
    updatedAt: number;
}>;
export declare const createMockProject: Factory<{
    _id: string;
    organizationId: string;
    name: string;
    description: string;
    status: string;
    createdAt: number;
    updatedAt: number;
}>;
/**
 * ID generator for creating sequential IDs
 */
export declare class IdGenerator {
    private prefix;
    private counters;
    constructor(prefix?: string);
    /**
     * Generates a new ID for the given type
     */
    next(type: string): string;
    /**
     * Resets the counter for a specific type
     */
    reset(type?: string): void;
}
/**
 * Creates a batch of documents with sequential IDs
 */
export declare function createBatch<T>(factory: Factory<T>, count: number, overridesOrFn?: Partial<T> | ((index: number) => Partial<T>)): T[];
/**
 * Creates related documents with proper foreign key relationships
 */
export interface RelatedDocuments {
    [table: string]: any[];
}
export declare function createRelatedDocuments(specs: {
    [table: string]: {
        factory: Factory<any>;
        count: number;
        relate?: (doc: any, related: RelatedDocuments, index: number) => any;
    };
}): RelatedDocuments;
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
//# sourceMappingURL=factories.d.ts.map