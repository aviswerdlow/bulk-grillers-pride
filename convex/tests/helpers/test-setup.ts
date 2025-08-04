import { createQueryCtx, createMutationCtx, createActionCtx, resetAllMocks } from './convexTestCtx';

// Export mock reset function
export const resetMockState = resetAllMocks;

// Export test context creators
export const createTestContext = () => ({
  query: createQueryCtx(),
  mutation: createMutationCtx(),
  action: createActionCtx(),
});

// Re-export for convenience
export { createQueryCtx, createMutationCtx, createActionCtx, mockDb, mockAuth, mockStorage, mockScheduler } from './convexTestCtx';