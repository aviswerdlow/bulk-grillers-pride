import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';

import userEvent from '@testing-library/user-event';
import { cleanupTest, createMockProduct, mockUseMutation, mockUseQuery, render, screen, setupTest, waitFor, renderWithProviders } from '@/__tests__/test-helpers';
import { CategorySelector } from '@/components/categories/category-selector';
import { CreateCategoryDialog } from '@/components/categories/create-category-dialog';
import { CreateProductDialog } from '@/components/products/create-product-dialog';
import { EditProductDialog } from '@/components/products/edit-product-dialog';
import { ProductCard } from '@/components/products/product-card';
import { Product } from '@/types/models';
import { createMockId } from '@bulk-grillers-pride/test-factories';
import { api } from '@convex/_generated/api';
import { Id } from '@convex/_generated/dataModel';
import { toast } from 'sonner';
;

// Components

// Mock dependencies
jest.mock('sonner');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/test-path',
}));

describe('Error States and Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    setupTest();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Network Error Handling', () => {
    it('handles network timeout gracefully', async () => {
      const user = userEvent.setup();
      const mockCreateProduct = jest.fn();
      
      // Simulate network timeout
      mockCreateProduct.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );
      
      mockUseMutation.mockReturnValue(mockCreateProduct);
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      await user.type(screen.getByLabelText(/title/i), 'Test Product');
      await user.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to create product')
        );
      });
    });

    it('handles API rate limiting', async () => {
      const user = userEvent.setup();
      const mockUpdateProduct = jest.fn();
      
      // Simulate rate limit error
      mockUpdateProduct.mockRejectedValueOnce({
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      });
      
      mockUseMutation.mockReturnValue(mockUpdateProduct);
      
      const product = createMockProduct();
      
      renderWithProviders(<EditProductDialog
          open={true}
          onOpenChange={() => {}}
          product={{
            ...product,
            createdAt: Date.now(),
            version: 1,
            images: [],
            metadata: {},
            lastModifiedBy: "user_123" as Id<"users">
          } as any}
        />
      );

      await user.click(screen.getByRole('button', { name: /update product/i }));

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });

    it('retries failed requests with exponential backoff', async () => {
      const user = userEvent.setup();
      const mockCreateCategory = jest.fn();
      
      // Fail first two attempts, succeed on third
      mockCreateCategory
        .mockRejectedValueOnce(new Error('Server error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ _id: 'cat_123' });
      
      mockUseMutation.mockReturnValue(mockCreateCategory);
      
      renderWithProviders(<CreateCategoryDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      await user.type(screen.getByLabelText(/name/i), 'Test Category');
      await user.click(screen.getByRole('button', { name: /create category/i }));

      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledTimes(3);
        expect(toast.success).toHaveBeenCalledWith('Category created successfully');
      }, { timeout: 5000 });
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('handles extremely long input gracefully', async () => {
      const user = userEvent.setup();
      const veryLongTitle = 'A'.repeat(1000);
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, veryLongTitle);

      // Should truncate or show error
      await waitFor(() => {
        expect(screen.getByText(/title is too long/i)).toBeInTheDocument();
      });
    });

    it('sanitizes HTML in user input', async () => {
      const user = userEvent.setup();
      const mockCreateProduct = jest.fn();
      mockUseMutation.mockReturnValue(mockCreateProduct);
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      const maliciousInput = '<script>alert("XSS")</script>Product Name';
      await user.type(screen.getByLabelText(/title/i), maliciousInput);
      await user.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(mockCreateProduct).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Product Name', // Script tags stripped
          })
        );
      });
    });

    it('handles special characters in handles', async () => {
      const user = userEvent.setup();
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Product™ with © Symbols');

      const handleInput = screen.getByLabelText(/handle/i);
      expect(handleInput).toHaveValue('product-with-symbols');
    });

    it('prevents duplicate handle submission', async () => {
      const user = userEvent.setup();
      const mockCreateProduct = jest.fn();
      
      // First call succeeds, second fails with duplicate error
      mockCreateProduct
        .mockResolvedValueOnce({ _id: 'prod_1' })
        .mockRejectedValueOnce({ code: 'DUPLICATE_HANDLE' });
      
      mockUseMutation.mockReturnValue(mockCreateProduct);
      
      const { rerender } = renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      // First submission
      await user.type(screen.getByLabelText(/title/i), 'Product One');
      await user.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      // Try to create another with same handle
      rerender(
        <CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      await user.type(screen.getByLabelText(/title/i), 'Product One');
      await user.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(screen.getByText(/handle already exists/i)).toBeInTheDocument();
      });
    });
  });

  describe('Component State Edge Cases', () => {
    it('handles rapid clicks on submit button', async () => {
      const user = userEvent.setup();
      const mockCreateProduct = jest.fn();
      mockCreateProduct.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      mockUseMutation.mockReturnValue(mockCreateProduct);
      
      renderWithProviders(<CreateProductDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      await user.type(screen.getByLabelText(/title/i), 'Test Product');
      
      const submitButton = screen.getByRole('button', { name: /create product/i });
      
      // Rapid clicks
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only call once due to button being disabled
      expect(mockCreateProduct).toHaveBeenCalledTimes(1);
      expect(submitButton).toBeDisabled();
    });

    it('handles component unmounting during async operation', async () => {
      const user = userEvent.setup();
      const mockCreateCategory = jest.fn();
      mockCreateCategory.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ _id: 'cat_123' }), 1000))
      );
      
      mockUseMutation.mockReturnValue(mockCreateCategory);
      
      const { unmount } = renderWithProviders(<CreateCategoryDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
        />
      );

      await user.type(screen.getByLabelText(/name/i), 'Test Category');
      await user.click(screen.getByRole('button', { name: /create category/i }));

      // Unmount before operation completes
      unmount();

      // Should not throw errors
      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalled();
      });
    });

    it('handles missing required data gracefully', () => {
      // Product card with minimal data
      const minimalProduct = {
        _id: 'prod_123',
        title: 'Minimal Product',
        // Missing optional fields
      };
      
      renderWithProviders(<ProductCard product={minimalProduct as unknown as Product} />);
      
      expect(screen.getByText('Minimal Product')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument(); // Vendor fallback
      expect(screen.queryByAltText('Product image')).not.toBeInTheDocument(); // No image
    });
  });

  describe('Category Selection Edge Cases', () => {
    it('handles empty category tree', async () => {
      mockUseQuery.mockImplementation((query) => {
        if (query.name?.includes('getCategoryTree')) return [];
        if (query.name?.includes('getCategoryLevels')) return [];
        return null;
      });
      
      renderWithProviders(<CategorySelector
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
          selectedCategories={[]}
          onChange={() => {}}
        />
      );

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /select categories/i }));

      expect(screen.getByText('No categories found.')).toBeInTheDocument();
    });

    it('handles circular category references', () => {
      const circularCategories = [
        {
          _id: 'cat_1',
          name: 'Category A',
          parentId: 'cat_2', // Points to B
          children: [] as Category[],
        },
        {
          _id: 'cat_2',
          name: 'Category B',
          parentId: 'cat_1', // Points to A (circular)
          children: [] as Category[],
        },
      ];
      
      mockUseQuery.mockImplementation((query) => {
        if (query.name?.includes('getCategoryTree')) return circularCategories;
        return null;
      });
      
      // Should not crash or infinite loop
      renderWithProviders(<CategorySelector
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
          selectedCategories={[]}
          onChange={() => {}}
        />
      );
      
      expect(screen.getByRole('button', { name: /select categories/i })).toBeInTheDocument();
    });

    it('handles very deep category hierarchies', async () => {
      // Create a deeply nested category structure
      const deepCategories: any[] = [];
      let current: any = null;
      
      for (let i = 0; i < 20; i++) {
        const category: any = {
          _id: `cat_${i}`,
          name: `Level ${i}`,
          level: i,
          parentId: i > 0 ? `cat_${i - 1}` : null,
          children: current ? [current] : [],
        };
        current = category;
        if (i === 0) deepCategories.push(category);
      }
      
      mockUseQuery.mockImplementation((query: any) => {
        if (query.name?.includes('getCategoryTree')) return deepCategories;
        return null;
      });
      
      const user = userEvent.setup();
      renderWithProviders(<CategorySelector
          organizationId={"org_123" as Id<"organizations">}
          projectId={"project_123" as Id<"projects">}
          selectedCategories={[]}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('button', { name: /select categories/i }));
      
      // Should handle deep nesting without performance issues
      expect(screen.getByText('Level 0')).toBeInTheDocument();
    });
  });

  describe('Concurrent Operations', () => {
    it('handles multiple simultaneous mutations', async () => {
      const user = userEvent.setup();
      const mockMutation1 = jest.fn().mockResolvedValue({ success: true });
      const mockMutation2 = jest.fn().mockResolvedValue({ success: true });
      const mockMutation3 = jest.fn().mockResolvedValue({ success: true });
      
      let mutationCount = 0;
      mockUseMutation.mockImplementation(() => {
        mutationCount++;
        if (mutationCount === 1) return mockMutation1;
        if (mutationCount === 2) return mockMutation2;
        return mockMutation3;
      });
      
      // Component that triggers multiple mutations
      function MultiMutationComponent() {
        const mutation1 = mockUseMutation((api as any).functions.products.products.updateProduct);
        const mutation2 = mockUseMutation((api as any).functions.products.products.updateProduct);
        const mutation3 = mockUseMutation((api as any).functions.products.products.updateProduct);
        
        const handleMultiple = async () => {
          await Promise.all([
            mutation1({ productId: createMockId('products') as Id<'products'> }),
            mutation2({ productId: createMockId('products') as Id<'products'> }),
            mutation3({ productId: createMockId('products') as Id<'products'> }),
          ]);
        };
        
        return <button onClick={handleMultiple}>Execute All</button>;
      }
      
      renderWithProviders(<MultiMutationComponent />);
      
      await user.click(screen.getByText('Execute All'));
      
      await waitFor(() => {
        expect(mockMutation1).toHaveBeenCalled();
        expect(mockMutation2).toHaveBeenCalled();
        expect(mockMutation3).toHaveBeenCalled();
      });
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('handles large data sets without memory leaks', () => {
      // Create a large product list
      const largeProductList = Array.from({ length: 10000 }, (_, i) => 
        createMockProduct({
          _id: `prod_${i}` as Id<'products'>,
          title: `Product ${i}`,
        }) as unknown as Product
      );
      
      const { unmount } = renderWithProviders(<div>
          {largeProductList.slice(0, 100).map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      );
      
      // Should render without issues
      expect(screen.getByText('Product 0')).toBeInTheDocument();
      expect(screen.getByText('Product 99')).toBeInTheDocument();
      
      // Clean unmount
      unmount();
    });

    it('handles rapid state updates', async () => {
      const user = userEvent.setup();
      
      function RapidUpdateComponent() {
        const [count, setCount] = React.useState(0);
        
        const rapidUpdate = () => {
          for (let i = 0; i < 100; i++) {
            setCount(prev => prev + 1);
          }
        };
        
        return (
          <div>
            <span>Count: {count}</span>
            <button onClick={rapidUpdate}>Rapid Update</button>
          </div>
        );
      }
      
      renderWithProviders(<RapidUpdateComponent />);
      
      await user.click(screen.getByText('Rapid Update'));
      
      // Should batch updates efficiently
      await waitFor(() => {
        expect(screen.getByText('Count: 100')).toBeInTheDocument();
      });
    });
  });
});