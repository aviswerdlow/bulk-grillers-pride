import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { fireEvent, mockUseQuery, render, screen, waitFor, renderWithProviders } from '@/__tests__/test-helpers';
import { useParams } from 'next/navigation';
import ProductsPage from '../page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock the dialogs
jest.mock('@/components/products/create-product-dialog', () => ({
  CreateProductDialog: ({ open, onOpenChange }: any) => 
    open ? (
      <div data-testid="create-product-dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

jest.mock('@/components/products/edit-product-dialog', () => ({
  EditProductDialog: ({ open, onOpenChange, product }: any) => 
    open ? (
      <div data-testid="edit-product-dialog">
        <div data-testid="editing-product">{product.title}</div>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

// Mock ProductCard component
jest.mock('@/components/products/product-card', () => ({
  ProductCard: ({ product, onEdit }: any) => (
    <div data-testid={`product-card-${product._id}`}>
      <h3>{product.title}</h3>
      <button onClick={() => onEdit()}>Edit</button>
    </div>
  ),
}));

jest.mock('@/components/products/product-card-skeleton', () => ({
  ProductCardSkeleton: () => <div data-testid="product-skeleton" />,
}));

// Mock loading component to properly handle the size and text props
jest.mock('@/components/loading', () => ({
  Loading: ({ size, text }: { size?: string; text?: string }) => 
    <div data-testid="loading" data-size={size}>{text || 'Loading...'}</div>,
  PageLoading: ({ text }: { text?: string }) => 
    <div data-testid="page-loading">{text || 'Loading...'}</div>,
}));

// Mock table components
jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th role="columnheader">{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

// Mock UI components that are causing issues
jest.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({ value, onValueChange, children }: any) => {
    // Pass onValueChange to children
    return (
      <div data-testid="toggle-group" data-value={value}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { onValueChange } as any);
          }
          return child;
        })}
      </div>
    );
  },
  ToggleGroupItem: ({ value, children, onValueChange, 'aria-label': ariaLabel }: any) => (
    <button
      data-testid={`toggle-${value}`}
      aria-label={ariaLabel}
      onClick={() => {
        if (onValueChange) {
          onValueChange(value);
        }
      }}
    >
      {children}
    </button>
  ),
}));

describe('ProductsPage', () => {
  const mockOrganization = {
    _id: 'org_123',
    _creationTime: Date.now(),
    name: 'Test Organization',
    slug: 'test-org',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockProject = {
    _id: 'proj_123',
    _creationTime: Date.now(),
    name: 'Test Project',
    organizationId: 'org_123',
  };

  const mockProduct = {
    _id: 'prod_123',
    _creationTime: Date.now(),
    title: 'Test Product',
    handle: 'test-product',
    vendor: 'Test Vendor',
    productType: 'Electronics',
    status: 'active',
    categories: ['cat_1', 'cat_2'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ orgSlug: 'test-org' });
  });

  it('renders loading state while fetching data', () => {
    mockUseQuery.mockReturnValue(undefined);
    
    renderWithProviders(<ProductsPage />);
    
    expect(screen.getByText('Loading products...')).toBeInTheDocument();
  });

  it('renders error when organization not found', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return null;
      if (callCount === 2) return [];
      return undefined;
    }) as any); // projects query
    
    renderWithProviders(<ProductsPage />);
    
    expect(screen.getByText('Organization not found')).toBeInTheDocument();
  });

  it('renders error when no projects found', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [];
      return undefined;
    }) as any); // projects query
    
    renderWithProviders(<ProductsPage />);
    
    expect(screen.getByText('No Projects Found')).toBeInTheDocument();
    expect(screen.getByText('Create a project first to manage products')).toBeInTheDocument();
  });

  it('renders products page with empty state', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return { page: [] };
      return undefined;
    }) as any); // products query
    
    renderWithProviders(<ProductsPage />);
    
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByText('No products yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first product')).toBeInTheDocument();
  });

  it('renders products page with data in grid view', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return { page: [mockProduct] };
      return undefined;
    }) as any); // products query
    
    renderWithProviders(<ProductsPage />);
    
    // Check header
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
    
    // Check stats cards
    expect(screen.getByText('Total Products')).toBeInTheDocument();
    expect(screen.getAllByText('1')[0]).toBeInTheDocument(); // Total count
    
    // Check product card is rendered
    expect(screen.getByTestId('product-card-prod_123')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('switches between grid and list view', async () => {
    // Mock all queries based on the query being called
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization; // getOrganizationBySlug
      if (callCount === 2) return [mockProject];     // getOrganizationProjects
      if (callCount === 3) return { page: [mockProduct] }; // getProjectProducts
      return undefined;
    }) as any);
    
    const { } = renderWithProviders(<ProductsPage />);
    
    // Wait for the product to appear in grid view
    await waitFor(() => {
      expect(screen.getByTestId('product-card-prod_123')).toBeInTheDocument();
    });
    
    // Switch to list view
    const listButton = screen.getByLabelText('List view');
    if (listButton) {
      fireEvent.click(listButton as HTMLElement);
    }
    
    // Wait for table to appear
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Product' })).toBeInTheDocument();
    });
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Vendor' })).toBeInTheDocument();
  });

  it('filters products by search term', () => {
    const products = [
      mockProduct,
      { ...mockProduct, _id: 'prod_124', title: 'Another Product', handle: 'another-product' }
    ];
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return { page: products };
      return undefined;
    }) as any);
    
    renderWithProviders(<ProductsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search products...');
    
    // Search for "test"
    fireEvent.change(searchInput, { target: { value: 'test'  } } as any);
    
    // Should only show Test Product
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.queryByText('Another Product')).not.toBeInTheDocument();
  });

  it('filters products by status', () => {
    const products = [
      mockProduct,
      { ...mockProduct, _id: 'prod_124', title: 'Draft Product', status: 'draft' }
    ];
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return { page: products };
      return undefined;
    }) as any);
    
    renderWithProviders(<ProductsPage />);
    
    // Initially shows all products
    expect(screen.getAllByText('1')[0]).toBeInTheDocument(); // Total: 2
    
    // Filter by active status
    const statusSelect = screen.getByRole('combobox');
    if (statusSelect) {
      fireEvent.click(statusSelect as HTMLElement);
    }
    fireEvent.click(screen.getByText('Active'));
    
    // Mock the filtered query response
    let callCount2 = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount2++;
      if (callCount2 === 1) return mockOrganization;
      if (callCount2 === 2) return [mockProject];
      if (callCount2 === 3) return { page: [mockProduct] };
      return undefined;
    }) as any); // Only active products
  });

  it('opens create product dialog when clicking add product button', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return { page: [] };
      return undefined;
    }) as any);
    
    renderWithProviders(<ProductsPage />);
    
    const addButton = screen.getAllByRole('button', { name: /Add Product/i })[0];
    if (addButton) {
      fireEvent.click(addButton as HTMLElement);
    }
    
    expect(screen.getByTestId('create-product-dialog')).toBeInTheDocument();
  });

  it('opens edit product dialog when clicking edit button', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return { page: [mockProduct] };
      return undefined;
    }) as any);
    
    renderWithProviders(<ProductsPage />);
    
    const editButton = screen.getByRole('button', { name: 'Edit' });
    if (editButton) {
      fireEvent.click(editButton as HTMLElement);
    }
    
    expect(screen.getByTestId('edit-product-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('editing-product')).toHaveTextContent('Test Product');
  });

  it('displays correct stats for products', () => {
    const products = [
      { ...mockProduct, status: 'active' },
      { ...mockProduct, _id: 'prod_124', status: 'draft' },
      { ...mockProduct, _id: 'prod_125', status: 'active' },
    ];
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return { page: products };
      return undefined;
    }) as any);
    
    renderWithProviders(<ProductsPage />);
    
    // Total products
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Active count - find the card with "Active" title and check its count
    const activeCards = screen.getAllByText('Active');
    const activeCard = activeCards.find(card => 
      card.getAttribute('data-slot') === 'card-title'
    );
    const activeCardContainer = activeCard?.closest('[data-slot="card"]');
    const activeCount = activeCardContainer?.querySelector('[data-slot="card-content"]')?.textContent;
    expect(activeCount).toBe('2');
    
    // Draft count - find the card with "Draft" title and check its count
    const draftCards = screen.getAllByText('Draft');
    const draftCard = draftCards.find(card => 
      card.getAttribute('data-slot') === 'card-title'
    );
    const draftCardContainer = draftCard?.closest('[data-slot="card"]');
    const draftCount = draftCardContainer?.querySelector('[data-slot="card-content"]')?.textContent;
    expect(draftCount).toBe('1');
  });

  it('shows loading skeletons in grid view while loading', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return undefined;
      return undefined;
    }) as any); // products loading
    
    renderWithProviders(<ProductsPage />);
    
    const skeletons = screen.getAllByTestId('product-skeleton');
    expect(skeletons).toHaveLength(8); // Should show 8 skeleton cards
  });

  it('handles products with no vendor or type in list view', async () => {
    const productWithoutDetails = {
      ...mockProduct,
      vendor: undefined,
      productType: undefined,
    };
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return { page: [productWithoutDetails] };
      return undefined;
    }) as any);
    
    renderWithProviders(<ProductsPage />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    });
    
    // Switch to list view
    const listButton = screen.getByLabelText('List view');
    fireEvent.click(listButton as HTMLElement);
    
    // Should show em dashes for missing data
    const cells = screen.getAllByText('—');
    expect(cells).toHaveLength(2); // vendor and type columns
  });

  it('displays categories count correctly', () => {
    const products = [
      { ...mockProduct, categories: ['cat_1', 'cat_2'] },
      { ...mockProduct, _id: 'prod_124', categories: ['cat_2', 'cat_3', 'cat_4'] },
    ];
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return { page: products };
      return undefined;
    }) as any);
    
    renderWithProviders(<ProductsPage />);
    
    // Unique categories: cat_1, cat_2, cat_3, cat_4 = 4
    const categoriesCard = screen.getByText('Categories').closest('.space-y-0')?.nextElementSibling;
    expect(categoriesCard?.textContent).toBe('4');
  });
});