import * as React from 'react';
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ClerkProvider } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from 'convex/react-clerk';

/**
 * Frontend Test Helpers
 * 
 * Standardized test utilities for frontend components following the established
 * Convex mock pattern. This ensures consistency across all frontend tests.
 */

// In-memory storage for mock data
const mockStorage: Record<string, any[]> = {};
const idCounter: Record<string, number> = {};

// Helper to generate IDs
const generateId = (table: string) => {
  if (!idCounter[table]) idCounter[table] = 1;
  return `${table}_${idCounter[table]++}`;
};

// Reset mock storage between tests
export const resetMockStorage = () => {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  Object.keys(idCounter).forEach(key => delete idCounter[key]);
};

// Mock Convex database operations
export const mockDb = {
  insert: jest.fn(async (table: string, doc: any) => {
    const id = generateId(table);
    const docWithId = { ...doc, _id: id, _creationTime: Date.now() };
    if (!mockStorage[table]) mockStorage[table] = [];
    mockStorage[table].push(docWithId);
    return id;
  }),
  
  query: jest.fn((table: string) => {
    const tableData = mockStorage[table] || [];
    const queryBuilder = {
      filter: jest.fn((filterFn: any) => queryBuilder),
      order: jest.fn((order: string) => queryBuilder),
      withIndex: jest.fn((indexName: string) => {
        queryBuilder._index = indexName;
        queryBuilder.unique = jest.fn(async () => {
          const results = await queryBuilder.collect();
          return results[0] || null;
        });
        return queryBuilder;
      }),
      eq: jest.fn((field: string, value: any) => {
        queryBuilder._filters.push({ field, value, op: 'eq' });
        return queryBuilder;
      }),
      collect: jest.fn(async () => {
        let results = [...tableData];
        for (const filter of queryBuilder._filters) {
          results = results.filter(doc => doc[filter.field] === filter.value);
        }
        return results;
      }),
      first: jest.fn(async () => {
        const results = await queryBuilder.collect();
        return results[0] || null;
      }),
      take: jest.fn((n: number) => queryBuilder),
      paginate: jest.fn(async (opts: any) => ({
        page: tableData.slice(0, opts?.numItems || 10),
        continueCursor: null,
        isDone: true,
      })),
      unique: jest.fn(async () => {
        const results = await queryBuilder.collect();
        return results[0] || null;
      }),
      _filters: [] as any[],
      _index: null as string | null,
    };
    return queryBuilder;
  }),
  
  get: jest.fn(async (id: string) => {
    for (const table in mockStorage) {
      const doc = mockStorage[table].find(d => d._id === id);
      if (doc) return doc;
    }
    return null;
  }),
  
  patch: jest.fn(async (id: string, patch: any) => {
    for (const table in mockStorage) {
      const docIndex = mockStorage[table].findIndex(d => d._id === id);
      if (docIndex !== -1) {
        mockStorage[table][docIndex] = {
          ...mockStorage[table][docIndex],
          ...patch,
          updatedAt: Date.now(),
        };
        return mockStorage[table][docIndex];
      }
    }
    return null;
  }),
  
  delete: jest.fn(async (id: string) => {
    for (const table in mockStorage) {
      const docIndex = mockStorage[table].findIndex(d => d._id === id);
      if (docIndex !== -1) {
        mockStorage[table].splice(docIndex, 1);
        return;
      }
    }
  }),
};

// Mock Convex client
export const mockConvexClient = {
  watchQuery: jest.fn(),
  mutation: jest.fn(),
  action: jest.fn(),
  query: jest.fn(),
  authenticate: jest.fn(),
  clearAuth: jest.fn(),
};

// Mock Clerk authentication
export const mockClerk = {
  loaded: true,
  session: {
    id: 'session_123',
    status: 'active',
    user: {
      id: 'user_123',
      primaryEmailAddress: {
        emailAddress: 'test@example.com',
      },
    },
  },
  user: {
    id: 'user_123',
    primaryEmailAddress: {
      emailAddress: 'test@example.com',
    },
    fullName: 'Test User',
    imageUrl: 'https://example.com/avatar.jpg',
  },
  organization: {
    id: 'org_123',
    name: 'Test Organization',
    slug: 'test-org',
  },
};

// Mock useAuth hook
export const mockUseAuth = {
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_123',
  sessionId: 'session_123',
  orgId: 'org_123',
  orgSlug: 'test-org',
  signOut: jest.fn(),
};

