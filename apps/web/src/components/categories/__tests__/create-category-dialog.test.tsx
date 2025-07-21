import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { CreateCategoryDialog } from '../create-category-dialog';
import { setupTest, cleanupTest } from '@/__tests__/frontend-test-helpers';
import { toast } from 'sonner';
import { useQuery, useMutation } from 'convex/react';
import { Id } from '@convex/_generated/dataModel';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
}));

const mockCategories = [
  {
    _id: 'cat_1',
    name: 'Electronics',
    handle: 'electronics',
    level: 0,
    parentId: null,
    path: [],
    isActive: true,
    children: [
      {
        _id: 'cat_2',
        name: 'Computers',
        handle: 'computers',
        level: 1,
        parentId: 'cat_1',
        path: ['cat_1'],
        isActive: true,
        children: [],
      },
    ],
  },
  {
    _id: 'cat_3',
    name: 'Clothing',
    handle: 'clothing',
    level: 0,
    parentId: null,
    path: [],
    isActive: true,
    children: [],
  },
];

const mockLevelDefinitions = [
  { level: 0, name: 'Category', pluralName: 'Categories', maxLevel: 2 },
  { level: 1, name: 'Subcategory', pluralName: 'Subcategories', maxLevel: 2 },
  { level: 2, name: 'Type', pluralName: 'Types', maxLevel: 2 },
];

