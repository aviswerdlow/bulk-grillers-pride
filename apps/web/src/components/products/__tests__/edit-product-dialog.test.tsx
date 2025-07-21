import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { EditProductDialog } from '../edit-product-dialog';
import { setupTest, cleanupTest, createMockProduct } from '@/__tests__/frontend-test-helpers';
import { toast } from 'sonner';
import { Product } from '@/types/models';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useMutation: jest.fn(() => jest.fn()),
}));

// Import after mocking
import { useMutation } from 'convex/react';

describe('EditProductDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockUpdateProduct = jest.fn();
  
  const mockProduct: Product = createMockProduct({
    _id: 'product_123',
    title: 'Original Product',
    description: 'Original description',
    handle: 'original-product',
    sku: 'ORIG-123',
    vendor: 'Original Vendor',
    productType: 'Electronics',
    status: 'active',
    tags: ['tag1', 'tag2'],
    seoTitle: 'SEO Title',
    seoDescription: 'SEO Description',
  }) as Product;

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    product: mockProduct,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    setupTest();
    jest.clearAllMocks();
    (useMutation as jest.Mock).mockReturnValue(mockUpdateProduct);
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Rendering', () => {
    it('renders dialog with correct title', () => {
      render(<EditProductDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Product')).toBeInTheDocument();
      expect(screen.getByText(/Update the product information/)).toBeInTheDocument();
    });

    it('pre-fills form with existing product data', () => {
      render(<EditProductDialog {...defaultProps} />);

      expect(screen.getByLabelText(/title \*/i)).toHaveValue('Original Product');
      expect(screen.getByLabelText(/handle/i)).toHaveValue('original-product');
      expect(screen.getByLabelText(/sku/i)).toHaveValue('ORIG-123');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Original description');
      expect(screen.getByLabelText(/vendor/i)).toHaveValue('Original Vendor');
      expect(screen.getByLabelText(/product type/i)).toHaveValue('Electronics');
      
      // Check status
      const statusSelect = screen.getByRole('combobox');
      expect(statusSelect).toHaveTextContent('Active');

      // Check tags
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
    });

    it('renders SEO fields with existing data', async () => {
      const user = userEvent.setup();
      render(<EditProductDialog {...defaultProps} />);

      // Expand SEO section
      const seoButton = screen.getByRole('button', { name: /seo settings/i });
      await user.click(seoButton);

      expect(screen.getByLabelText(/seo title/i)).toHaveValue('SEO Title');
      expect(screen.getByLabelText(/seo description/i)).toHaveValue('SEO Description');
    });
  });

  describe('Form Interactions', () => {
    it('updates handle when title changes and handle is synchronized', async () => {
      const user = userEvent.setup();
      render(<EditProductDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/title \*/i);
      const handleInput = screen.getByLabelText(/handle/i);

      // Clear and type new title
      await user.clear(titleInput);
      await user.type(titleInput, 'New Product Title');

      // Handle should update automatically
      expect(handleInput).toHaveValue('new-product-title');
    });

    it('does not update handle if manually edited', async () => {
      const user = userEvent.setup();
      render(<EditProductDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/title \*/i);
      const handleInput = screen.getByLabelText(/handle/i);

      // Manually edit handle first
      await user.clear(handleInput);
      await user.type(handleInput, 'custom-handle');

      // Then change title
      await user.clear(titleInput);
      await user.type(titleInput, 'New Product Title');

      // Handle should remain custom
      expect(handleInput).toHaveValue('custom-handle');
    });

    it('manages tags correctly', async () => {
      const user = userEvent.setup();
      render(<EditProductDialog {...defaultProps} />);

      // Remove existing tag
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);
      
      expect(screen.queryByText('tag1')).not.toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();

      // Add new tag
      const tagInput = screen.getByPlaceholderText(/add a tag/i);
      await user.type(tagInput, 'new-tag');
      await user.keyboard('{Enter}');

      expect(screen.getByText('new-tag')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits updated data correctly', async () => {
      const user = userEvent.setup();
      mockUpdateProduct.mockResolvedValueOnce({});
      
      render(<EditProductDialog {...defaultProps} />);

      // Update some fields
      const titleInput = screen.getByLabelText(/title \*/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Product');

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');

      // Change status
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: /draft/i }));

      // Submit
      const submitButton = screen.getByRole('button', { name: /update product/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateProduct).toHaveBeenCalledWith({
          productId: 'product_123',
          updates: {
            title: 'Updated Product',
            description: 'Updated description',
            handle: 'updated-product',
            sku: 'ORIG-123',
            vendor: 'Original Vendor',
            productType: 'Electronics',
            seoTitle: 'SEO Title',
            seoDescription: 'SEO Description',
            tags: ['tag1', 'tag2'],
            metadata: {},
            status: 'draft',
          },
        });
      });
    });

    it('shows success message and calls onSuccess', async () => {
      const user = userEvent.setup();
      mockUpdateProduct.mockResolvedValueOnce({});
      
      render(<EditProductDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /update product/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Product updated successfully');
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows error message on failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Update failed');
      mockUpdateProduct.mockRejectedValueOnce(error);
      
      render(<EditProductDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /update product/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update product. Please try again.');
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });

    it('disables submit button while updating', async () => {
      const user = userEvent.setup();
      mockUpdateProduct.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<EditProductDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /update product/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Updating...');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Dialog Management', () => {
    it('does not reset form when closing without submission', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<EditProductDialog {...defaultProps} />);

      // Make some changes
      const titleInput = screen.getByLabelText(/title \*/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Changed Title');

      // Close and reopen
      rerender(<EditProductDialog {...defaultProps} open={false} />);
      rerender(<EditProductDialog {...defaultProps} open={true} />);

      // Original data should be restored
      expect(screen.getByLabelText(/title \*/i)).toHaveValue('Original Product');
    });

    it('handles null product gracefully', () => {
      render(<EditProductDialog {...defaultProps} product={null} />);

      // Should not render dialog content
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('validates required title field', async () => {
      const user = userEvent.setup();
      render(<EditProductDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/title \*/i);
      await user.clear(titleInput);

      const submitButton = screen.getByRole('button', { name: /update product/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    it('allows empty optional fields', async () => {
      const user = userEvent.setup();
      mockUpdateProduct.mockResolvedValueOnce({});
      
      render(<EditProductDialog {...defaultProps} />);

      // Clear optional fields
      await user.clear(screen.getByLabelText(/description/i));
      await user.clear(screen.getByLabelText(/vendor/i));
      await user.clear(screen.getByLabelText(/product type/i));

      const submitButton = screen.getByRole('button', { name: /update product/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateProduct).toHaveBeenCalledWith(expect.objectContaining({
          updates: expect.objectContaining({
            description: '',
            vendor: '',
            productType: '',
          }),
        }));
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and descriptions', () => {
      render(<EditProductDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('manages focus correctly', async () => {
      render(<EditProductDialog {...defaultProps} />);

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title \*/i);
        expect(titleInput).toHaveFocus();
      });
    });

    it('announces form errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<EditProductDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText(/title \*/i);
      await user.clear(titleInput);

      const submitButton = screen.getByRole('button', { name: /update product/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Title is required');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });
});