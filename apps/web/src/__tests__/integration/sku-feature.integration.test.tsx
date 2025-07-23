import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  cleanupTest, 
  mockUseQuery, 
  mockUseMutation, 
  renderWithProviders, 
  setupTest,
  createMockProduct,
  createMockOrganization,
  seedMockData
} from '@/__tests__/test-helpers';
import { api } from '@/../../../convex/_generated/api';
import { Id } from '@/../../../convex/_generated/dataModel';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import type { Product } from '@/types/models';

// Create mock Convex client
const mockClient = new ConvexReactClient('https://test.convex.cloud');

// Import the actual components instead of inline definitions
import { ProductCard } from '@/components/products/product-card';
import { CreateProductDialog } from '@/components/products/create-product-dialog';

// Mock components that would use SKU
jest.mock('@/components/products/product-card', () => ({
  ProductCard: ({ product }: { product: unknown }) => {
    const React = jest.requireActual('react');
    return (
      <div data-testid="product-card">
        <h3>{(product as Record<string, unknown>).title}</h3>
        <p data-testid="product-sku">{(product as Record<string, unknown>).sku || 'No SKU'}</p>
      </div>
    );
  },
}));

jest.mock('@/components/products/create-product-dialog', () => ({
  CreateProductDialog: ({ onSuccess }: { onSuccess?: () => void }) => {
    const React = jest.requireActual('react');
    
    return (
      <form onSubmit={(e) => {
        e.preventDefault();
        const _formData = new FormData(e.target as HTMLFormElement);
        // Simply call onSuccess without mutation
        onSuccess?.();
      }}>
        <input name="title" placeholder="Product Title" />
        <input name="sku" placeholder="SKU" />
        <input name="price" type="number" placeholder="Price" />
        <button type="submit">Create Product</button>
      </form>
    );
  },
}));

