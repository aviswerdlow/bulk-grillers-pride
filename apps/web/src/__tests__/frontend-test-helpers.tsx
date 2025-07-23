import React from 'react';
// Re-export from central mock
export * from '@testing-library/react';
export { render, waitFor } from '@testing-library/react';

// Import mocks from central location
import { useQuery, useMutation, useAction } from 'convex/react';

export const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
export const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
export const mockUseAction = useAction as jest.MockedFunction<typeof useAction>;

// Simple test utilities
export const resetAllMocks = () => {
  jest.clearAllMocks();
};

export const setupTest = () => {
  jest.clearAllMocks();
};

export const cleanupTest = () => {
  jest.clearAllMocks();
};

export const resetMockStorage = () => {
  jest.clearAllMocks();
};

// Re-export render as renderWithProviders for compatibility

// Mock data creation helpers
export const createMockUser = (overrides = {}) => ({
  _id: 'user_123',
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  firstName: 'Test',
  lastName: 'User',
  clerkId: 'user_123',
  status: 'active',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

export const createMockProduct = (overrides = {}) => ({
  _id: 'prod_123',
  _creationTime: Date.now(),
  handle: 'test-product',
  title: 'Test Product',
  description: 'A test product description',
  vendor: 'Test Vendor',
  productType: 'Electronics',
  status: 'active',
  categories: [],
  image: 'https://example.com/product.jpg',
  tags: [],
  organizationId: 'org_123',
  projectId: 'proj_123',
  createdBy: 'user_123',
  updatedAt: Date.now(),
  ...overrides,
});

export const createMockCategory = (overrides = {}) => ({
  _id: 'cat_123',
  _creationTime: Date.now(),
  name: 'Test Category',
  slug: 'test-category',
  path: 'test-category',
  level: 0,
  parentId: null,
  organizationId: 'org_123',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

export const createMockProject = (overrides = {}) => ({
  _id: 'proj_123',
  _creationTime: Date.now(),
  name: 'Test Project',
  slug: 'test-project',
  organizationId: 'org_123',
  status: 'active',
  settings: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

export const createMockOrganization = (overrides = {}) => ({
  _id: 'org_123',
  _creationTime: Date.now(),
  name: 'Test Organization',
  slug: 'test-org',
  clerkOrganizationId: 'org_123',
  status: 'active',
  settings: {
    defaultProductStatus: 'active',
    requireProductApproval: false,
    enableAiCategorization: true,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

export const seedMockData = async (data) => {
  // Simple mock implementation
  return Promise.resolve(data);
};

export { render as renderWithProviders };
