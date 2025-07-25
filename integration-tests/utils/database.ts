/**
 * Database utilities for integration tests
 */

// Mock database state for now
let mockDatabase: Record<string, any[]> = {};

export async function setupTestDatabase() {
  console.log('🔧 Setting up test database...');
  
  // Reset mock database
  mockDatabase = {
    organizations: [],
    users: [],
    products: [],
    categories: [],
    categoryProductAssignments: [],
  };
  
  // In a real implementation, this would:
  // 1. Connect to a test database
  // 2. Run migrations
  // 3. Clear existing data
  // 4. Set up test schema
  
  return mockDatabase;
}

export async function cleanupTestDatabase() {
  console.log('🧹 Cleaning up test database...');
  
  // Clear all data
  Object.keys(mockDatabase).forEach(table => {
    mockDatabase[table] = [];
  });
  
  // In a real implementation, this would:
  // 1. Drop all test data
  // 2. Close database connections
  // 3. Clean up any temporary files
}

export async function seedTestData(table: string, data: any[]) {
  console.log(`🌱 Seeding ${data.length} records into ${table}...`);
  
  if (!mockDatabase[table]) {
    mockDatabase[table] = [];
  }
  
  mockDatabase[table].push(...data);
  
  return data;
}

export async function queryTestData(table: string, filter?: (item: any) => boolean) {
  const data = mockDatabase[table] || [];
  
  if (filter) {
    return data.filter(filter);
  }
  
  return data;
}

export async function truncateTable(table: string) {
  console.log(`🗑️  Truncating table: ${table}`);
  mockDatabase[table] = [];
}

// Transaction helper for integration tests
export async function withTransaction<T>(
  operation: () => Promise<T>
): Promise<T> {
  // Save current state
  const backup = JSON.parse(JSON.stringify(mockDatabase));
  
  try {
    const result = await operation();
    // Commit (do nothing, changes are already applied)
    return result;
  } catch (error) {
    // Rollback
    mockDatabase = backup;
    throw error;
  }
}

// Helper to wait for eventual consistency
export async function waitForConsistency(
  checkFn: () => Promise<boolean>,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const isConsistent = await checkFn();
    if (isConsistent) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error('Timeout waiting for consistency');
}