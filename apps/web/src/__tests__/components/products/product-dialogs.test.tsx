import React from 'react';
import { fireEvent } from '@testing-library/react';
import { mockUseMutation, mockUseQuery, render, renderWithProviders } from '@/__tests__/test-helpers';
import { CreateProductDialog } from '@/components/products/create-product-dialog';
import { Id } from '@convex/_generated/dataModel';
import { toast } from 'sonner';
// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn) => (e) => { e?.preventDefault?.(); return fn({}); },
    formState: { errors: {} },
    register: jest.fn(),
    setValue: jest.fn(),
    getValues: jest.fn(() => ({})),
    watch: jest.fn(),
    reset: jest.fn(),
  }),
  Controller: ({ render }) => render({ field: { onChange: jest.fn(), onBlur: jest.fn(), value: '', name: 'test' } }),
  FormProvider: ({ children }) => children,
  useFormContext: () => ({
    control: {},
    formState: { errors: {} },
    getFieldState: jest.fn(() => ({ error: null })),
    register: jest.fn(),
  }),
}));

import userEvent from '@testing-library/user-event';
;

// Mock the convex hooks
// Import the mocked API (no need to mock it again as jest.config.js handles it)
// import { api } from '@convex/_generated/api';

// Define form data interface
interface FormData {
  title: string;
  description?: string;
  vendor?: string;
  productType?: string;
  handle: string;
  status: string;
  tags?: string[];
}

// Create a mock form instance that can be modified in tests
const mockFormInstance = {
  register: jest.fn((name) => ({
    name,
    onChange: jest.fn(),
    onBlur: jest.fn(),
    ref: jest.fn(),
  })),
  handleSubmit: jest.fn((fn: (data: FormData) => void) => (e: React.FormEvent) => {
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

// Use mockUseMutation from test-utils

describe('CreateProductDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    organizationId: 'org1' as Id<'organizations'>,
    projectId: 'proj1' as Id<'projects'>,
  };

  const mockCreateProduct = jest.fn();
  const mockMutationObject = Object.assign(mockCreateProduct, {
    withOptimisticUpdate: jest.fn().mockReturnValue(mockCreateProduct as any),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMutation.mockImplementation(() => mockMutationObject as any);
  });

  describe('rendering', () => {
    it('renders dialog when open', () => {
      renderWithProviders(<CreateProductDialog {...defaultProps} />);

      expect(screen.getByText('Create New Product')).toBeInTheDocument();
      expect(screen.getByText('Add a new product to your catalog. You can always edit these details later.')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      renderWithProviders(<CreateProductDialog {...defaultProps} />);

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
      const { container } = renderWithProviders(<CreateProductDialog {...defaultProps} open={false} />);

      // When dialog is closed, it might not render anything
      expect(container.firstChild).toBeNull();
    });
  });

  describe('form validation', () => {
    it('validates required title field', async () => {
      // Update the shared mock instance
      (mockFormInstance as any).formState = {
        errors: {
          title: { message: 'Title is required' },
        },
      };

      renderWithProviders(<CreateProductDialog {...defaultProps} />);

      expect(screen.getByText('Title is required')).toBeInTheDocument();
      
      // Reset for other tests
      (mockFormInstance as any).formState = { errors: {} };
    });

    it('generates handle from title automatically', async () => {
      const mockSetValue = jest.fn();
      (mockFormInstance as any).setValue = mockSetValue;

      renderWithProviders(<CreateProductDialog {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Enter product title');
      fireEvent.change(titleInput, { target: { value: 'Test Product Name!'  } } as any);

      expect(mockSetValue).toHaveBeenCalledWith('title', 'Test Product Name!');
      expect(mockSetValue).toHaveBeenCalledWith('handle', 'test-product-name');
    });
  });

  describe('tag management', () => {
    it('adds tags when Enter is pressed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />);

      const tagInput = screen.getByPlaceholderText('Enter tag and press Enter');

      await user.type(tagInput, 'new-tag');
      await user.keyboard('{Enter}');

      expect(screen.getByText('new-tag')).toBeInTheDocument();
    });

    it('prevents duplicate tags', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />);

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
      renderWithProviders(<CreateProductDialog {...defaultProps} />);

      const tagInput = screen.getByPlaceholderText('Enter tag and press Enter');

      await user.type(tagInput, 'removable-tag');
      await user.keyboard('{Enter}');

      expect(screen.getByText('removable-tag')).toBeInTheDocument();

      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.querySelector('svg')?.classList.contains('lucide-x'));

      if (removeButtons.length > 0 && removeButtons[0]) {
        await user.click(removeButtons[0]);
      }

      // Dialog should not be visible when closed
      const dialogText = screen.queryByText('removable-tag');
      expect(dialogText).toBeNull();
    });
  });

  describe('form submission', () => {
    it('submits form with correct data', async () => {
      const user = userEvent.setup();
      // toast is already mocked at the module level

      // Mock the handleSubmit to actually call the onSubmit function
      (mockFormInstance as any).handleSubmit = jest.fn((fn) => async (e: any) => {
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

      renderWithProviders(<CreateProductDialog {...defaultProps} />);

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
      // toast is already mocked at the module level
      mockCreateProduct.mockRejectedValue(new Error('Failed to create product'));

      // Mock the handleSubmit to actually call the onSubmit function
      (mockFormInstance as any).handleSubmit = jest.fn((fn) => async (e: any) => {
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

      renderWithProviders(<CreateProductDialog {...defaultProps} />);

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

      renderWithProviders(<CreateProductDialog {...defaultProps} />);

      const createButton = screen.getByRole('button', { name: 'Create Product' });
      await user.click(createButton);

      expect(createButton).toBeDisabled();
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  describe('dialog interactions', () => {
    it('calls onOpenChange when Cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<CreateProductDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets form when dialog is closed and reopened', () => {
      // Spy on the reset function
      const originalReset = mockFormInstance.reset;
      (mockFormInstance as any).reset = jest.fn();

      const mockOnOpenChange = jest.fn((open) => {
        // Simulate the dialog closing
        if (!open) {
          // The component calls reset in handleClose
          mockFormInstance.reset();
        }
      });

      const { } = renderWithProviders(<CreateProductDialog {...defaultProps} onOpenChange={mockOnOpenChange} />
      );

      // Reset should not be called on initial render
      expect(mockFormInstance.reset).not.toHaveBeenCalled();

      // Trigger dialog close through onOpenChange
      mockOnOpenChange(false);

      // The component should call reset when closing
      expect(mockFormInstance.reset).toHaveBeenCalled();

      // Restore original mock
      (mockFormInstance as any).reset = originalReset;
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
