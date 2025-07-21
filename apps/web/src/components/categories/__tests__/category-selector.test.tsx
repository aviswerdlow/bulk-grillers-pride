import React from 'react';
import { render, screen, within } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { CategorySelector } from '../category-selector';
import { setupTest, cleanupTest } from '@/__tests__/frontend-test-helpers';
import { useQuery } from 'convex/react';
import { Category } from '@/types/models';
import { Id } from '@convex/_generated/dataModel';

// Mock Convex
jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useQuery: jest.fn(),
}));

const mockCategories: Category[] = [
  {
    _id: 'cat_1' as Id<'categories'>,
    _creationTime: Date.now(),
    organizationId: 'org_123' as Id<'organizations'>,
    projectId: 'project_123' as Id<'projects'>,
    name: 'Electronics',
    handle: 'electronics',
    level: 0,
    parentId: null,
    path: [],
    description: 'Electronic products',
    properties: {},
    isActive: true,
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children: [
      {
        _id: 'cat_2' as Id<'categories'>,
        _creationTime: Date.now(),
        organizationId: 'org_123' as Id<'organizations'>,
        projectId: 'project_123' as Id<'projects'>,
        name: 'Computers',
        handle: 'computers',
        level: 1,
        parentId: 'cat_1' as Id<'categories'>,
        path: ['cat_1'],
        description: 'Computer products',
        properties: {},
        isActive: true,
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [],
      },
      {
        _id: 'cat_3' as Id<'categories'>,
        _creationTime: Date.now(),
        organizationId: 'org_123' as Id<'organizations'>,
        projectId: 'project_123' as Id<'projects'>,
        name: 'Audio',
        handle: 'audio',
        level: 1,
        parentId: 'cat_1' as Id<'categories'>,
        path: ['cat_1'],
        description: 'Audio equipment',
        properties: {},
        isActive: true,
        order: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        children: [],
      },
    ],
  },
  {
    _id: 'cat_4' as Id<'categories'>,
    _creationTime: Date.now(),
    organizationId: 'org_123' as Id<'organizations'>,
    projectId: 'project_123' as Id<'projects'>,
    name: 'Clothing',
    handle: 'clothing',
    level: 0,
    parentId: null,
    path: [],
    description: 'Clothing and apparel',
    properties: {},
    isActive: true,
    order: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    children: [],
  },
];

const mockLevelDefinitions = [
  { level: 0, name: 'Category', pluralName: 'Categories' },
  { level: 1, name: 'Subcategory', pluralName: 'Subcategories' },
];

