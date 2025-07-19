// Mock for convex/react
// Enhanced mock with common query responses
const useQuery = jest.fn((query, args) => {
  // Mock common queries with sensible defaults
  const queryName = query?._functionName || query?.name || '';
  
  if (queryName.includes('getOrganizationBySlug')) {
    return {
      _id: 'org_1',
      name: 'Test Organization',
      slug: args?.slug || 'test-org',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  
  if (queryName.includes('getCurrentUser')) {
    return {
      _id: 'user_1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };
  }
  
  if (queryName.includes('getDashboardStats')) {
    return {
      totalProjects: 5,
      totalProducts: 100,
      totalCategories: 20,
      teamMembers: 3,
    };
  }
  
  if (queryName.includes('getProducts')) {
    return {
      page: [],
      continueCursor: null,
      isDone: true,
    };
  }
  
  if (queryName.includes('getCategories') || queryName.includes('getAllCategories')) {
    return [
      { _id: 'cat_1', name: 'Meat', parentId: null, level: 0 },
      { _id: 'cat_2', name: 'Beef', parentId: 'cat_1', level: 1 },
      { _id: 'cat_3', name: 'Pork', parentId: 'cat_1', level: 1 },
    ];
  }
  
  // Default to undefined for unmocked queries
  return undefined;
});

const useMutation = jest.fn(() => {
  const mutationFn = jest.fn((args) => {
    // Ensure args have the toString method if they're IDs
    if (args && typeof args === 'object') {
      Object.keys(args).forEach(key => {
        if (typeof args[key] === 'string' && key.endsWith('Id')) {
          args[key] = {
            toString: () => args[key],
            valueOf: () => args[key]
          };
        }
      });
    }
    return Promise.resolve();
  });
  return mutationFn;
});

const useAction = jest.fn(() => {
  const actionFn = jest.fn((args) => {
    // Ensure args have the toString method if they're IDs
    if (args && typeof args === 'object') {
      Object.keys(args).forEach(key => {
        if (typeof args[key] === 'string' && key.endsWith('Id')) {
          args[key] = {
            toString: () => args[key],
            valueOf: () => args[key]
          };
        }
      });
    }
    return Promise.resolve();
  });
  return actionFn;
});
const usePaginatedQuery = jest.fn(() => ({ 
  results: [], 
  status: 'LoadingFirstPage',
  loadMore: jest.fn()
}));

const ConvexProvider = ({ children }) => children;
const ConvexReactClient = jest.fn();

// Auth-related exports
const useConvexAuth = jest.fn(() => ({
  isLoading: false,
  isAuthenticated: true,
}));

const Authenticated = ({ children }) => children;
const Unauthenticated = ({ children }) => null;
const AuthLoading = ({ children }) => null;

module.exports = {
  useQuery,
  useMutation,
  useAction,
  usePaginatedQuery,
  ConvexProvider,
  ConvexReactClient,
  useConvexAuth,
  Authenticated,
  Unauthenticated,
  AuthLoading,
};