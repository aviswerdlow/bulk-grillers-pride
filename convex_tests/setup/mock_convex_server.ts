// Mock implementations for Convex server functions
import { v } from 'convex/values';

// Mock validator - simulates Convex's validation behavior
export const mockValidator = {
  v,

  // Validate args against a schema
  validateArgs: (args: any, schema: any) => {
    // This is a simplified validation - in real tests you might want more thorough validation
    const schemaKeys = Object.keys(schema);
    const argsKeys = Object.keys(args);

    // Check required fields
    for (const key of schemaKeys) {
      if (!schema[key]?.isOptional && !argsKeys.includes(key)) {
        throw new Error(`Missing required argument: ${key}`);
      }
    }

    return true;
  },
};

// Mock action runner for testing actions
export const mockActionRunner = {
  runQuery: jest.fn(),
  runMutation: jest.fn(),
  runAction: jest.fn(),
};

// Mock internal functions
export const mockInternal = {
  // Mock for internal queries/mutations
  internalQuery: jest.fn((name: string, args: any) => {
    return Promise.resolve(null);
  }),

  internalMutation: jest.fn((name: string, args: any) => {
    return Promise.resolve(null);
  }),

  internalAction: jest.fn((name: string, args: any) => {
    return Promise.resolve(null);
  }),
};

// Create a mock handler wrapper that simulates Convex behavior
export function createMockHandler<T extends (...args: any[]) => any>(
  handler: T,
  options?: {
    args?: any;
    returns?: any;
  }
) {
  return jest.fn(async (ctx: any, args: any) => {
    // Validate args if schema provided
    if (options?.args) {
      mockValidator.validateArgs(args, options.args);
    }

    // Call the actual handler
    const result = await handler(ctx, args);

    // Validate return value if schema provided
    if (options?.returns) {
      // Add return validation if needed
    }

    return result;
  });
}

// Extract handler from Convex mutation/query/action
export function extractHandler(convexFunction: any) {
  if (typeof convexFunction === 'function') {
    return convexFunction;
  }
  if (convexFunction && typeof convexFunction._handler === 'function') {
    return convexFunction._handler;
  }
  if (convexFunction && typeof convexFunction.handler === 'function') {
    return convexFunction.handler;
  }
  throw new Error('Unable to extract handler from Convex function');
}

// Mock scheduler for testing scheduled functions
export class MockScheduler {
  private scheduled: Array<{ delay: number; functionName: string; args: any }> = [];

  runAfter(delay: number, functionName: string, args: any) {
    const id = Math.random().toString(36);
    this.scheduled.push({ delay, functionName, args });
    return id;
  }

  runAt(timestamp: number, functionName: string, args: any) {
    const delay = timestamp - Date.now();
    return this.runAfter(delay, functionName, args);
  }

  getScheduled() {
    return this.scheduled;
  }

  clear() {
    this.scheduled = [];
  }
}

// Mock storage for file handling
export class MockStorage {
  private files: Map<string, Blob> = new Map();

  async store(blob: Blob): Promise<string> {
    const id = Math.random().toString(36);
    this.files.set(id, blob);
    return id;
  }

  async get(id: string): Promise<Blob | null> {
    return this.files.get(id) || null;
  }

  async delete(id: string): Promise<void> {
    this.files.delete(id);
  }

  async getUrl(id: string): Promise<string> {
    if (!this.files.has(id)) {
      throw new Error(`File ${id} not found`);
    }
    return `https://test.convex.cloud/storage/${id}`;
  }

  clear() {
    this.files.clear();
  }
}

// Helper to create a complete mock context with all features
export function createFullMockContext(options?: {
  identity?: any;
  db?: any;
  scheduler?: MockScheduler;
  storage?: MockStorage;
}) {
  return {
    db: options?.db || new MockDatabase(),
    auth: {
      getUserIdentity: async () => options?.identity || null,
    },
    scheduler: options?.scheduler || new MockScheduler(),
    storage: options?.storage || new MockStorage(),
    runQuery: mockActionRunner.runQuery,
    runMutation: mockActionRunner.runMutation,
    runAction: mockActionRunner.runAction,
  };
}

// Import MockDatabase from test helpers
import { MockDatabase } from './convex_test_helpers';
