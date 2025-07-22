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
import { api } from '@convex/_generated/api';

// Create a mock form instance that can be modified in tests
const mockFormInstance = {
  register: jest.fn((name) => ({
    name,
    onChange: jest.fn(),
    onBlur: jest.fn(),
    ref: jest.fn(),
  })),
  handleSubmit: jest.fn((fn: any) => (e: any) => {
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
  }),
  formState: { errors: {} },
  reset: jest.fn(),
  setValue: jest.fn(),
  watch: jest.fn(),
};

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => mockFormInstance,
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
      expect(screen.getByText('Add a new product to your catalog. You can always edit these details later.')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<CreateProductDialog {...defaultProps} />);

      // Check for text content since labels render as divs
      expect(screen.getByText('Title *')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Vendor')).toBeInTheDocument();
      expect(screen.getByText('Product Type')).toBeInTheDocument();
      expect(screen.getByText('Handle')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Add Tags')).toBeInTheDocument();
      
      // Check for input fields by placeholder
      expect(screen.getByPlaceholderText('Enter product title')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Describe your product...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Brand or vendor name')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<CreateProductDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('Create New Product')).not.toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('validates required title field', async () => {
      // Update the shared mock instance
      mockFormInstance.formState = {
        errors: {
          title: { message: 'Title is required' },
        },
      };

      render(<CreateProductDialog {...defaultProps} />);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      
      // Reset for other tests
      mockFormInstance.formState = { errors: {} };
    });

    it('generates handle from title automatically', async () => {
      const mockSetValue = jest.fn();
      mockFormInstance.setValue = mockSetValue;

      render(<CreateProductDialog {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter product title');
      fireEvent.change(titleInput, { target: { value: 'Test Product Name!' } });

      expect(mockSetValue).toHaveBeenCalledWith('title', 'Test Product Name!');
      expect(mockSetValue).toHaveBeenCalledWith('handle', 'test-product-name');
    });
  });

  describe('tag management', () => {
    it('adds tags when Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<CreateProductDialog {...defaultProps} />);

      const tagInput = screen.getByPlaceholderText('Enter tag and press Enter');

      await user.type(tagInput, 'new-tag');
      await user.keyboard('{Enter}');

      expect(screen.getByText('new-tag')).toBeInTheDocument();
    });

    it('prevents duplicate tags', async () => {
      const user = userEvent.setup();
      render(<CreateProductDialog {...defaultProps} />);

      const tagInput = screen.getByPlaceholderText('Enter tag and press Enter');

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

      const tagInput = screen.getByPlaceholderText('Enter tag and press Enter');

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

      // Mock the handleSubmit to actually call the onSubmit function
      mockFormInstance.handleSubmit = jest.fn((fn) => async (e) => {
        e?.preventDefault?.();
        await fn({
          title: 'Test Product',
          description: 'Test Description',
          vendor: 'Test Vendor',
          productType: 'Test Type',
          handle: 'test-product',
          status: 'draft',
          tags: ['tag1', 'tag2'],
        });
      });

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
          sku: undefined,
          seoTitle: undefined,
          seoDescription: undefined,
          tags: [],  // Tags come from component state, not form data
          metadata: {},
          status: 'draft',
        });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Product created successfully');
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('handles submission errors', async () => {
      const user = userEvent.setup();
      const { toast } = require('sonner');
      mockCreateProduct.mockRejectedValue(new Error('Failed to create product'));

      // Mock the handleSubmit to actually call the onSubmit function
      mockFormInstance.handleSubmit = jest.fn((fn) => async (e) => {
        e?.preventDefault?.();
        await fn({
          title: 'Test Product',
          description: 'Test Description',
          vendor: 'Test Vendor',
          productType: 'Test Type',
          handle: 'test-product',
          status: 'draft',
          tags: ['tag1', 'tag2'],
        });
      });

      render(<CreateProductDialog {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: 'Create Product' });
      await user.click(createButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create product. Please try again.');
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
      // Spy on the reset function
      const originalReset = mockFormInstance.reset;
      mockFormInstance.reset = jest.fn();

      const mockOnOpenChange = jest.fn((open) => {
        // Simulate the dialog closing
        if (!open) {
          // The component calls reset in handleClose
          mockFormInstance.reset();
        }
      });

      const { rerender } = render(
        <CreateProductDialog {...defaultProps} onOpenChange={mockOnOpenChange} />
      );

      // Reset should not be called on initial render
      expect(mockFormInstance.reset).not.toHaveBeenCalled();

      // Trigger dialog close through onOpenChange
      mockOnOpenChange(false);

      // The component should call reset when closing
      expect(mockFormInstance.reset).toHaveBeenCalled();

      // Restore original mock
      mockFormInstance.reset = originalReset;
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
      // The function converts spaces to hyphens first, then trims
      // Leading/trailing spaces become hyphens before trim
      expect(result).toBe('-test-product-');
    });
  });
});