// Enhanced mock useQuery with storage integration
export const mockUseQuery = jest.fn((query, args) => {
  // Convert the query to string to check its content
  const queryStr = query?.toString() || '';
  const queryName = query?._functionName || query?.name || queryStr;
  
  // Handle specific queries with mock storage
  if (queryName.includes('getProducts')) {
    const products = mockStorage['products'] || [];
    return {
      page: products.filter(p => !args?.organizationId || p.organizationId === args.organizationId),
      continueCursor: null,
      isDone: true,
    };
  }
  
  if (queryName.includes('getCategories')) {
    return mockStorage['categories'] || [];
  }
  
  if (queryName.includes('getProjects') || queryName.includes('getOrganizationProjects')) {
    return mockStorage['projects'] || [];
  }
  
  if (queryName.includes('getRecentActivity')) {
    return [];
  }
  
  if (queryName.includes('getOrganizationBySlug')) {
    return mockStorage['organizations']?.find(o => o.slug === args?.slug) || {
      _id: 'org_123',
      name: 'Test Organization',
      slug: args?.slug || 'test-org',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  
  if (queryName.includes('getCurrentUser')) {
    return {
      _id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };
  }
  
  if (queryName.includes('getDashboardStats')) {
    const products = mockStorage['products'] || [];
    const categorized = products.filter(p => p.categories && p.categories.length > 0);
    
    return {
      productsCount: products.length,
      categorizedProducts: categorized.length,
      uncategorizedProducts: products.length - categorized.length,
      projectsCount: mockStorage['projects']?.length || 0,
      teamMembersCount: 3,
      categoryPaths: {},
      recentActivity: [],
      recentImports: [],
    };
  }
  
  return undefined;
});

// Enhanced mock useMutation with storage integration
export const mockUseMutation = jest.fn(() => 
  jest.fn(async (args) => {
    // Handle create operations
    if (args.handle || args.title) {
      // Creating a product
      const id = await mockDb.insert('products', {
        ...args,
        status: args.status || 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return mockStorage['products']?.find(d => d._id === id);
    }
    
    if (args.name && args.slug) {
      // Creating a project or organization
      const table = args.organizationId ? 'projects' : 'organizations';
      const id = await mockDb.insert(table, {
        ...args,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return mockStorage[table]?.find(d => d._id === id);
    }
    
    return undefined;
  })
);

export const mockUseAction = jest.fn(() => jest.fn().mockResolvedValue(undefined));

// Store references globally for mock access
(global as any).__mockUseQuery = mockUseQuery;
(global as any).__mockUseMutation = mockUseMutation;
(global as any).__mockUseAction = mockUseAction;

// Mock Convex hooks
jest.mock('convex/react', () => ({
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useQuery: (...args: any[]) => (global as any).__mockUseQuery(...args),
  useMutation: (...args: any[]) => (global as any).__mockUseMutation(...args),
  useAction: (...args: any[]) => (global as any).__mockUseAction(...args),
}));

// Mock Convex-Clerk integration
jest.mock('convex/react-clerk', () => ({
  ConvexProviderWithClerk: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock UI components that are commonly used
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <button data-testid="dropdown-trigger">{children}</button>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode, onClick?: () => void }) => 
    <div data-testid="dropdown-item" onClick={onClick}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => 
    <span className={`${className} ${variant === 'secondary' ? 'bg-secondary' : variant === 'outline' ? 'border' : 'bg-primary'}`}>
      {children}
    </span>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode, className?: string }) => 
    <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="card-footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant }: any) => 
    <button onClick={onClick} className={className} data-testid="button">{children}</button>,
}));

jest.mock('@/components/ui/sku-copy-button', () => ({
  SkuCopyButton: ({ sku }: { sku: string }) => 
    <button data-testid="sku-copy-button" aria-label={`Copy SKU ${sku}`}>{sku}</button>,
}));

// Mock lucide-react icons
const MockIcon = ({ children, ...props }: any) => <span {...props}>{children}</span>;
jest.mock('lucide-react', () => ({
  Package: MockIcon,
  MoreVertical: MockIcon,
  Edit: MockIcon,
  Eye: MockIcon,
  Archive: MockIcon,
  Tag: MockIcon,
  Store: MockIcon,
  Hash: MockIcon,
  // Add any other icons used in tests
  ShoppingCart: MockIcon,
  Layers: MockIcon,
  Upload: MockIcon,
  Brain: MockIcon,
  Plus: MockIcon,
  TrendingUp: MockIcon,
  Clock: MockIcon,
  Users: MockIcon,
  Activity: MockIcon,
  FileText: MockIcon,
  CheckCircle: MockIcon,
  AlertCircle: MockIcon,
}));

// Test data factories
export const createMockProduct = (overrides = {}) => ({
  _id: generateId('products'),
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
  _id: generateId('categories'),
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
  _id: generateId('projects'),
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
  _id: generateId('organizations'),
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

// Seed mock data helper
export const seedMockData = async (data: {
  products?: any[],
  categories?: any[],
  projects?: any[],
  organizations?: any[],
}) => {
  resetMockStorage();
  
  if (data.organizations) {
    for (const org of data.organizations) {
      await mockDb.insert('organizations', org);
    }
  }
  
  if (data.projects) {
    for (const project of data.projects) {
      await mockDb.insert('projects', project);
    }
  }
  
  if (data.categories) {
    for (const category of data.categories) {
      await mockDb.insert('categories', category);
    }
  }
  
  if (data.products) {
    for (const product of data.products) {
      await mockDb.insert('products', product);
    }
  }
};

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={mockConvexClient as any} useAuth={mockUseAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
};

export const renderWithProviders = (ui: ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export testing library utilities
export * from '@testing-library/react';
export { renderWithProviders as render };

// Test setup and cleanup utilities
export const setupTest = () => {
  resetMockStorage();
  jest.clearAllMocks();
};

export const cleanupTest = () => {
  resetMockStorage();
  jest.clearAllMocks();
};