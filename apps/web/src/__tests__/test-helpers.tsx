import React from 'react';
import { render as rtlRender, RenderOptions, renderHook as rtlRenderHook, RenderHookOptions } from '@testing-library/react';
import { useQuery as convexUseQuery, useMutation as convexUseMutation, useAction as convexUseAction } from 'convex/react';
import { AccessibilityProvider } from '@/contexts/accessibility/AccessibilityContext';

// Export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Mock the Convex hooks - these are already mocked in jest config
export const mockUseQuery = convexUseQuery as jest.MockedFunction<typeof convexUseQuery>;
export const mockUseMutation = convexUseMutation as jest.MockedFunction<typeof convexUseMutation>;
export const mockUseAction = convexUseAction as jest.MockedFunction<typeof convexUseAction>;

// Set default mock implementations
mockUseQuery.mockImplementation((query: any) => {
  // Return appropriate defaults for accessibility preferences
  if (query?.toString().includes('getAccessibilityPreferences')) {
    return {
      preferences: {
        reducedMotion: false,
        highContrast: false,
        screenReaderActive: false,
        keyboardNavigation: false,
        preferredConfirmationMethod: 'standard_click',
        focusIndicatorStyle: 'default',
        announcementVerbosity: 'standard',
      }
    };
  }
  return undefined;
});
// Create a mock mutation that includes withOptimisticUpdate
export const createMockMutation = () => {
  const mockFn = jest.fn();
  mockFn.withOptimisticUpdate = jest.fn().mockReturnValue(mockFn);
  return mockFn;
};

// Set default implementation for mockUseMutation
mockUseMutation.mockImplementation(() => createMockMutation());
mockUseAction.mockReturnValue(jest.fn());

// Simple wrapper component that includes AccessibilityProvider
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
};

// Custom render method
export function render(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return rtlRender(ui, { wrapper: AllTheProviders, ...options });
}

// Alias for compatibility
export const renderWithProviders = render;

// Custom renderHook with providers
export function renderHookWithProviders<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'>
) {
  return rtlRenderHook(hook, { wrapper: AllTheProviders, ...options });
}

// Test utilities
export const setupTest = () => {
  jest.clearAllMocks();
};

export const cleanupTest = () => {
  jest.clearAllMocks();
};

export const resetAllMocks = () => {
  jest.clearAllMocks();
};

export const resetMockStorage = () => {
  jest.clearAllMocks();
};

// Mock data creators
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

export const seedMockData = async (data: any) => {
  return Promise.resolve(data);
};