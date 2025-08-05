// Use mock in test environment to avoid import.meta issues
const { convexTest, resetMockState: resetState } = process.env.NODE_ENV === 'test' 
  ? require('../__mocks__/convex-test')
  : require('convex-test');

import schema from './schema';

export const t = convexTest(schema);
export const resetMockState = resetState || (() => {});