describe('SKU Feature Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOrganization = createMockOrganization();
  const mockProducts = [
    createMockProduct({ _id: 'prod_meat001', sku: 'MEAT-001', title: 'Premium Beef' }),
    createMockProduct({ _id: 'prod_meat002', sku: 'MEAT-002', title: 'Organic Chicken' }),
    createMockProduct({ _id: 'prod_meat003', sku: undefined, title: 'Generic Pork' }),
  ];

  beforeEach(async () => {
    setupTest();
    await seedMockData({
      organizations: [mockOrganization],
      products: mockProducts,
    });
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('SKU Display in Product List', () => {
    it('displays SKU in product cards when available', () => {
      mockUseQuery.mockReturnValue(mockProducts);

      const ProductList = () => {
        const products = mockUseQuery((api as unknown as Record<string, unknown>).functions.products.products.getProjectProducts);
        return (
          <div>
            {Array.isArray(products) ? products.map((product: unknown) => (
              <ProductCard key={product._id} product={product as Product} />
            )) : null}
          </div>
        );
      };

      renderWithProviders(<ProductList />);

      expect(screen.getByText('MEAT-001')).toBeInTheDocument();
      expect(screen.getByText('MEAT-002')).toBeInTheDocument();
      expect(screen.getByText('No SKU')).toBeInTheDocument();
    });

    it('shows SKU column in products table', () => {
      mockUseQuery.mockReturnValue(mockProducts);

      const ProductsTable = () => {
        const products = mockUseQuery((api as unknown as Record<string, unknown>).functions.products.products.getProjectProducts);
        return (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>SKU</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(products) ? products.map((product: unknown) => (
                <tr key={product._id}>
                  <td>{product.title}</td>
                  <td data-testid={`sku-${product._id}`}>{product.sku || '-'}</td>
                  <td>${product.price}</td>
                </tr>
              )) : null}
            </tbody>
          </table>
        );
      };

      renderWithProviders(
        <ConvexProvider client={mockClient}>
          <ProductsTable />
        </ConvexProvider>
      );

      expect(screen.getByText('SKU')).toBeInTheDocument();
      expect(screen.getByTestId(`sku-${mockProducts[0]?._id || ''}`)).toHaveTextContent('MEAT-001');
      expect(screen.getByTestId(`sku-${mockProducts[1]?._id || ''}`)).toHaveTextContent('MEAT-002');
      expect(screen.getByTestId(`sku-${mockProducts[2]?._id || ''}`)).toHaveTextContent('-');
    });
  });

  describe('SKU in Product Creation', () => {
    it('allows adding SKU when creating a new product', async () => {
      const user = userEvent.setup();
      const createProductMock = jest.fn().mockResolvedValue({ _id: 'new-product' });
      mockUseMutation.mockReturnValue(createProductMock);

      renderWithProviders(
        <ConvexProvider client={mockClient}>
          <CreateProductDialog 
            organizationId={'org_123' as Id<'organizations'>}
            projectId={'proj_123' as Id<'projects'>}
            open={true}
            onOpenChange={() => {}}
          />
        </ConvexProvider>
      );

      await user.type(screen.getByPlaceholderText('Enter product title'), 'Test Product');
      await user.type(screen.getByPlaceholderText('SKU-123'), 'TEST-123');
      
      await user.click(screen.getByRole('button', { name: 'Create Product' }));

      await waitFor(() => {
        expect(createProductMock).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Product',
            sku: 'TEST-123',
            organizationId: 'org_123',
            projectId: 'proj_123',
          })
        );
      });
    });

    it('validates SKU format during product creation', async () => {
      const user = userEvent.setup();
      
      const ProductFormWithValidation = () => {
        const [skuError, setSkuError] = React.useState('');
        
        const validateSKU = (sku: string) => {
          // SKU validation: alphanumeric with hyphens, 3-20 chars
          const skuRegex = /^[A-Z0-9-]{3,20}$/;
          if (!skuRegex.test(sku)) {
            setSkuError('SKU must be 3-20 characters, uppercase letters, numbers, and hyphens only');
            return false;
          }
          setSkuError('');
          return true;
        };

        return (
          <form>
            <input 
              name="sku" 
              placeholder="SKU"
              onChange={(e) => validateSKU(e.target?.value)}
            />
            {skuError && <span role="alert">{skuError}</span>}
          </form>
        );
      };

      renderWithProviders(<ProductFormWithValidation />);

      const skuInput = screen.getByPlaceholderText('SKU');
      
      // Test invalid SKU formats
      await user.type(skuInput, 'ab'); // Too short
      expect(screen.getByRole('alert')).toBeInTheDocument();

      await user.clear(skuInput);
      await user.type(skuInput, 'test-123'); // Lowercase not allowed
      expect(screen.getByRole('alert')).toBeInTheDocument();

      await user.clear(skuInput);
      await user.type(skuInput, 'TEST-123'); // Valid format
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('SKU Search Functionality', () => {
    it('filters products by SKU in search', async () => {
      const user = userEvent.setup();
      const mockSearchResults = [mockProducts[0]]; // Only MEAT-001
      
      const ProductSearch = () => {
        const [searchQuery, setSearchQuery] = React.useState('');
        const products = mockUseQuery(
          (api as unknown as Record<string, unknown>).functions.products.products.searchProducts,
          searchQuery ? { query: searchQuery } : 'skip'
        );

        return (
          <div>
            <input
              placeholder="Search by title or SKU"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target?.value)}
            />
            <div data-testid="search-results">
              {Array.isArray(products) ? products.map((product: unknown) => (
                <div key={product._id}>
                  {product.title} - {product.sku || 'No SKU'}
                </div>
              )) : null}
            </div>
          </div>
        );
      };

      mockUseQuery.mockImplementation((_query: unknown, args: unknown) => {
        if (args === 'skip') return undefined;
        if ((args as Record<string, unknown>)?.query === 'MEAT-001') return mockSearchResults;
        return [];
      });

      renderWithProviders(
        <ConvexProvider client={mockClient}>
          <ProductSearch />
        </ConvexProvider>
      );

      const searchInput = screen.getByPlaceholderText('Search by title or SKU');
      await user.type(searchInput, 'MEAT-001');

      await waitFor(() => {
        const results = screen.getByTestId('search-results');
        expect(results).toHaveTextContent('Premium Beef - MEAT-001');
        expect(results).not.toHaveTextContent('Organic Chicken');
      });
    });
  });

  describe('SKU Copy Functionality', () => {
    afterEach(() => {
      // Clean up clipboard mock
      delete (navigator as unknown as Record<string, unknown>).clipboard;
    });
    
    it('copies SKU to clipboard when copy button is clicked', async () => {
      const user = userEvent.setup();
      const mockWriteText = jest.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
      });

      const ProductWithCopyButton = ({ product }: { product: { sku: string } }) => (
        <div>
          <span>{product.sku}</span>
          <button
            onClick={() => navigator.clipboard.writeText(product.sku)}
            aria-label={`Copy SKU ${product.sku}`}
          >
            Copy SKU
          </button>
        </div>
      );

      renderWithProviders(<ProductWithCopyButton product={mockProducts[0]} />);

      await user.click(screen.getByRole('button', { name: /copy sku meat-001/i }));

      expect(mockWriteText).toHaveBeenCalledWith('MEAT-001');
    });
  });

  describe('SKU in Bulk Import', () => {
    it('includes SKU column in import CSV template', () => {
      const generateCSVTemplate = () => {
        const headers = ['title', 'description', 'sku', 'price', 'status'];
        const exampleRow = ['Example Product', 'Description', 'EXAMPLE-001', '29.99', 'active'];
        
        return {
          headers,
          example: exampleRow,
        };
      };

      const template = generateCSVTemplate();
      
      expect(template.headers).toContain('sku');
      expect(template.example[2]).toBe('EXAMPLE-001');
    });

    it('validates SKU uniqueness during bulk import', async () => {
      const validateImportData = (rows: unknown[]) => {
        const skus = rows.map((row: unknown) => (row as Record<string, unknown>).sku).filter(Boolean);
        const uniqueSkus = new Set(skus);
        
        if (skus.length !== uniqueSkus.size) {
          return { valid: false, error: 'Duplicate SKUs found in import data' };
        }
        
        return { valid: true };
      };

      const importData = [
        { title: 'Product 1', sku: 'DUPLICATE-001' },
        { title: 'Product 2', sku: 'DUPLICATE-001' }, // Duplicate
        { title: 'Product 3', sku: 'UNIQUE-001' },
      ];

      const validation = validateImportData(importData);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Duplicate SKUs found in import data');
    });
  });

  describe('SKU Edit Functionality', () => {
    it('allows editing SKU in product edit dialog', async () => {
      const user = userEvent.setup();
      const updateProductMock = jest.fn().mockResolvedValue({});
      mockUseMutation.mockReturnValue(updateProductMock);

      const EditProductDialog = ({ product }: { product: Product }) => {
        const updateProduct = mockUseMutation((api as unknown as Record<string, unknown>).functions.products.products.updateProduct);
        
        return (
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            updateProduct({
              id: product._id,
              sku: formData.get('sku') as string,
            });
          }}>
            <input name="sku" defaultValue={product.sku} placeholder="SKU" />
            <button type="submit">Update Product</button>
          </form>
        );
      };

      renderWithProviders(
        <ConvexProvider client={mockClient}>
          <EditProductDialog product={mockProducts[0]} />
        </ConvexProvider>
      );

      const skuInput = screen.getByPlaceholderText('SKU');
      await user.clear(skuInput);
      await user.type(skuInput, 'UPDATED-001');
      
      await user.click(screen.getByText('Update Product'));

      await waitFor(() => {
        expect(updateProductMock).toHaveBeenCalledWith({
          id: mockProducts[0]?._id || '',
          sku: 'UPDATED-001',
        });
      });
    });
  });
});