/**
 * Utility functions for test setup and data management
 */
/**
 * Sets up authentication for a test context
 */
export function setupAuth(test, user) {
    test.auth.getUserIdentity.mockResolvedValue(user ? {
        tokenIdentifier: user.tokenIdentifier,
        subject: user.subject || user.tokenIdentifier,
        email: user.email || 'test@example.com',
        emailVerified: user.emailVerified ?? true,
        issuer: user.issuer || 'test',
    } : null);
}
/**
 * Seeds the test database with initial data
 */
export async function seedDatabase(test, data) {
    for (const [table, documents] of Object.entries(data)) {
        for (const doc of documents) {
            if (doc._id) {
                // If document has an ID, use it directly
                if (!test.storage.has(table)) {
                    test.storage.set(table, new Map());
                }
                test.storage.get(table).set(doc._id, {
                    ...doc,
                    _creationTime: doc._creationTime || Date.now(),
                });
            }
            else {
                // Otherwise, use the insert method to generate an ID
                await test.db.insert(table, doc);
            }
        }
    }
}
/**
 * Clears all data from the test database
 */
export function clearDatabase(test) {
    test.storage.clear();
    test.idGenerator.clear();
}
/**
 * Gets all documents from a table
 */
export function getTableData(test, table) {
    const tableData = test.storage.get(table);
    return tableData ? Array.from(tableData.values()) : [];
}
/**
 * Gets a document by ID
 */
export async function getDocument(test, id) {
    return test.db.get(id);
}
/**
 * Counts documents in a table
 */
export function countDocuments(test, table) {
    const tableData = test.storage.get(table);
    return tableData ? tableData.size : 0;
}
/**
 * Finds documents matching a predicate
 */
export function findDocuments(test, table, predicate) {
    const docs = getTableData(test, table);
    return docs.filter(predicate);
}
/**
 * Finds a single document matching a predicate
 */
export function findDocument(test, table, predicate) {
    const docs = getTableData(test, table);
    return docs.find(predicate);
}
/**
 * Waits for a condition to be true (useful for async operations)
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
/**
 * Creates a spy for a specific database operation
 */
export function spyOnDbOperation(test, operation) {
    return test.db[operation];
}
/**
 * Resets all mock functions to their initial state
 */
export function resetMocks(test) {
    test.db.query.mockClear();
    test.db.insert.mockClear();
    test.db.get.mockClear();
    test.db.patch.mockClear();
    test.db.replace.mockClear();
    test.db.delete.mockClear();
    test.db.normalize.mockClear();
    test.db.system.query.mockClear();
    test.db.system.get.mockClear();
    test.auth.getUserIdentity.mockClear();
    test.scheduler.runAfter.mockClear();
    test.scheduler.runAt.mockClear();
    test.scheduler.cancel.mockClear();
    test.runQuery.mockClear();
    test.runMutation.mockClear();
    test.runAction.mockClear();
}
//# sourceMappingURL=utilities.js.map