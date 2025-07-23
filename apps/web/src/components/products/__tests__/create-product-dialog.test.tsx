import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
/**
 * @jest-environment jsdom
 */
import React from 'react';

import userEvent from '@testing-library/user-event';
import { cleanupTest, mockUseMutation, render, screen, setupTest, waitFor, renderWithProviders } from '@/__tests__/test-helpers';
import { CreateProductDialog } from '../create-product-dialog';
import { toast } from 'sonner';
// import { api } from '@convex/_generated/api';
// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Import after mocking
;

describe('CreateProductDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOnOpenChange = jest.fn();
  const mockCreateProduct = jest.fn();
  
  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    organizationId: 'org_123' as unknown,
    projectId: 'project_123' as unknown,
  };

  beforeEach(() => {
    setupTest();
    jest.clearAllMocks();
    mockUseMutation.mockReturnValue(mockCreateProduct);
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Rendering', () => {
    it('renders dialog with correct title and description', () => {
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create New Product')).toBeInTheDocument();
      expect(screen.getByText(/Add a new product to your catalog/)).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      // Required fields
      expect(screen.getByLabelText(/title \*/i)).toBeInTheDocument();
      
      // Optional fields
      expect(screen.getByLabelText(/handle/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sku/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/vendor/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/product type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('shows draft as default status', () => {
      renderWithProviders(<CreateProductDialog {...defaultProps} />)
      
      const statusSelect = screen.getByRole('combobox');
      expect(statusSelect).toHaveTextContent('Draft');
    });
  });

  describe('Form Interactions', () => {
    it('auto-generates handle from title', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      const titleInput = screen.getByLabelText(/title \*/i);
      const handleInput = screen.getByLabelText(/handle/i);

      await user.type(titleInput, 'My Amazing Product!');
      
      expect(handleInput).toHaveValue('my-amazing-product');
    });

    it('validates required title field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /create product/i });
      
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Title is required')).toBeInTheDocument();
      });
    });

    it('handles tag addition and removal', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      const tagInput = screen.getByPlaceholderText(/add a tag/i);
      const addButton = screen.getByRole('button', { name: /add tag/i });

      // Add tags
      await user.type(tagInput, 'electronics');
      await user.click(addButton);
      
      expect(screen.getByText('electronics')).toBeInTheDocument();

      // Add another tag
      await user.type(tagInput, 'gadgets');
      await user.keyboard('{Enter}'); // Test Enter key functionality
      
      expect(screen.getByText('gadgets')).toBeInTheDocument();

      // Remove a tag
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      expect(screen.queryByText('electronics')).not.toBeInTheDocument();
      expect(screen.getByText('gadgets')).toBeInTheDocument();
    });

    it('prevents duplicate tags', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      const tagInput = screen.getByPlaceholderText(/add a tag/i);
      const addButton = screen.getByRole('button', { name: /add tag/i });

      await user.type(tagInput, 'electronics');
      await user.click(addButton);
      
      await user.type(tagInput, 'electronics');
      await user.click(addButton);

      // Should only have one instance of the tag
      const tags = screen.getAllByText('electronics');
      expect(tags).toHaveLength(1);
    });

    it('changes status via select', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      const statusSelect = screen.getByRole('combobox');
      
      await user.click(statusSelect);
      await user.click(screen.getByRole('option', { name: /active/i }));

      expect(statusSelect).toHaveTextContent('Active');
    });
  });

  describe('Form Submission', () => {
    it('submits form with all data correctly', async () => {
      const user = userEvent.setup();
      mockCreateProduct.mockResolvedValueOnce({});
      
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      // Fill form
      await user.type(screen.getByLabelText(/title \*/i), 'Test Product');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.type(screen.getByLabelText(/vendor/i), 'Test Vendor');
      await user.type(screen.getByLabelText(/product type/i), 'Electronics');
      await user.type(screen.getByLabelText(/sku/i), 'TEST-123');
      
      // Add tags
      const tagInput = screen.getByPlaceholderText(/add a tag/i);
      await user.type(tagInput, 'tag1');
      await user.keyboard('{Enter}');
      await user.type(tagInput, 'tag2');
      await user.keyboard('{Enter}');

      // Change status
      await user.click(screen.getByRole('combobox'));
      await user.click(screen.getByRole('option', { name: /active/i }));

      // Submit
      const submitButton = screen.getByRole('button', { name: /create product/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateProduct).toHaveBeenCalledWith({
          organizationId: 'org_123',
          projectId: 'project_123',
          title: 'Test Product',
          description: 'Test description',
          vendor: 'Test Vendor',
          productType: 'Electronics',
          handle: 'test-product',
          sku: 'TEST-123',
          seoTitle: undefined,
          seoDescription: undefined,
          tags: ['tag1', 'tag2'],
          metadata: {},
          status: 'active',
        });
      });
    });

    it('shows success toast on successful creation', async () => {
      const user = userEvent.setup();
      mockCreateProduct.mockResolvedValueOnce({});
      
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      await user.type(screen.getByLabelText(/title \*/i), 'Test Product');
      await user.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Product created successfully');
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows error toast on creation failure', async () => {
      const user = userEvent.setup();
      const error = new Error('Creation failed');
      mockCreateProduct.mockRejectedValueOnce(error);
      
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      await user.type(screen.getByLabelText(/title \*/i), 'Test Product');
      await user.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create product. Please try again.');
      });
    });

    it('disables submit button while submitting', async () => {
      const user = userEvent.setup();
      mockCreateProduct.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      await user.type(screen.getByLabelText(/title \*/i), 'Test Product');
      const submitButton = screen.getByRole('button', { name: /create product/i });
      
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Creating...');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Dialog Management', () => {
    it('resets form when dialog closes', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithProviders(<CreateProductDialog {...defaultProps} />)

      // Fill some fields
      await user.type(screen.getByLabelText(/title \*/i), 'Test Product');
      await user.type(screen.getByLabelText(/description/i), 'Test description');

      // Close dialog
      rerender(<CreateProductDialog {...defaultProps} open={false} />)

      // Reopen dialog
      rerender(<CreateProductDialog {...defaultProps} open={true} />)

      // Fields should be empty
      expect(screen.getByLabelText(/title \*/i)).toHaveValue('');
      expect(screen.getByLabelText(/description/i)).toHaveValue('');
    });

    it('calls onOpenChange when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('SEO Fields', () => {
    it('expands SEO section and allows input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      // Click to expand SEO section
      const seoButton = screen.getByRole('button', { name: /seo settings/i });
      await user.click(seoButton);

      // SEO fields should be visible
      const seoTitle = screen.getByLabelText(/seo title/i);
      const seoDescription = screen.getByLabelText(/seo description/i);

      expect(seoTitle).toBeVisible();
      expect(seoDescription).toBeVisible();

      // Type in SEO fields
      await user.type(seoTitle, 'SEO Title');
      await user.type(seoDescription, 'SEO Description');

      expect(seoTitle).toHaveValue('SEO Title');
      expect(seoDescription).toHaveValue('SEO Description');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby');
    });

    it('focuses on first input when opened', async () => {
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title \*/i);
        expect(titleInput).toHaveFocus();
      });
    });

    it('traps focus within dialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />)

      // Tab through all focusable elements
      const focusableElements = screen.getAllByRole('textbox').length + 
                               screen.getAllByRole('button').length +
                               screen.getAllByRole('combobox').length;

      for (let i = 0; i < focusableElements + 2; i++) {
        await user.tab();
      }

      // Focus should still be within dialog
      const dialogElement = screen.getByRole('dialog');
      expect(dialogElement.contains(document.activeElement)).toBe(true);
    });
  });
});