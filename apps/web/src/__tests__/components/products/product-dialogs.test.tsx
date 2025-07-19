import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProductDialog } from '@/components/products/create-product-dialog';
import { render } from '../../test-utils';
import { useMutation } from 'convex/react';

// Mock the convex hooks
jest.mock('convex/react', () => ({
  useMutation: jest.fn(),
}));

// Import the mocked API (no need to mock it again as jest.config.js handles it)
import { api } from '../../../../../convex/_generated/api';

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn((name) => ({
      name,
      onChange: jest.fn(),
      onBlur: jest.fn(),
      ref: jest.fn(),
    })),
    handleSubmit: (fn: any) => (e: any) => {
      e?.preventDefault?.();
      return fn({
        title: 'Test Product',
        description: 'Test Description',
        vendor: 'Test Vendor',
        productType: 'Test Type',
        handle: 'test-product',
        status: 'draft',
        tags: ['tag1', 'tag2'],
      });
    },
    formState: { errors: {} },
    reset: jest.fn(),
    setValue: jest.fn(),
    watch: jest.fn(),
  }),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe('CreateProductDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    organizationId: 'org1' as any,
    projectId: 'proj1' as any,
  };

  const mockCreateProduct = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMutation.mockReturnValue(mockCreateProduct);
  });

  describe('rendering', () => {
    it('renders dialog when open', () => {
      render(<CreateProductDialog {...defaultProps} />);

      expect(screen.getByText('Create New Product')).toBeInTheDocument();
      expect(screen.getByText('Add a new product to your catalog')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<CreateProductDialog {...defaultProps} />);

      expect(screen.getByLabelText('Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Vendor')).toBeInTheDocument();
      expect(screen.getByLabelText('Product Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Handle (URL Slug)')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<CreateProductDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Create New Product')).not.toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('validates required title field', async () => {
      const { useForm } = require('react-hook-form');
      useForm.mockReturnValue({
        register: jest.fn((name) => ({
          name,
          onChange: jest.fn(),
          onBlur: jest.fn(),
          ref: jest.fn(),
        })),
        handleSubmit: (fn: any) => (e: any) => {
          e?.preventDefault?.();
          // Simulate validation error
          return Promise.reject();
        },
        formState: {
          errors: {
            title: { message: 'Title is required' },
          },
        },
        reset: jest.fn(),
        setValue: jest.fn(),
        watch: jest.fn(),
      });

      render(<CreateProductDialog {...defaultProps} />);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    it('generates handle from title automatically', async () => {
      const mockSetValue = jest.fn();
      const { useForm } = require('react-hook-form');
      useForm.mockReturnValue({
        register: jest.fn((name) => ({
          name,
          onChange: jest.fn(),
          onBlur: jest.fn(),
          ref: jest.fn(),
        })),
        handleSubmit: jest.fn(),
        formState: { errors: {} },
        reset: jest.fn(),
        setValue: mockSetValue,
        watch: jest.fn(),
      });

      render(<CreateProductDialog {...defaultProps} />);

      const titleInput = screen.getByLabelText('Title');
      fireEvent.change(titleInput, { target: { value: 'Test Product Name!' } });

      expect(mockSetValue).toHaveBeenCalledWith('title', 'Test Product Name!');
      expect(mockSetValue).toHaveBeenCalledWith('handle', 'test-product-name');
    });
  });

  describe('tag management', () => {
    it('adds tags when Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<CreateProductDialog {...defaultProps} />);

      const tagInput = screen.getByPlaceholderText('Add a tag...');

      await user.type(tagInput, 'new-tag');
      await user.keyboard('{Enter}');

      expect(screen.getByText('new-tag')).toBeInTheDocument();
    });

    it('prevents duplicate tags', async () => {
      const user = userEvent.setup();
      render(<CreateProductDialog {...defaultProps} />);

      const tagInput = screen.getByPlaceholderText('Add a tag...');

      await user.type(tagInput, 'duplicate');
      await user.keyboard('{Enter}');
      await user.type(tagInput, 'duplicate');
      await user.keyboard('{Enter}');

      const tags = screen.getAllByText('duplicate');
      expect(tags).toHaveLength(1);
    });

    it('removes tags when X is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateProductDialog {...defaultProps} />);

      const tagInput = screen.getByPlaceholderText('Add a tag...');

      await user.type(tagInput, 'removable-tag');
      await user.keyboard('{Enter}');

      expect(screen.getByText('removable-tag')).toBeInTheDocument();

      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.querySelector('svg')?.classList.contains('lucide-x'));

      await user.click(removeButtons[0]);

      expect(screen.queryByText('removable-tag')).not.toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('submits form with correct data', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');

      render(<CreateProductDialog {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: 'Create Product' });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateProduct).toHaveBeenCalledWith({
          organizationId: 'org1',
          projectId: 'proj1',
          title: 'Test Product',
          description: 'Test Description',
          vendor: 'Test Vendor',
          productType: 'Test Type',
          handle: 'test-product',
          status: 'draft',
          tags: ['tag1', 'tag2'],
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Product created successfully');
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('handles submission errors', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      mockCreateProduct.mockRejectedValue(new Error('Failed to create product'));

      render(<CreateProductDialog {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: 'Create Product' });
      await user.click(createButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create product');
      });

      expect(defaultProps.onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it('disables form during submission', async () => {
      const user = userEvent.setup();
      mockCreateProduct.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<CreateProductDialog {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: 'Create Product' });
      await user.click(createButton);

      expect(createButton).toBeDisabled();
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('dialog interactions', () => {
    it('calls onOpenChange when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateProductDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets form when dialog is closed and reopened', () => {
      const mockReset = jest.fn();
      const { useForm } = require('react-hook-form');
      useForm.mockReturnValue({
        register: jest.fn((name) => ({
          name,
          onChange: jest.fn(),
          onBlur: jest.fn(),
          ref: jest.fn(),
        })),
        handleSubmit: jest.fn(),
        formState: { errors: {} },
        reset: mockReset,
        setValue: jest.fn(),
        watch: jest.fn(),
      });

      const { rerender } = render(<CreateProductDialog {...defaultProps} />);

      // Close dialog
      rerender(<CreateProductDialog {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<CreateProductDialog {...defaultProps} open={true} />);

      expect(mockReset).toHaveBeenCalled();
    });
  });
});

// Unit tests for utility functions
describe('Product Dialog Utilities', () => {
  describe('generateHandle', () => {
    const generateHandle = (title: string) => {
      return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    };

    it('converts title to lowercase slug', () => {
      expect(generateHandle('Test Product')).toBe('test-product');
    });

    it('removes special characters', () => {
      expect(generateHandle('Test Product!')).toBe('test-product');
      expect(generateHandle('Test@Product#123')).toBe('testproduct123');
    });

    it('replaces spaces with hyphens', () => {
      expect(generateHandle('Test  Product  Name')).toBe('test-product-name');
    });

    it('handles multiple consecutive hyphens', () => {
      expect(generateHandle('Test---Product')).toBe('test-product');
    });

    it('trims whitespace', () => {
      const result = generateHandle('  Test Product  ');
      // The function trims at the end, so internal spaces become hyphens first
      expect(result).toBe('test-product');
    });
  });
});
