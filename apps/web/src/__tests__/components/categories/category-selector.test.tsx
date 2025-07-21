import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategorySelector } from '@/components/categories/category-selector';
import { render } from '../../test-utils';
import { useQuery } from 'convex/react';
import { Category } from '@/types/models';

// Mock the convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// Mock data
const mockCategories: Category[] = [
  {
    _id: 'cat1' as Id<'categories'>,
    name: 'Electronics',
    level: 1,
    path: '/electronics',
    organizationId: 'org1' as Id<'organizations'>,
    projectId: 'proj1' as Id<'projects'>,
    children: [
      {
        _id: 'cat2' as any,
        name: 'Computers',
        level: 2,
        path: '/electronics/computers',
        parentId: 'cat1' as Id<'categories'>,
        organizationId: 'org1' as Id<'organizations'>,
        projectId: 'proj1' as Id<'projects'>,
        children: [
          {
            _id: 'cat3' as any,
            name: 'Laptops',
            level: 3,
            path: '/electronics/computers/laptops',
            parentId: 'cat2' as Id<'categories'>,
            organizationId: 'org1' as Id<'organizations'>,
            projectId: 'proj1' as Id<'projects'>,
          },
        ],
      },
      {
        _id: 'cat4' as any,
        name: 'Phones',
        level: 2,
        path: '/electronics/phones',
        parentId: 'cat1' as Id<'categories'>,
        organizationId: 'org1' as Id<'organizations'>,
        projectId: 'proj1' as Id<'projects'>,
      },
    ],
  },
  {
    _id: 'cat5' as Id<'categories'>,
    name: 'Clothing',
    level: 1,
    path: '/clothing',
    organizationId: 'org1' as Id<'organizations'>,
    projectId: 'proj1' as Id<'projects'>,
  },
];

const mockLevelDefinitions = [
  {
    _id: 'level1' as any,
    organizationId: 'org1' as Id<'organizations'>,
    projectId: 'proj1' as Id<'categoryLevelDefinitions'>,
    level: 1,
    name: 'department',
    pluralName: 'departments',
    friendlyName: 'Department',
  },
  {
    _id: 'level2' as any,
    organizationId: 'org1' as Id<'organizations'>,
    projectId: 'proj1' as Id<'categoryLevelDefinitions'>,
    level: 2,
    name: 'category',
    pluralName: 'categories',
    friendlyName: 'Category',
  },
  {
    _id: 'level3' as any,
    organizationId: 'org1' as Id<'organizations'>,
    projectId: 'proj1' as Id<'categoryLevelDefinitions'>,
    level: 3,
    name: 'subcategory',
    pluralName: 'subcategories',
    friendlyName: 'Subcategory',
  },
];

