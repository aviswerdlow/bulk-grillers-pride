import React from 'react';

import userEvent from '@testing-library/user-event';
import { cleanupTest, mockUseMutation, render, screen, setupTest, waitFor, renderWithProviders } from '@/__tests__/test-helpers';
import { EditCategoryDialog } from '../edit-category-dialog';
import { Category } from '@/types/models';
import { Id } from '@convex/_generated/dataModel';
import { toast } from 'sonner';
;

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('EditCategoryDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOnOpenChange = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockUpdateCategory = jest.fn();
  
  const mockCategory: Category = {
    _id: 'cat_123' as Id<'categories'>,
    _creationTime: Date.now(),
    organizationId: 'org_123' as Id<'organizations'>,
    projectId: 'project_123' as Id<'projects'>,
    name: 'Original Category',
    handle: 'original-category',
    description: 'Original description',
    level: 0,
    parentId: undefined,
    path: '',
    properties: { color: 'red', size: 'large' },
    isActive: true,
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    category: mockCategory,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    setupTest();
    jest.clearAllMocks();
    mockUseMutation.mockReturnValue(mockUpdateCategory);
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Rendering', () => {
    it('renders dialog with correct title', () => {
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit Category')).toBeInTheDocument();
    });

    it('pre-fills form with category data', () => {
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      expect(screen.getByLabelText(/name \*/i)).toHaveValue('Original Category');
      expect(screen.getByLabelText(/handle/i)).toHaveValue('original-category');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Original description');
    });

    it('shows active status toggle', () => {
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const activeToggle = screen.getByRole('checkbox', { name: /active/i });
      expect(activeToggle).toBeChecked();
    });

    it('displays existing custom properties', () => {
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      // Expand properties section
      const propertiesSection = screen.getByText(/custom properties/i);
      expect(propertiesSection).toBeInTheDocument();

      // Check properties are displayed
      expect(screen.getByText('color:')).toBeInTheDocument();
      expect(screen.getByText('red')).toBeInTheDocument();
      expect(screen.getByText('size:')).toBeInTheDocument();
      expect(screen.getByText('large')).toBeInTheDocument();
    });

    it('handles category without properties', () => {
      const categoryWithoutProps = { ...mockCategory, properties: {} };
      renderWithProviders(<EditCategoryDialog {...defaultProps} category={categoryWithoutProps} />);

      expect(screen.getByText(/no custom properties/i)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates handle when name changes and synchronized', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name \*/i);
      const handleInput = screen.getByLabelText(/handle/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Category');

      expect(handleInput).toHaveValue('updated-category');
    });

    it('does not update handle if manually edited', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const handleInput = screen.getByLabelText(/handle/i);
      
      // Manually edit handle
      await user.clear(handleInput);
      await user.type(handleInput, 'custom-handle');

      // Change name
      const nameInput = screen.getByLabelText(/name \*/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      // Handle should remain custom
      expect(handleInput).toHaveValue('custom-handle');
    });

    it('toggles active status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const activeToggle = screen.getByRole('checkbox', { name: /active/i });
      await user.click(activeToggle);

      expect(activeToggle).not.toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('submits updated data correctly', async () => {
      const user = userEvent.setup();
      mockUpdateCategory.mockResolvedValueOnce({});
      
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      // Update fields
      const nameInput = screen.getByLabelText(/name \*/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Category');

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');

      // Submit
      const submitButton = screen.getByRole('button', { name: /update category/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateCategory).toHaveBeenCalledWith({
          categoryId: 'cat_123',
          updates: {
            name: 'Updated Category',
            handle: 'updated-category',
            description: 'Updated description',
            properties: { color: 'red', size: 'large' },
            isActive: true,
          },
        });
      });
    });

    it('shows success message after update', async () => {
      const user = userEvent.setup();
      mockUpdateCategory.mockResolvedValueOnce({});
      
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /update category/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Category updated successfully');
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows error message on failure', async () => {
      const user = userEvent.setup();
      mockUpdateCategory.mockRejectedValueOnce(new Error('Update failed'));
      
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /update category/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update category. Please try again.');
      });
    });

    it('disables submit button while updating', async () => {
      const user = userEvent.setup();
      mockUpdateCategory.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /update category/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Updating...');
    });
  });

  describe('Custom Properties Management', () => {
    it('adds new properties', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      // Expand properties if needed
      const propertiesButton = screen.getByRole('button', { name: /custom properties/i });
      await user.click(propertiesButton);

      // Add new property
      const keyInput = screen.getByPlaceholderText(/property name/i);
      const valueInput = screen.getByPlaceholderText(/property value/i);
      
      await user.type(keyInput, 'material');
      await user.type(valueInput, 'cotton');
      
      const addButton = screen.getByRole('button', { name: /add property/i });
      await user.click(addButton);

      // New property should be displayed
      expect(screen.getByText('material:')).toBeInTheDocument();
      expect(screen.getByText('cotton')).toBeInTheDocument();
    });

    it('removes existing properties', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      // Remove color property
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]); // First property

      expect(screen.queryByText('color:')).not.toBeInTheDocument();
      expect(screen.getByText('size:')).toBeInTheDocument(); // Other property remains
    });

    it('updates property values in submission', async () => {
      const user = userEvent.setup();
      mockUpdateCategory.mockResolvedValueOnce({});
      
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      // Remove one property and add another
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]); // Remove color

      // Add new property
      await user.click(screen.getByRole('button', { name: /custom properties/i }));
      await user.type(screen.getByPlaceholderText(/property name/i), 'weight');
      await user.type(screen.getByPlaceholderText(/property value/i), 'heavy');
      await user.click(screen.getByRole('button', { name: /add property/i }));

      // Submit
      await user.click(screen.getByRole('button', { name: /update category/i }));

      await waitFor(() => {
        expect(mockUpdateCategory).toHaveBeenCalledWith(expect.objectContaining({
          updates: expect.objectContaining({
            properties: { size: 'large', weight: 'heavy' }, // color removed, weight added
          }),
        }));
      });
    });
  });

  describe('Validation', () => {
    it('validates required name field', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name \*/i);
      await user.clear(nameInput);

      const submitButton = screen.getByRole('button', { name: /update category/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('allows empty description', async () => {
      const user = userEvent.setup();
      mockUpdateCategory.mockResolvedValueOnce({});
      
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.clear(descriptionInput);

      const submitButton = screen.getByRole('button', { name: /update category/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateCategory).toHaveBeenCalledWith(expect.objectContaining({
          updates: expect.objectContaining({
            description: '',
          }),
        }));
      });
    });
  });

  describe('Dialog Management', () => {
    it('handles null category gracefully', () => {
      renderWithProviders(<EditCategoryDialog {...defaultProps} category={null} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('resets form when dialog reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      // Make changes
      const nameInput = screen.getByLabelText(/name \*/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Changed Name');

      // Close and reopen
      rerender(<EditCategoryDialog {...defaultProps} open={false} />)
      rerender(<EditCategoryDialog {...defaultProps} open={true} />)

      // Original data should be restored
      expect(screen.getByLabelText(/name \*/i)).toHaveValue('Original Category');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('manages focus correctly', async () => {
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name \*/i);
        expect(nameInput).toHaveFocus();
      });
    });

    it('announces form errors', async () => {
      const user = userEvent.setup();
      renderWithProviders(<EditCategoryDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/name \*/i);
      await user.clear(nameInput);

      const submitButton = screen.getByRole('button', { name: /update category/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Name is required');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });
});