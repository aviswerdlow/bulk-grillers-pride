import { z } from 'zod';
import type { FunctionReference } from 'convex/server';

/**
 * Base contract test configuration
 */
export interface ContractTestConfig<Args = any, Return = any> {
  /**
   * The Convex function reference being tested
   */
  functionRef: FunctionReference<'query' | 'mutation' | 'action', Args, Return>;
  
  /**
   * Display name for the test
   */
  name: string;
  
  /**
   * Description of what this function does
   */
  description?: string;
  
  /**
   * Zod schema for input validation
   */
  inputSchema: z.ZodSchema<Args>;
  
  /**
   * Zod schema for output validation
   */
  outputSchema: z.ZodSchema<Return>;
  
  /**
   * Example valid inputs for testing
   */
  validInputs: Args[];
  
  /**
   * Example invalid inputs that should be rejected
   */
  invalidInputs?: any[];
  
  /**
   * Expected error patterns for invalid inputs
   */
  expectedErrors?: Record<string, RegExp>;
  
  /**
   * Authentication requirements
   */
  auth?: {
    required: boolean;
    roles?: string[];
    permissions?: string[];
  };
}

/**
 * Contract test result
 */
export interface ContractTestResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a contract against its schema
 */
export function validateContract<Args, Return>(
  config: ContractTestConfig<Args, Return>
): ContractTestResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate valid inputs
  for (const input of config.validInputs) {
    try {
      config.inputSchema.parse(input);
    } catch (error) {
      errors.push(`Valid input failed validation: ${JSON.stringify(input)} - ${error}`);
    }
  }
  
  // Validate invalid inputs
  if (config.invalidInputs) {
    for (const input of config.invalidInputs) {
      try {
        config.inputSchema.parse(input);
        errors.push(`Invalid input passed validation: ${JSON.stringify(input)}`);
      } catch {
        // Expected to fail
      }
    }
  }
  
  // Check for documentation
  if (!config.description) {
    warnings.push('Missing function description');
  }
  
  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create a mock Convex context for testing
 */
export function createMockContext(overrides?: any) {
  return {
    auth: {
      getUserIdentity: jest.fn().mockResolvedValue({
        subject: 'test_user_123',
        tokenIdentifier: 'test_token',
        issuer: 'https://test.clerk.dev',
      }),
    },
    db: {
      query: jest.fn(),
      insert: jest.fn(),
      patch: jest.fn(),
      replace: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
    },
    scheduler: {
      runAfter: jest.fn(),
      runAt: jest.fn(),
    },
    storage: {
      generateUploadUrl: jest.fn(),
      getUrl: jest.fn(),
      delete: jest.fn(),
    },
    ...overrides,
  };
}

/**
 * Assert that a function throws with expected error
 */
export async function expectError(
  fn: () => Promise<any>,
  expectedError: string | RegExp
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error: any) {
    if (typeof expectedError === 'string') {
      expect(error.message).toContain(expectedError);
    } else {
      expect(error.message).toMatch(expectedError);
    }
  }
}

/**
 * Test helper to verify response shape matches schema
 */
export function expectResponseShape<T>(
  response: any,
  schema: z.ZodSchema<T>
): void {
  const result = schema.safeParse(response);
  if (!result.success) {
    throw new Error(`Response validation failed: ${JSON.stringify(result.error.errors)}`);
  }
}

/**
 * Common Zod schemas for reuse
 */
export const commonSchemas = {
  // ID schemas
  convexId: <T extends string>() => z.string() as z.ZodSchema<any>,
  
  // Timestamp schemas
  timestamp: z.number().positive(),
  
  // Status schemas
  status: z.enum(['active', 'draft', 'archived']),
  
  // Pagination schemas
  paginationInput: z.object({
    limit: z.number().min(1).max(100).optional(),
    cursor: z.string().optional(),
  }),
  
  paginationOutput: <T extends z.ZodSchema>(itemSchema: T) => z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().optional(),
    hasMore: z.boolean(),
  }),
  
  // Error schemas
  errorResponse: z.object({
    error: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }),
  
  // Success response schemas
  successResponse: z.object({
    success: z.boolean(),
    message: z.string().optional(),
    data: z.any().optional(),
  }),
};

/**
 * Generate test cases for pagination
 */
export function generatePaginationTests(baseInput: any) {
  return [
    { ...baseInput, limit: 1 },
    { ...baseInput, limit: 10 },
    { ...baseInput, limit: 50 },
    { ...baseInput, cursor: 'test_cursor' },
    { ...baseInput, limit: 10, cursor: 'test_cursor' },
  ];
}

/**
 * Generate test cases for filtering
 */
export function generateFilterTests(baseInput: any, filterField: string, values: any[]) {
  return values.map(value => ({
    ...baseInput,
    [filterField]: value,
  }));
}