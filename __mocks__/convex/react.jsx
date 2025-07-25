// Mock for convex/react
// Enhanced mock with common query responses
export const useQuery = jest.fn((query, args) => {
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
      { _id: 'cat_1', name: 'Meat', path: 'meat', parentId: null, level: 0 },
      { _id: 'cat_2', name: 'Beef', path: 'meat/beef', parentId: 'cat_1', level: 1 },
      { _id: 'cat_3', name: 'Pork', path: 'meat/pork', parentId: 'cat_1', level: 1 },
    ];
  }
  
  // Default to undefined for unmocked queries
  return undefined;
});

export const useMutation = jest.fn(() => {
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

export const useAction = jest.fn(() => {
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

export const usePaginatedQuery = jest.fn(() => ({ 
  results: [], 
  status: 'LoadingFirstPage',
  loadMore: jest.fn()
}));

export const ConvexProvider = ({ children: _children }) => _children;
export const ConvexReactClient = jest.fn();

// Auth-related exports
export const useConvexAuth = jest.fn(() => ({
  isLoading: false,
  isAuthenticated: true,
}));

export const Authenticated = ({ children: _children }) => _children;
export const Unauthenticated = ({ children: _children }) => null;
export const AuthLoading = ({ children: _children }) => null;