describe('CategorySelector', () => {
  const mockOnChange = jest.fn();
  
  const defaultProps = {
    organizationId: 'org_123' as Id<'organizations'>,
    projectId: 'project_123' as Id<'projects'>,
    selectedCategories: [] as Id<'categories'>[],
    onChange: mockOnChange,
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
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Rendering', () => {
    it('renders with placeholder text', () => {
      render(<CategorySelector {...defaultProps} />);
      
      expect(screen.getByText('Select categories...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<CategorySelector {...defaultProps} placeholder="Choose categories" />);
      
      expect(screen.getByText('Choose categories')).toBeInTheDocument();
    });

    it('shows loading state when data is not available', () => {
      (useQuery as jest.Mock).mockReturnValue(null);
      
      render(<CategorySelector {...defaultProps} />);
      
      expect(screen.getByText('Loading categories...')).toBeInTheDocument();
    });

    it('displays selected categories as badges', () => {
      render(
        <CategorySelector 
          {...defaultProps} 
          selectedCategories={['cat_1', 'cat_3'] as Id<'categories'>[]} 
        />
      );
      
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <CategorySelector {...defaultProps} className="custom-selector" />
      );
      
      const button = container.querySelector('button');
      expect(button).toHaveClass('custom-selector');
    });
  });

  describe('Dropdown Interactions', () => {
    it('opens dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button', { name: /select categories/i });
      await user.click(trigger);
      
      expect(screen.getByPlaceholderText(/search categories/i)).toBeInTheDocument();
    });

    it('shows all categories in dropdown', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Computers')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
      expect(screen.getByText('Clothing')).toBeInTheDocument();
    });

    it('shows category hierarchy with indentation', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      
      const computersItem = screen.getByText('Computers').closest('[role="option"]');
      expect(computersItem).toHaveClass('pl-8'); // Indented for subcategory
    });

    it('filters categories based on search', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      
      const searchInput = screen.getByPlaceholderText(/search categories/i);
      await user.type(searchInput, 'audio');
      
      expect(screen.getByText('Audio')).toBeInTheDocument();
      expect(screen.queryByText('Computers')).not.toBeInTheDocument();
      expect(screen.queryByText('Clothing')).not.toBeInTheDocument();
    });
  });

  describe('Selection Behavior', () => {
    it('selects category in multiple mode', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} multiple={true} />);
      
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      await user.click(screen.getByText('Electronics'));
      
      expect(mockOnChange).toHaveBeenCalledWith(['cat_1']);
    });

    it('adds to existing selection in multiple mode', async () => {
      const user = userEvent.setup();
      render(
        <CategorySelector 
          {...defaultProps} 
          multiple={true}
          selectedCategories={['cat_1'] as Id<'categories'>[]} 
        />
      );
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Clothing'));
      
      expect(mockOnChange).toHaveBeenCalledWith(['cat_1', 'cat_4']);
    });

    it('replaces selection in single mode', async () => {
      const user = userEvent.setup();
      render(
        <CategorySelector 
          {...defaultProps} 
          multiple={false}
          selectedCategories={['cat_1'] as Id<'categories'>[]} 
        />
      );
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Clothing'));
      
      expect(mockOnChange).toHaveBeenCalledWith(['cat_4']);
    });

    it('deselects category when clicked again', async () => {
      const user = userEvent.setup();
      render(
        <CategorySelector 
          {...defaultProps}
          selectedCategories={['cat_1'] as Id<'categories'>[]} 
        />
      );
      
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('Electronics'));
      
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('shows check marks for selected categories', async () => {
      const user = userEvent.setup();
      render(
        <CategorySelector 
          {...defaultProps}
          selectedCategories={['cat_1', 'cat_3'] as Id<'categories'>[]} 
        />
      );
      
      await user.click(screen.getByRole('button'));
      
      const electronicsItem = screen.getByText('Electronics').closest('[role="option"]');
      const audioItem = screen.getByText('Audio').closest('[role="option"]');
      
      expect(within(electronicsItem!).getByTestId('check-icon')).toBeInTheDocument();
      expect(within(audioItem!).getByTestId('check-icon')).toBeInTheDocument();
    });
  });

  describe('Badge Management', () => {
    it('removes category when X is clicked on badge', async () => {
      const user = userEvent.setup();
      render(
        <CategorySelector 
          {...defaultProps}
          selectedCategories={['cat_1', 'cat_3'] as Id<'categories'>[]} 
        />
      );
      
      const electronicsBadge = screen.getByText('Electronics').closest('.badge');
      const removeButton = within(electronicsBadge!).getByRole('button');
      
      await user.click(removeButton);
      
      expect(mockOnChange).toHaveBeenCalledWith(['cat_3']);
    });

    it('shows category count when many selected', () => {
      const manyCategories = ['cat_1', 'cat_2', 'cat_3', 'cat_4'] as Id<'categories'>[];
      render(
        <CategorySelector 
          {...defaultProps}
          selectedCategories={manyCategories} 
        />
      );
      
      // Should show first few categories and a count
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('+3 more')).toBeInTheDocument();
    });
  });

  describe('Assignment Dialog', () => {
    it('opens assignment dialog when button is clicked', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      await user.click(screen.getByRole('button', { name: /assign all/i }));
      
      expect(screen.getByText('Bulk Category Assignment')).toBeInTheDocument();
    });

    it('shows selected categories in assignment dialog', async () => {
      const user = userEvent.setup();
      render(
        <CategorySelector 
          {...defaultProps}
          selectedCategories={['cat_1'] as Id<'categories'>[]} 
        />
      );
      
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      await user.click(screen.getByRole('button', { name: /assign all/i }));
      
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('1 category selected')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<CategorySelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button', { name: /select categories/i });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);
      
      // Open with Enter
      const trigger = screen.getByRole('button', { name: /select categories/i });
      trigger.focus();
      await user.keyboard('{Enter}');
      
      expect(screen.getByPlaceholderText(/search categories/i)).toBeInTheDocument();
      
      // Navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('announces selected categories', () => {
      render(
        <CategorySelector 
          {...defaultProps}
          selectedCategories={['cat_1'] as Id<'categories'>[]} 
        />
      );
      
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-label', expect.stringContaining('1 selected'));
    });

    it('closes dropdown with Escape', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      expect(screen.getByPlaceholderText(/search categories/i)).toBeInTheDocument();
      
      await user.keyboard('{Escape}');
      expect(screen.queryByPlaceholderText(/search categories/i)).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('shows empty message when no categories exist', async () => {
      (useQuery as jest.Mock).mockImplementation((query) => {
        if (query.name?.includes('getCategoryTree')) {
          return [];
        }
        if (query.name?.includes('getCategoryLevels')) {
          return mockLevelDefinitions;
        }
        return null;
      });
      
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      
      expect(screen.getByText('No categories found.')).toBeInTheDocument();
    });

    it('shows no results message when search yields nothing', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      
      const searchInput = screen.getByPlaceholderText(/search categories/i);
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No categories found.')).toBeInTheDocument();
    });
  });
});