/**
 * Core functionality for creating Convex test contexts
 */
/**
 * Creates a standardized Convex test context with all necessary mocks
 */
export function createConvexTest() {
    const storage = new Map();
    const idGenerator = new Map();
    // Generate deterministic IDs for testing
    const generateId = (table) => {
        const current = idGenerator.get(table) || 0;
        const next = current + 1;
        idGenerator.set(table, next);
        return `${table}_${next}`;
    };
    // Create query builder implementation
    const createQueryBuilder = (table) => {
        const filters = [];
        let indexName = null;
        let orderDirection = 'asc';
        let limit = null;
        const applyFilters = (docs) => {
            let result = [...docs];
            // Apply all filters
            for (const filter of filters) {
                result = result.filter(filter);
            }
            // Apply ordering
            if (orderDirection === 'desc') {
                result.reverse();
            }
            // Apply limit
            if (limit !== null) {
                result = result.slice(0, limit);
            }
            return result;
        };
        const builder = {
            withIndex: jest.fn((name, filterFn) => {
                indexName = name;
                if (filterFn) {
                    const filterAPI = {
                        eq: (field, value) => builder.eq(field, value),
                        gt: (field, value) => builder.gt(field, value),
                        gte: (field, value) => builder.gte(field, value),
                        lt: (field, value) => builder.lt(field, value),
                        lte: (field, value) => builder.lte(field, value),
                    };
                    filterFn(filterAPI);
                }
                return builder;
            }),
            filter: jest.fn((filterFn) => {
                filters.push(filterFn);
                return builder;
            }),
            order: jest.fn((order) => {
                orderDirection = order;
                return builder;
            }),
            eq: jest.fn((field, value) => {
                filters.push((doc) => doc[field] === value);
                return builder;
            }),
            gt: jest.fn((field, value) => {
                filters.push((doc) => doc[field] > value);
                return builder;
            }),
            gte: jest.fn((field, value) => {
                filters.push((doc) => doc[field] >= value);
                return builder;
            }),
            lt: jest.fn((field, value) => {
                filters.push((doc) => doc[field] < value);
                return builder;
            }),
            lte: jest.fn((field, value) => {
                filters.push((doc) => doc[field] <= value);
                return builder;
            }),
            collect: jest.fn(async () => {
                const tableData = storage.get(table) || new Map();
                const docs = Array.from(tableData.values());
                return applyFilters(docs);
            }),
            first: jest.fn(async () => {
                const results = await builder.collect();
                return results[0] || null;
            }),
            unique: jest.fn(async () => {
                const results = await builder.collect();
                if (results.length > 1) {
                    throw new Error(`Expected unique result but found ${results.length}`);
                }
                return results[0] || null;
            }),
            take: jest.fn((n) => {
                limit = n;
                return builder;
            }),
            paginate: jest.fn(async (opts) => {
                const numItems = opts?.numItems || 10;
                const cursor = opts?.cursor || '0';
                const cursorIndex = parseInt(cursor, 10);
                const allResults = await builder.collect();
                const page = allResults.slice(cursorIndex, cursorIndex + numItems);
                const nextCursor = cursorIndex + page.length;
                return {
                    page,
                    continueCursor: nextCursor < allResults.length ? nextCursor.toString() : null,
                    isDone: nextCursor >= allResults.length,
                };
            }),
        };
        return builder;
    };
    // Create mock database
    const db = {
        query: jest.fn((table) => createQueryBuilder(table)),
        insert: jest.fn(async (table, doc) => {
            const id = generateId(table);
            const fullDoc = {
                ...doc,
                _id: id,
                _creationTime: Date.now(),
            };
            if (!storage.has(table)) {
                storage.set(table, new Map());
            }
            storage.get(table).set(id, fullDoc);
            return id;
        }),
        get: jest.fn(async (id) => {
            for (const [_, tableData] of storage) {
                if (tableData.has(id)) {
                    return tableData.get(id);
                }
            }
            return null;
        }),
        patch: jest.fn(async (id, updates) => {
            for (const [_, tableData] of storage) {
                if (tableData.has(id)) {
                    const doc = tableData.get(id);
                    tableData.set(id, { ...doc, ...updates });
                    return;
                }
            }
            throw new Error(`Document ${id} not found`);
        }),
        replace: jest.fn(async (id, doc) => {
            for (const [_, tableData] of storage) {
                if (tableData.has(id)) {
                    tableData.set(id, { ...doc, _id: id, _creationTime: Date.now() });
                    return;
                }
            }
            throw new Error(`Document ${id} not found`);
        }),
        delete: jest.fn(async (id) => {
            for (const [_, tableData] of storage) {
                if (tableData.has(id)) {
                    tableData.delete(id);
                    return;
                }
            }
            throw new Error(`Document ${id} not found`);
        }),
        normalize: jest.fn((id) => id),
        system: {
            query: jest.fn((table) => createQueryBuilder(table)),
            get: jest.fn(async (id) => null),
        },
    };
    // Create mock auth
    const auth = {
        getUserIdentity: jest.fn().mockResolvedValue(null),
    };
    // Create mock scheduler
    const scheduler = {
        runAfter: jest.fn().mockResolvedValue(undefined),
        runAt: jest.fn().mockResolvedValue(undefined),
        cancel: jest.fn().mockResolvedValue(undefined),
    };
    // Create run functions
    const runQuery = jest.fn(async (name, args) => {
        // Default implementations for common queries
        return undefined;
    });
    const runMutation = jest.fn(async (name, args) => {
        // Default implementations for common mutations
        return undefined;
    });
    const runAction = jest.fn(async (name, args) => {
        // Default implementations for common actions
        return undefined;
    });
    return {
        storage,
        idGenerator,
        auth,
        scheduler,
        db,
        runQuery,
        runMutation,
        runAction,
    };
}
//# sourceMappingURL=core.js.map