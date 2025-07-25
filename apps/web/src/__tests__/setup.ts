// Import jest-dom matchers
import '@testing-library/jest-dom';

// Export common test utilities
export { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';