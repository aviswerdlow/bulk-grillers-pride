import { convexTest } from 'convex-test';
import type { DataModel } from '../_generated/dataModel';
import type { Id } from '../_generated/dataModel';

export type ConvexTestContext = ReturnType<typeof convexTest>;

// Export the convexTest function for creating test contexts
export function createConvexTest(schema?: any) {
  return convexTest(schema);
}

// Create a mutation context helper
export function createMutationContext(test: ConvexTestContext) {
  return {
    db: test.db,
    auth: test.auth,
    storage: test.storage,
    scheduler: test.scheduler,
  };
}

// Setup auth helper
export async function setupAuth(test: ConvexTestContext, userId: string, identity?: any) {
  const defaultIdentity = {
    tokenIdentifier: userId,
    subject: userId,
    name: 'Test User',
    email: 'test@example.com',
    pictureUrl: 'https://example.com/picture.jpg',
    emailVerified: true,
    ...identity,
  };
  
  test.auth.getUserIdentity.mockResolvedValue(defaultIdentity);
  
  return defaultIdentity;
}

// Seed database helper - supports both single table and multiple tables
export async function seedDatabase(
  test: ConvexTestContext, 
  tableOrData: string | Record<string, any[]>, 
  documents?: any[]
): Promise<any | any[]> {
  // Handle multiple tables at once
  if (typeof tableOrData === 'object' && !Array.isArray(tableOrData)) {
    const results: Record<string, any[]> = {};
    
    for (const [table, docs] of Object.entries(tableOrData)) {
      const insertedDocs = [];
      for (const doc of docs) {
        const id = await test.db.insert(table, doc);
        insertedDocs.push({ ...doc, _id: id });
      }
      results[table] = insertedDocs;
    }
    
    return results;
  }
  
  // Handle single table
  if (typeof tableOrData === 'string' && documents) {
    const insertedDocs = [];
    
    for (const doc of documents) {
      const id = await test.db.insert(tableOrData, doc);
      insertedDocs.push({ ...doc, _id: id });
    }
    
    return insertedDocs;
  }
  
  throw new Error('Invalid arguments to seedDatabase');
}

// Assert document exists helper
export async function assertDocumentExists(
  test: ConvexTestContext,
  table: string,
  predicate: (doc: any) => boolean
): Promise<any> {
  const docs = await test.db.query(table).collect();
  const doc = docs.find(predicate);
  
  if (!doc) {
    throw new Error(`Document not found in ${table} table`);
  }
  
  return doc;
}

// Assert document not exists helper
export async function assertDocumentNotExists(
  test: ConvexTestContext,
  table: string,
  predicate: (doc: any) => boolean
): Promise<void> {
  const docs = await test.db.query(table).collect();
  const doc = docs.find(predicate);
  
  if (doc) {
    throw new Error(`Document unexpectedly found in ${table} table`);
  }
}

// Get table data helper
export async function getTableData(test: ConvexTestContext, table: string): Promise<any[]> {
  return await test.db.query(table).collect();
}

// Export mock factories from convex-test
export { 
  createMockUser,
  createMockOrganization,
  createMockOrganizationMembership,
  createMockProject,
  createMockCategory,
} from 'convex-test';

// Helper to reset mock state
export function resetMockState() {
  // This would typically be implemented in the mock
  // For now, it's a no-op placeholder
}