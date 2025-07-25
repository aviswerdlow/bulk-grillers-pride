// Integration Test Setup
// This file runs before all integration tests

// Extend test timeout for integration tests
jest.setTimeout(30000);

// Setup global test utilities
global.testHelpers = {
  // Helper to wait for async operations
  waitFor: (fn, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(async () => {
        try {
          const result = await fn();
          if (result) {
            clearInterval(interval);
            resolve(result);
          } else if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            reject(new Error('Timeout waiting for condition'));
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            clearInterval(interval);
            reject(error);
          }
        }
      }, 100);
    });
  },

  // Helper to clean up test data
  cleanupTestData: async () => {
    // This would be implemented based on your database strategy
    // For now, it's a placeholder
    console.log('Cleaning up test data...');
  },

  // Helper to seed test data
  seedTestData: async (data) => {
    // This would be implemented based on your database strategy
    console.log('Seeding test data...', data);
    return data;
  },
};

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.INTEGRATION_TEST = 'true';

// Mock external services if needed
if (process.env.MOCK_EXTERNAL_SERVICES === 'true') {
  console.log('Mocking external services for integration tests');
  // Add mocks for external services here
}

// Global setup hook
beforeAll(async () => {
  console.log('🧪 Starting integration test suite...');
  // Add any global setup here
});

// Global teardown hook
afterAll(async () => {
  console.log('🧹 Cleaning up after integration tests...');
  await global.testHelpers.cleanupTestData();
});

// Clean up after each test
afterEach(async () => {
  // Add any per-test cleanup here
});