describe('CategorySelector', () => {
  const defaultProps = {
    organizationId: 'org1' as Id<'organizations'>,
    projectId: 'proj1' as Id<'projects'>,
    selectedCategories: [],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    mockUseQuery.mockImplementation((query: any, _args: any) => {
      if (query && (query.toString().includes('getCategoryTree') || query._functionName?.includes('getCategoryTree'))) {
        return mockCategories;
      }
      if (query && (query.toString().includes('getCategoryLevels') || query._functionName?.includes('getCategoryLevels'))) {
        return mockLevelDefinitions;
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders loading state when data is not loaded', () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<CategorySelector {...defaultProps} />);

      expect(screen.getByText('Loading categories...')).toBeInTheDocument();
    });

    it('renders with default placeholder', () => {
      render(<CategorySelector {...defaultProps} />);

      expect(screen.getByText('Select categories...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<CategorySelector {...defaultProps} placeholder="Choose categories" />);

      expect(screen.getByText('Choose categories')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<CategorySelector {...defaultProps} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('displays category count', () => {
      render(<CategorySelector {...defaultProps} />);

      expect(screen.getByText('5 categories available across 3 levels')).toBeInTheDocument();
    });

    it('displays selected categories count', () => {
      render(
        <CategorySelector {...defaultProps} selectedCategories={['cat1' as any, 'cat2' as Id<'categories'>]} />
      );

      expect(screen.getByText('2 categories selected')).toBeInTheDocument();
    });

    it('displays single category count correctly', () => {
      render(<CategorySelector {...defaultProps} selectedCategories={['cat1' as Id<'categories'>]} />);

      expect(screen.getByText('1 category selected')).toBeInTheDocument();
    });
  });

  describe('selected categories display', () => {
    it('shows selected category badges', () => {
      render(
        <CategorySelector {...defaultProps} selectedCategories={['cat1' as any, 'cat4' as Id<'categories'>]} />
      );

      expect(screen.getByText('Department:')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Category:')).toBeInTheDocument();
      expect(screen.getByText('Phones')).toBeInTheDocument();
    });

    it('removes category when X is clicked', async () => {
      const onChange = jest.fn();
      render(
        <CategorySelector
          {...defaultProps}
          selectedCategories={['cat1' as any, 'cat4' as Id<'categories'>]}
          onChange={onChange}
        />
      );

      const badges = screen.getAllByRole('button', { name: '' });
      fireEvent.click(badges[0]);

      expect(onChange).toHaveBeenCalledWith(['cat4']);
    });
  });

  describe('popover interactions', () => {
    it('opens popover when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByPlaceholderText('Search categories...')).toBeInTheDocument();
    });

    it('closes popover when clicking outside', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByPlaceholderText('Search categories...')).toBeInTheDocument();

      await user.click(document.body);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search categories...')).not.toBeInTheDocument();
      });
    });

    it('shows all categories in popover', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Computers')).toBeInTheDocument();
      expect(screen.getByText('Laptops')).toBeInTheDocument();
      expect(screen.getByText('Phones')).toBeInTheDocument();
      expect(screen.getByText('Clothing')).toBeInTheDocument();
    });

    it('shows category paths', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(screen.getByText('electronics > computers')).toBeInTheDocument();
      expect(screen.getByText('electronics > computers > laptops')).toBeInTheDocument();
    });

    it('shows level badges for categories', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const departmentBadges = screen.getAllByText('Department');
      const categoryBadges = screen.getAllByText('Category');
      const subcategoryBadges = screen.getAllByText('Subcategory');

      expect(departmentBadges.length).toBeGreaterThan(0);
      expect(categoryBadges.length).toBeGreaterThan(0);
      expect(subcategoryBadges.length).toBeGreaterThan(0);
    });
  });

  describe('search functionality', () => {
    it('filters categories by name', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText('Search categories...');
      await user.type(searchInput, 'phone');

      expect(screen.getByText('Phones')).toBeInTheDocument();
      expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
      expect(screen.queryByText('Computers')).not.toBeInTheDocument();
    });

    it('filters categories by path', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText('Search categories...');
      await user.type(searchInput, 'computers');

      expect(screen.getByText('Computers')).toBeInTheDocument();
      expect(screen.getByText('Laptops')).toBeInTheDocument();
      expect(screen.queryByText('Phones')).not.toBeInTheDocument();
    });

    it('shows empty state when no matches', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText('Search categories...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No categories found.')).toBeInTheDocument();
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const searchInput = screen.getByPlaceholderText('Search categories...');
      await user.type(searchInput, 'ELECTRONICS');

      expect(screen.getByText('Electronics')).toBeInTheDocument();
    });
  });

  describe('selection behavior', () => {
    describe('multiple mode (default)', () => {
      it('selects category when clicked', async () => {
        const onChange = jest.fn();
        const user = userEvent.setup();
        render(<CategorySelector {...defaultProps} onChange={onChange} />);

        const trigger = screen.getByRole('combobox');
        await user.click(trigger);

        const electronicsOption = screen.getByRole('option', {
          name: /Department Electronics electronics/,
        });
        await user.click(electronicsOption);

        expect(onChange).toHaveBeenCalledWith(['cat1']);
      });

      it('deselects category when clicked again', async () => {
        const onChange = jest.fn();
        const user = userEvent.setup();
        render(
          <CategorySelector
            {...defaultProps}
            selectedCategories={['cat1' as Id<'categories'>]}
            onChange={onChange}
          />
        );

        const trigger = screen.getByRole('combobox');
        await user.click(trigger);

        const electronicsOption = screen.getByRole('option', {
          name: /Department Electronics electronics/,
        });
        await user.click(electronicsOption);

        expect(onChange).toHaveBeenCalledWith([]);
      });

      it('shows check marks for selected categories', async () => {
        const user = userEvent.setup();
        render(
          <CategorySelector {...defaultProps} selectedCategories={['cat1' as any, 'cat4' as Id<'categories'>]} />
        );

        const trigger = screen.getByRole('combobox');
        await user.click(trigger);

        const checkmarks = screen.getAllByTestId('check-icon');
        const visibleCheckmarks = checkmarks.filter((el) => !el.classList.contains('opacity-0'));

        expect(visibleCheckmarks).toHaveLength(2);
      });

      it('maintains multiple selections', async () => {
        const onChange = jest.fn();
        const user = userEvent.setup();
        render(
          <CategorySelector
            {...defaultProps}
            selectedCategories={['cat1' as Id<'categories'>]}
            onChange={onChange}
          />
        );

        const trigger = screen.getByRole('combobox');
        await user.click(trigger);

        const phonesOption = screen.getByRole('option', {
          name: /Category Phones electronics > phones/,
        });
        await user.click(phonesOption);

        expect(onChange).toHaveBeenCalledWith(['cat1', 'cat4']);
      });
    });

    describe('single mode', () => {
      it('replaces selection when new category is clicked', async () => {
        const onChange = jest.fn();
        const user = userEvent.setup();
        render(
          <CategorySelector
            {...defaultProps}
            multiple={false}
            selectedCategories={['cat1' as Id<'categories'>]}
            onChange={onChange}
          />
        );

        const trigger = screen.getByRole('combobox');
        await user.click(trigger);

        const phonesOption = screen.getByRole('option', {
          name: /Category Phones electronics > phones/,
        });
        await user.click(phonesOption);

        expect(onChange).toHaveBeenCalledWith(['cat4']);
      });

      it('closes popover after selection in single mode', async () => {
        const onChange = jest.fn();
        const user = userEvent.setup();
        render(<CategorySelector {...defaultProps} multiple={false} onChange={onChange} />);

        const trigger = screen.getByRole('combobox');
        await user.click(trigger);

        const electronicsOption = screen.getByRole('option', {
          name: /Department Electronics electronics/,
        });
        await user.click(electronicsOption);

        await waitFor(() => {
          expect(screen.queryByPlaceholderText('Search categories...')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('advanced assignment dialog', () => {
    it('opens dialog when Advanced Assignment is clicked', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const advancedButton = screen.getByRole('button', { name: /Advanced Assignment/ });
      await user.click(advancedButton);

      expect(screen.getByText('Advanced Category Assignment')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Assign categories across different hierarchy levels for precise categorization.'
        )
      ).toBeInTheDocument();
    });

    it('shows categories grouped by level', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const advancedButton = screen.getByRole('button', { name: /Advanced Assignment/ });
      await user.click(advancedButton);

      // Check level headers
      expect(screen.getByText('(2 available)')).toBeInTheDocument(); // Department level
      expect(screen.getByText('(2 available)')).toBeInTheDocument(); // Category level
      expect(screen.getByText('(1 available)')).toBeInTheDocument(); // Subcategory level
    });

    it('shows checkboxes for categories in dialog', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const advancedButton = screen.getByRole('button', { name: /Advanced Assignment/ });
      await user.click(advancedButton);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(5); // Total categories
    });

    it('shows selected count per level', async () => {
      const user = userEvent.setup();
      render(
        <CategorySelector {...defaultProps} selectedCategories={['cat1' as any, 'cat4' as Id<'categories'>]} />
      );

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const advancedButton = screen.getByRole('button', { name: /Advanced Assignment/ });
      await user.click(advancedButton);

      expect(screen.getByText('1 selected in Department')).toBeInTheDocument();
      expect(screen.getByText('1 selected in Category')).toBeInTheDocument();
    });

    it('toggles selection from dialog checkboxes', async () => {
      const onChange = jest.fn();
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} onChange={onChange} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const advancedButton = screen.getByRole('button', { name: /Advanced Assignment/ });
      await user.click(advancedButton);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Click first checkbox

      expect(onChange).toHaveBeenCalledWith(['cat1']);
    });

    it('closes dialog when Done is clicked', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const advancedButton = screen.getByRole('button', { name: /Advanced Assignment/ });
      await user.click(advancedButton);

      const doneButton = screen.getByRole('button', { name: 'Done' });
      await user.click(doneButton);

      await waitFor(() => {
        expect(screen.queryByText('Advanced Category Assignment')).not.toBeInTheDocument();
      });
    });

    it('shows empty state for levels without categories', async () => {
      // Mock empty level
      const modifiedLevels = [
        ...mockLevelDefinitions,
        {
          _id: 'level4' as any,
          organizationId: 'org1' as Id<'organizations'>,
          projectId: 'proj1' as Id<'projects'>,
          level: 4,
          name: 'brand',
          pluralName: 'brands',
          friendlyName: 'Brand',
        },
      ];

      mockUseQuery.mockImplementation((query: any, _args: any) => {
        if (query && (query.toString().includes('getCategoryTree') || query._functionName?.includes('getCategoryTree'))) {
          return mockCategories;
        }
        if (query && (query.toString().includes('getCategoryLevels') || query._functionName?.includes('getCategoryLevels'))) {
          return modifiedLevels;
        }
        return undefined;
      });

      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      const advancedButton = screen.getByRole('button', { name: /Advanced Assignment/ });
      await user.click(advancedButton);

      expect(screen.getByText('No categories at this level')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates aria-expanded when opened', async () => {
      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('has accessible labels for remove buttons', () => {
      render(<CategorySelector {...defaultProps} selectedCategories={['cat1' as Id<'categories'>]} />);

      // The X buttons should be accessible
      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.classList.contains('h-4'));
      expect(removeButtons).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('handles empty category tree', () => {
      mockUseQuery.mockImplementation((query: any, _args: any) => {
        if (query && (query.toString().includes('getCategoryTree') || query._functionName?.includes('getCategoryTree'))) {
          return [];
        }
        if (query && (query.toString().includes('getCategoryLevels') || query._functionName?.includes('getCategoryLevels'))) {
          return mockLevelDefinitions;
        }
        return undefined;
      });

      render(<CategorySelector {...defaultProps} />);

      expect(screen.getByText('0 categories available across 0 levels')).toBeInTheDocument();
    });

    it('handles missing level definitions', () => {
      mockUseQuery.mockImplementation((query: any, _args: any) => {
        if (query && (query.toString().includes('getCategoryTree') || query._functionName?.includes('getCategoryTree'))) {
          return mockCategories;
        }
        if (query && (query.toString().includes('getCategoryLevels') || query._functionName?.includes('getCategoryLevels'))) {
          return [];
        }
        return undefined;
      });

      render(<CategorySelector {...defaultProps} />);

      // Should still render and use fallback level names
      expect(screen.getByText('Select categories...')).toBeInTheDocument();
    });

    it('handles categories with missing level definitions gracefully', async () => {
      mockUseQuery.mockImplementation((query: any, _args: any) => {
        if (query && (query.toString().includes('getCategoryTree') || query._functionName?.includes('getCategoryTree'))) {
          return mockCategories;
        }
        if (query && (query.toString().includes('getCategoryLevels') || query._functionName?.includes('getCategoryLevels'))) {
          return [mockLevelDefinitions[0]]; // Only level 1 defined
        }
        return undefined;
      });

      const user = userEvent.setup();
      render(<CategorySelector {...defaultProps} />);

      const trigger = screen.getByRole('combobox');
      await user.click(trigger);

      // Should show fallback for undefined levels
      expect(screen.getByText('Level 2')).toBeInTheDocument();
      expect(screen.getByText('Level 3')).toBeInTheDocument();
    });

    it('handles selection of non-existent categories gracefully', () => {
      render(<CategorySelector {...defaultProps} selectedCategories={['nonexistent' as Id<'categories'>]} />);

      // Should not crash and show placeholder
      expect(screen.getByText('1 category selected')).toBeInTheDocument();
    });
  });
});
