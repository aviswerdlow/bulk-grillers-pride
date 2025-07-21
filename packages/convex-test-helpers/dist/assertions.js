/**
 * Assertion helpers for Convex tests
 */
import { getTableData, findDocument } from './utilities';
/**
 * Asserts that a document exists in the database
 */
export async function assertDocumentExists(test, table, predicate, message) {
    const docs = getTableData(test, table);
    const exists = docs.some(predicate);
    if (!exists) {
        throw new Error(message || `No document in ${table} matches the predicate`);
    }
}
/**
 * Asserts that a document does not exist in the database
 */
export async function assertDocumentNotExists(test, table, predicate, message) {
    const docs = getTableData(test, table);
    const exists = docs.some(predicate);
    if (exists) {
        throw new Error(message || `Document in ${table} matches the predicate but should not exist`);
    }
}
/**
 * Asserts that a table has a specific number of documents
 */
export function assertTableCount(test, table, expectedCount, message) {
    const tableData = test.storage.get(table);
    const actualCount = tableData ? tableData.size : 0;
    if (actualCount !== expectedCount) {
        throw new Error(message ||
            `Expected ${table} to have ${expectedCount} documents but found ${actualCount}`);
    }
}
/**
 * Asserts that a document has specific field values
 */
export function assertDocumentFields(test, table, documentId, expectedFields, message) {
    const doc = findDocument(test, table, d => d._id === documentId);
    if (!doc) {
        throw new Error(`Document ${documentId} not found in ${table}`);
    }
    for (const [field, expectedValue] of Object.entries(expectedFields)) {
        if (doc[field] !== expectedValue) {
            throw new Error(message ||
                `Expected document ${documentId}.${field} to be ${JSON.stringify(expectedValue)} but got ${JSON.stringify(doc[field])}`);
        }
    }
}
/**
 * Asserts that a query was called with specific arguments
 */
export function assertQueryCalled(test, queryName, expectedArgs, message) {
    const calls = test.runQuery.mock.calls.filter(call => call[0] === queryName);
    if (calls.length === 0) {
        throw new Error(message || `Query ${queryName} was not called`);
    }
    if (expectedArgs !== undefined) {
        const matchingCall = calls.find(call => JSON.stringify(call[1]) === JSON.stringify(expectedArgs));
        if (!matchingCall) {
            throw new Error(message ||
                `Query ${queryName} was not called with expected args: ${JSON.stringify(expectedArgs)}`);
        }
    }
}
/**
 * Asserts that a mutation was called with specific arguments
 */
export function assertMutationCalled(test, mutationName, expectedArgs, message) {
    const calls = test.runMutation.mock.calls.filter(call => call[0] === mutationName);
    if (calls.length === 0) {
        throw new Error(message || `Mutation ${mutationName} was not called`);
    }
    if (expectedArgs !== undefined) {
        const matchingCall = calls.find(call => JSON.stringify(call[1]) === JSON.stringify(expectedArgs));
        if (!matchingCall) {
            throw new Error(message ||
                `Mutation ${mutationName} was not called with expected args: ${JSON.stringify(expectedArgs)}`);
        }
    }
}
/**
 * Asserts that a job was scheduled
 */
export function assertJobScheduled(test, jobName, expectedArgs, message) {
    const afterCalls = test.scheduler.runAfter.mock.calls.filter(call => call[1] === jobName);
    const atCalls = test.scheduler.runAt.mock.calls.filter(call => call[1] === jobName);
    const allCalls = [...afterCalls, ...atCalls];
    if (allCalls.length === 0) {
        throw new Error(message || `Job ${jobName} was not scheduled`);
    }
    if (expectedArgs !== undefined) {
        const matchingCall = allCalls.find(call => JSON.stringify(call[2]) === JSON.stringify(expectedArgs));
        if (!matchingCall) {
            throw new Error(message ||
                `Job ${jobName} was not scheduled with expected args: ${JSON.stringify(expectedArgs)}`);
        }
    }
}
/**
 * Asserts that the user is authenticated
 */
export async function assertAuthenticated(test, message) {
    const identity = await test.auth.getUserIdentity();
    if (!identity) {
        throw new Error(message || 'Expected user to be authenticated but was not');
    }
}
/**
 * Asserts that the user is not authenticated
 */
export async function assertNotAuthenticated(test, message) {
    const identity = await test.auth.getUserIdentity();
    if (identity) {
        throw new Error(message || 'Expected user to not be authenticated but was');
    }
}
/**
 * Asserts that a database operation was called a specific number of times
 */
export function assertDbOperationCallCount(test, operation, expectedCount, message) {
    const actualCount = test.db[operation].mock.calls.length;
    if (actualCount !== expectedCount) {
        throw new Error(message ||
            `Expected ${operation} to be called ${expectedCount} times but was called ${actualCount} times`);
    }
}
//# sourceMappingURL=assertions.js.map