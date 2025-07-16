// Convex-specific test setup
import { jest } from '@jest/globals';

// Mock Convex environment
process.env.CONVEX_URL = 'https://test.convex.cloud';
process.env.CLERK_ISSUER_URL = 'https://discrete-marten-19.clerk.accounts.dev';

// Mock fetch for external API calls (e.g., OpenAI)
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock console methods for cleaner test output
const originalLog = console.log;
const originalWarn = console.warn;

beforeAll(() => {
  // Suppress logs during tests unless explicitly needed
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.warn = originalWarn;
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock OpenAI responses for categorization tests
export const mockOpenAIResponse = (content: string) => {
  (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content,
          },
        },
      ],
    }),
  } as Response);
};

// Mock failed API responses
export const mockFailedAPIResponse = (status: number, error: string) => {
  (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
    ok: false,
    status,
    statusText: error,
    json: async () => ({ error }),
  } as Response);
};

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Export test utilities
export * from './convex-test-helpers';
export * from './test-runner';
