import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { DeleteProductDialog } from '../delete-product-dialog';
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

describe('DeleteProductDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockDeleteProduct = jest.fn();
  
  const mockProduct: Product = createMockProduct({
    _id: 'product_123',
    title: 'Product to Delete',
    handle: 'product-to-delete',
    sku: 'DEL-123',
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
    (useMutation as jest.Mock).mockReturnValue(mockDeleteProduct);
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Rendering', () => {
    it('renders confirmation dialog with product information', () => {
      render(<DeleteProductDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete Product')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      expect(screen.getByText('"Product to Delete"')).toBeInTheDocument();
    });

    it('shows warning message about permanent deletion', () => {
      render(<DeleteProductDialog {...defaultProps} />);

      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
      expect(screen.getByText(/permanently deleted/)).toBeInTheDocument();
    });

    it('displays product SKU if available', () => {
      render(<DeleteProductDialog {...defaultProps} />);

      expect(screen.getByText('SKU: DEL-123')).toBeInTheDocument();
    });

    it('handles product without SKU', () => {
      const productWithoutSku = { ...mockProduct, sku: null };
      render(<DeleteProductDialog {...defaultProps} product={productWithoutSku} />);

      expect(screen.queryByText(/SKU:/)).not.toBeInTheDocument();
    });

    it('renders cancel and delete buttons', () => {
      render(<DeleteProductDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<DeleteProductDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows confirmation step when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<DeleteProductDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Should show final confirmation
      expect(screen.getByText(/Are you absolutely sure/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /yes, delete permanently/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /no, keep it/i })).toBeInTheDocument();
    });

    it('returns to initial state when "No, keep it" is clicked', async () => {
      const user = userEvent.setup();
      render(<DeleteProductDialog {...defaultProps} />);

      // Go to confirmation step
      await user.click(screen.getByRole('button', { name: /delete/i }));
      
      // Click "No, keep it"
      await user.click(screen.getByRole('button', { name: /no, keep it/i }));

      // Should be back to initial state
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      expect(screen.queryByText(/Are you absolutely sure/)).not.toBeInTheDocument();
    });
  });

  describe('Deletion Process', () => {
    it('deletes product when confirmed', async () => {
      const user = userEvent.setup();
      mockDeleteProduct.mockResolvedValueOnce({});
      
      render(<DeleteProductDialog {...defaultProps} />);

      // Click delete
      await user.click(screen.getByRole('button', { name: /delete/i }));
      
      // Confirm deletion
      await user.click(screen.getByRole('button', { name: /yes, delete permanently/i }));

      await waitFor(() => {
        expect(mockDeleteProduct).toHaveBeenCalledWith({
          productId: 'product_123',
        });
      });
    });

    it('shows success message after deletion', async () => {
      const user = userEvent.setup();
      mockDeleteProduct.mockResolvedValueOnce({});
      
      render(<DeleteProductDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /yes, delete permanently/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Product deleted successfully');
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows error message on deletion failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Deletion failed');
      mockDeleteProduct.mockRejectedValueOnce(error);
      
      render(<DeleteProductDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /yes, delete permanently/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete product. Please try again.');
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });
    });

    it('disables buttons during deletion', async () => {
      const user = userEvent.setup();
      mockDeleteProduct.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<DeleteProductDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));
      const confirmButton = screen.getByRole('button', { name: /yes, delete permanently/i });
      
      await user.click(confirmButton);

      expect(confirmButton).toBeDisabled();
      expect(confirmButton).toHaveTextContent('Deleting...');

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles null product gracefully', () => {
      render(<DeleteProductDialog {...defaultProps} product={null} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('resets confirmation state when dialog reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<DeleteProductDialog {...defaultProps} />);

      // Go to confirmation step
      await user.click(screen.getByRole('button', { name: /delete/i }));
      expect(screen.getByText(/Are you absolutely sure/)).toBeInTheDocument();

      // Close dialog
      rerender(<DeleteProductDialog {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<DeleteProductDialog {...defaultProps} open={true} />);

      // Should be back to initial state
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      expect(screen.queryByText(/Are you absolutely sure/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<DeleteProductDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('focuses on cancel button when opened', async () => {
      render(<DeleteProductDialog {...defaultProps} />);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        expect(cancelButton).toHaveFocus();
      });
    });

    it('uses destructive variant for delete button', () => {
      render(<DeleteProductDialog {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toHaveClass('destructive');
    });

    it('announces deletion status to screen readers', async () => {
      const user = userEvent.setup();
      mockDeleteProduct.mockResolvedValueOnce({});
      
      render(<DeleteProductDialog {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));
      await user.click(screen.getByRole('button', { name: /yes, delete permanently/i }));

      await waitFor(() => {
        // Check for live region announcement
        const liveRegion = document.querySelector('[aria-live="polite"]');
        expect(liveRegion).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DeleteProductDialog {...defaultProps} />);

      // Tab through buttons
      await user.tab();
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /delete/i })).toHaveFocus();

      // Escape closes dialog
      await user.keyboard('{Escape}');
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});