describe('CreateCategoryDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockCreateCategory = jest.fn();
  
  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    organizationId: 'org_123' as Id<'organizations'>,
    projectId: 'project_123' as Id<'projects'>,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    setupTest();
    jest.clearAllMocks();
    (useQuery as jest.Mock).mockImplementation((query) => {
      if (query.name?.includes('getCategoryTree')) {
        return mockCategories;
      }
      if (query.name?.includes('getCategoryLevels')) {
        return mockLevelDefinitions;
      }
      return null;
    });
    (useMutation as jest.Mock).mockReturnValue(mockCreateCategory);
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Rendering', () => {
    it('renders dialog with correct title', () => {
      render(<CreateCategoryDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create New Category')).toBeInTheDocument();
    });

    it('shows level selector with options', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      const levelSelect = screen.getByLabelText(/level/i);
      await user.click(levelSelect);

      expect(screen.getByRole('option', { name: /category/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /subcategory/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /type/i })).toBeInTheDocument();
    });

    it('shows parent selector when subcategory is selected', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      // Select subcategory level
      const levelSelect = screen.getByLabelText(/level/i);
      await user.click(levelSelect);
      await user.click(screen.getByRole('option', { name: /subcategory/i }));

      // Parent selector should appear
      expect(screen.getByLabelText(/parent category/i)).toBeInTheDocument();
    });

    it('hides parent selector for root level', () => {
      render(<CreateCategoryDialog {...defaultProps} />);

      // Default is root level, so no parent selector
      expect(screen.queryByLabelText(/parent category/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('auto-generates handle from name', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name \*/i);
      const handleInput = screen.getByLabelText(/handle/i);

      await user.type(nameInput, 'My New Category');
      
      expect(handleInput).toHaveValue('my-new-category');
    });

    it('validates required name field', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create category/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('allows optional description', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, 'This is a test category');

      expect(descriptionInput).toHaveValue('This is a test category');
    });

    it('filters parent categories based on selected level', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      // Select Type level (level 2)
      const levelSelect = screen.getByLabelText(/level/i);
      await user.click(levelSelect);
      await user.click(screen.getByRole('option', { name: /type/i }));

      // Open parent selector
      const parentSelect = screen.getByLabelText(/parent subcategory/i);
      await user.click(parentSelect);

      // Should only show subcategories (level 1)
      expect(screen.getByText('Computers')).toBeInTheDocument();
      expect(screen.queryByText('Electronics')).not.toBeInTheDocument(); // Level 0
    });
  });

  describe('Form Submission', () => {
    it('submits category with correct data', async () => {
      const user = userEvent.setup();
      mockCreateCategory.mockResolvedValueOnce({});
      
      render(<CreateCategoryDialog {...defaultProps} />);

      // Fill form
      await user.type(screen.getByLabelText(/name \*/i), 'New Category');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      
      // Submit
      const submitButton = screen.getByRole('button', { name: /create category/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith({
          organizationId: 'org_123',
          projectId: 'project_123',
          name: 'New Category',
          handle: 'new-category',
          description: 'Test description',
          parentId: undefined,
          properties: {},
          isActive: true,
        });
      });
    });

    it('submits subcategory with parent', async () => {
      const user = userEvent.setup();
      mockCreateCategory.mockResolvedValueOnce({});
      
      render(<CreateCategoryDialog {...defaultProps} />);

      // Select subcategory level
      const levelSelect = screen.getByLabelText(/level/i);
      await user.click(levelSelect);
      await user.click(screen.getByRole('option', { name: /subcategory/i }));

      // Select parent
      const parentSelect = screen.getByLabelText(/parent category/i);
      await user.click(parentSelect);
      await user.click(screen.getByText('Electronics'));

      // Fill name
      await user.type(screen.getByLabelText(/name \*/i), 'Laptops');

      // Submit
      await user.click(screen.getByRole('button', { name: /create category/i }));

      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Laptops',
          handle: 'laptops',
          parentId: 'cat_1',
        }));
      });
    });

    it('shows success message on creation', async () => {
      const user = userEvent.setup();
      mockCreateCategory.mockResolvedValueOnce({});
      
      render(<CreateCategoryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/name \*/i), 'Test Category');
      await user.click(screen.getByRole('button', { name: /create category/i }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Category created successfully');
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows error message on failure', async () => {
      const user = userEvent.setup();
      mockCreateCategory.mockRejectedValueOnce(new Error('Creation failed'));
      
      render(<CreateCategoryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/name \*/i), 'Test Category');
      await user.click(screen.getByRole('button', { name: /create category/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create category. Please try again.');
      });
    });

    it('disables submit button while creating', async () => {
      const user = userEvent.setup();
      mockCreateCategory.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<CreateCategoryDialog {...defaultProps} />);

      await user.type(screen.getByLabelText(/name \*/i), 'Test Category');
      const submitButton = screen.getByRole('button', { name: /create category/i });
      
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Creating...');
    });
  });

  describe('Custom Properties', () => {
    it('adds custom properties', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      // Expand custom properties section
      const propertiesButton = screen.getByRole('button', { name: /custom properties/i });
      await user.click(propertiesButton);

      // Add property
      const keyInput = screen.getByPlaceholderText(/property name/i);
      const valueInput = screen.getByPlaceholderText(/property value/i);
      
      await user.type(keyInput, 'color');
      await user.type(valueInput, 'blue');
      
      const addButton = screen.getByRole('button', { name: /add property/i });
      await user.click(addButton);

      // Property should be displayed
      expect(screen.getByText('color:')).toBeInTheDocument();
      expect(screen.getByText('blue')).toBeInTheDocument();
    });

    it('removes custom properties', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      // Add a property first
      const propertiesButton = screen.getByRole('button', { name: /custom properties/i });
      await user.click(propertiesButton);

      await user.type(screen.getByPlaceholderText(/property name/i), 'size');
      await user.type(screen.getByPlaceholderText(/property value/i), 'large');
      await user.click(screen.getByRole('button', { name: /add property/i }));

      // Remove property
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      expect(screen.queryByText('size:')).not.toBeInTheDocument();
    });

    it('includes properties in submission', async () => {
      const user = userEvent.setup();
      mockCreateCategory.mockResolvedValueOnce({});
      
      render(<CreateCategoryDialog {...defaultProps} />);

      // Add properties
      await user.click(screen.getByRole('button', { name: /custom properties/i }));
      await user.type(screen.getByPlaceholderText(/property name/i), 'material');
      await user.type(screen.getByPlaceholderText(/property value/i), 'cotton');
      await user.click(screen.getByRole('button', { name: /add property/i }));

      // Fill required fields
      await user.type(screen.getByLabelText(/name \*/i), 'Test Category');

      // Submit
      await user.click(screen.getByRole('button', { name: /create category/i }));

      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith(expect.objectContaining({
          properties: { material: 'cotton' },
        }));
      });
    });
  });

  describe('Dialog Management', () => {
    it('resets form when dialog closes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CreateCategoryDialog {...defaultProps} />);

      // Fill some fields
      await user.type(screen.getByLabelText(/name \*/i), 'Test Category');

      // Close and reopen
      rerender(<CreateCategoryDialog {...defaultProps} open={false} />);
      rerender(<CreateCategoryDialog {...defaultProps} open={true} />);

      // Fields should be empty
      expect(screen.getByLabelText(/name \*/i)).toHaveValue('');
    });

    it('calls onOpenChange when cancelled', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<CreateCategoryDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('focuses on first input when opened', async () => {
      render(<CreateCategoryDialog {...defaultProps} />);

      await waitFor(() => {
        const levelSelect = screen.getByLabelText(/level/i);
        expect(levelSelect).toHaveFocus();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CreateCategoryDialog {...defaultProps} />);

      // Tab through form elements
      await user.tab(); // Level select
      await user.tab(); // Name input
      await user.tab(); // Handle input
      await user.tab(); // Description
      
      expect(screen.getByLabelText(/description/i)).toHaveFocus();
    });
  });
});