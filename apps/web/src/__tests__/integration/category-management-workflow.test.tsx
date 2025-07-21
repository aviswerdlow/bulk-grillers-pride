import React from 'react';
import { render, screen, waitFor, within } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { setupTest, cleanupTest } from '@/__tests__/frontend-test-helpers';
import { toast } from 'sonner';
import { useQuery, useMutation } from 'convex/react';
import { CategorySelector } from '@/components/categories/category-selector';
import { CreateCategoryDialog } from '@/components/categories/create-category-dialog';
import { EditCategoryDialog } from '@/components/categories/edit-category-dialog';
import { Category } from '@/types/models';
import { Id } from '@convex/_generated/dataModel';

// Mock dependencies
jest.mock('sonner');
jest.mock('convex/react', () => ({
  ...jest.requireActual('convex/react'),
  useQuery: jest.fn(),
  useMutation: jest.fn(() => jest.fn()),
}));

const mockCategoryTree = [
  {
    _id: 'cat_electronics' as Id<'categories'>,
    name: 'Electronics',
    handle: 'electronics',
    level: 0,
    parentId: null,
    path: [],
    isActive: true,
    children: [
      {
        _id: 'cat_computers' as Id<'categories'>,
        name: 'Computers',
        handle: 'computers',
        level: 1,
        parentId: 'cat_electronics' as Id<'categories'>,
        path: ['cat_electronics'],
        isActive: true,
        children: [
          {
            _id: 'cat_laptops' as Id<'categories'>,
            name: 'Laptops',
            handle: 'laptops',
            level: 2,
            parentId: 'cat_computers' as Id<'categories'>,
            path: ['cat_electronics', 'cat_computers'],
            isActive: true,
            children: [],
          },
        ],
      },
      {
        _id: 'cat_audio' as Id<'categories'>,
        name: 'Audio',
        handle: 'audio',
        level: 1,
        parentId: 'cat_electronics' as Id<'categories'>,
        path: ['cat_electronics'],
        isActive: true,
        children: [],
      },
    ],
  },
  {
    _id: 'cat_home' as Id<'categories'>,
    name: 'Home & Garden',
    handle: 'home-garden',
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

describe('Category Management Workflow', () => {
  const mockCreateCategory = jest.fn();
  const mockUpdateCategory = jest.fn();
  const mockDeleteCategory = jest.fn();
  const mockAssignCategories = jest.fn();
  
  beforeEach(() => {
    setupTest();
    jest.clearAllMocks();
    
    (useQuery as jest.Mock).mockImplementation((query) => {
      if (query.name?.includes('getCategoryTree')) return mockCategoryTree;
      if (query.name?.includes('getCategoryLevels')) return mockLevelDefinitions;
      return null;
    });
    
    (useMutation as jest.Mock).mockImplementation((fn) => {
      if (fn.name?.includes('createCategory')) return mockCreateCategory;
      if (fn.name?.includes('updateCategory')) return mockUpdateCategory;
      if (fn.name?.includes('deleteCategory')) return mockDeleteCategory;
      if (fn.name?.includes('assignCategories')) return mockAssignCategories;
      return jest.fn();
    });

    // Mock successful responses
    mockCreateCategory.mockResolvedValue({ _id: 'new_category_123' });
    mockUpdateCategory.mockResolvedValue({});
    mockDeleteCategory.mockResolvedValue({});
    mockAssignCategories.mockResolvedValue({});
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Category Creation Workflow', () => {
    it('creates a root-level category', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      
      render(
        <CreateCategoryDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={'org_123' as Id<'organizations'>}
          projectId={'project_123' as Id<'projects'>}
          onSuccess={onSuccess}
        />
      );

      // Select root level (should be default)
      const levelSelect = screen.getByLabelText(/level/i);
      expect(levelSelect).toHaveValue('0');

      // Fill category details
      await user.type(screen.getByLabelText(/name/i), 'Outdoor Equipment');
      expect(screen.getByLabelText(/handle/i)).toHaveValue('outdoor-equipment');

      await user.type(
        screen.getByLabelText(/description/i),
        'Equipment for outdoor activities and sports'
      );

      // Add custom properties
      const propertiesButton = screen.getByRole('button', { name: /custom properties/i });
      await user.click(propertiesButton);

      await user.type(screen.getByPlaceholderText(/property name/i), 'season');
      await user.type(screen.getByPlaceholderText(/property value/i), 'all-season');
      await user.click(screen.getByRole('button', { name: /add property/i }));

      // Submit
      await user.click(screen.getByRole('button', { name: /create category/i }));

      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith({
          organizationId: 'org_123',
          projectId: 'project_123',
          name: 'Outdoor Equipment',
          handle: 'outdoor-equipment',
          description: 'Equipment for outdoor activities and sports',
          parentId: undefined,
          properties: { season: 'all-season' },
          isActive: true,
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Category created successfully');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('creates a subcategory with parent selection', async () => {
      const user = userEvent.setup();
      
      render(
        <CreateCategoryDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={'org_123' as Id<'organizations'>}
          projectId={'project_123' as Id<'projects'>}
        />
      );

      // Select subcategory level
      const levelSelect = screen.getByLabelText(/level/i);
      await user.selectOptions(levelSelect, '1');

      // Parent selector should appear
      const parentSelect = screen.getByLabelText(/parent category/i);
      await user.click(parentSelect);

      // Select Electronics as parent
      await user.click(screen.getByText('Electronics'));

      // Fill subcategory details
      await user.type(screen.getByLabelText(/name/i), 'Smart Home');

      // Submit
      await user.click(screen.getByRole('button', { name: /create category/i }));

      await waitFor(() => {
        expect(mockCreateCategory).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Smart Home',
            handle: 'smart-home',
            parentId: 'cat_electronics',
          })
        );
      });
    });

    it('validates category hierarchy constraints', async () => {
      const user = userEvent.setup();
      
      render(
        <CreateCategoryDialog
          open={true}
          onOpenChange={() => {}}
          organizationId={'org_123' as Id<'organizations'>}
          projectId={'project_123' as Id<'projects'>}
        />
      );

      // Try to create a level 3 category (beyond maxLevel)
      const levelSelect = screen.getByLabelText(/level/i);
      
      // Level 3 should not be available
      const options = within(levelSelect).getAllByRole('option');
      expect(options).toHaveLength(3); // Only 0, 1, 2
      expect(options.map(o => o.textContent)).toEqual([
        'Category',
        'Subcategory',
        'Type',
      ]);
    });
  });

  describe('Category Selection Workflow', () => {
    it('allows multiple category selection for products', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(
        <CategorySelector
          organizationId={'org_123' as Id<'organizations'>}
          projectId={'project_123' as Id<'projects'>}
          selectedCategories={[]}
          onChange={onChange}
          multiple={true}
        />
      );

      // Open category selector
      await user.click(screen.getByRole('button', { name: /select categories/i }));

      // Select multiple categories
      await user.click(screen.getByText('Electronics'));
      expect(onChange).toHaveBeenCalledWith(['cat_electronics']);

      await user.click(screen.getByText('Home & Garden'));
      expect(onChange).toHaveBeenCalledWith(['cat_electronics', 'cat_home']);

      // Deselect a category
      await user.click(screen.getByText('Electronics'));
      expect(onChange).toHaveBeenCalledWith(['cat_home']);
    });

    it('supports advanced category assignment dialog', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      
      render(
        <CategorySelector
          organizationId={'org_123' as Id<'organizations'>}
          projectId={'project_123' as Id<'projects'>}
          selectedCategories={[]}
          onChange={onChange}
        />
      );

      // Open selector
      await user.click(screen.getByRole('button', { name: /select categories/i }));

      // Open advanced assignment
      await user.click(screen.getByRole('button', { name: /advanced assignment/i }));

      // Should see categories organized by level
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Subcategory')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();

      // Check categories at each level
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Electronics')).toBeInTheDocument();
      expect(within(dialog).getByText('Computers')).toBeInTheDocument();
      expect(within(dialog).getByText('Laptops')).toBeInTheDocument();
    });

    it('filters categories by search term', async () => {
      const user = userEvent.setup();
      
      render(
        <CategorySelector
          organizationId={'org_123' as Id<'organizations'>}
          projectId={'project_123' as Id<'projects'>}
          selectedCategories={[]}
          onChange={() => {}}
        />
      );

      await user.click(screen.getByRole('button', { name: /select categories/i }));

      // Search for specific category
      const searchInput = screen.getByPlaceholderText(/search categories/i);
      await user.type(searchInput, 'audio');

      // Should only show matching categories
      expect(screen.getByText('Audio')).toBeInTheDocument();
      expect(screen.queryByText('Computers')).not.toBeInTheDocument();
      expect(screen.queryByText('Home & Garden')).not.toBeInTheDocument();
    });
  });

  describe('Category Editing Workflow', () => {
    it('edits existing category properties', async () => {
      const user = userEvent.setup();
      const category: Category = {
        _id: 'cat_electronics' as Id<'categories'>,
        _creationTime: Date.now(),
        organizationId: 'org_123' as Id<'organizations'>,
        projectId: 'project_123' as Id<'projects'>,
        name: 'Electronics',
        handle: 'electronics',
        description: 'Electronic products',
        level: 0,
        parentId: null,
        path: [],
        properties: { featured: 'true' },
        isActive: true,
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      render(
        <EditCategoryDialog
          open={true}
          onOpenChange={() => {}}
          category={category}
          onSuccess={() => {}}
        />
      );

      // Update name
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Electronics & Tech');

      // Update description
      const descInput = screen.getByLabelText(/description/i);
      await user.clear(descInput);
      await user.type(descInput, 'Electronic and technology products');

      // Toggle active status
      const activeToggle = screen.getByRole('checkbox', { name: /active/i });
      await user.click(activeToggle);

      // Update properties
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton); // Remove featured property

      // Add new property
      const propertiesButton = screen.getByRole('button', { name: /custom properties/i });
      await user.click(propertiesButton);
      
      await user.type(screen.getByPlaceholderText(/property name/i), 'department');
      await user.type(screen.getByPlaceholderText(/property value/i), 'tech');
      await user.click(screen.getByRole('button', { name: /add property/i }));

      // Submit
      await user.click(screen.getByRole('button', { name: /update category/i }));

      await waitFor(() => {
        expect(mockUpdateCategory).toHaveBeenCalledWith({
          categoryId: 'cat_electronics',
          updates: {
            name: 'Electronics & Tech',
            handle: 'electronics-tech',
            description: 'Electronic and technology products',
            properties: { department: 'tech' },
            isActive: false,
          },
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Category updated successfully');
    });

    it('prevents editing that would break hierarchy', async () => {
      const user = userEvent.setup();
      
      // Mock a category with children
      const parentCategory: Category = {
        _id: 'cat_electronics' as Id<'categories'>,
        _creationTime: Date.now(),
        organizationId: 'org_123' as Id<'organizations'>,
        projectId: 'project_123' as Id<'projects'>,
        name: 'Electronics',
        handle: 'electronics',
        level: 0,
        parentId: null,
        path: [],
        isActive: true,
        children: mockCategoryTree[0].children,
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      render(
        <EditCategoryDialog
          open={true}
          onOpenChange={() => {}}
          category={parentCategory}
          onSuccess={() => {}}
        />
      );

      // Try to deactivate category with active children
      const activeToggle = screen.getByRole('checkbox', { name: /active/i });
      await user.click(activeToggle);

      // Submit
      await user.click(screen.getByRole('button', { name: /update category/i }));

      // Should show warning about children
      await waitFor(() => {
        expect(screen.getByText(/has active subcategories/i)).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Category Operations', () => {
    it('assigns multiple categories to products in bulk', async () => {
      const user = userEvent.setup();
      const productIds = ['prod_1', 'prod_2', 'prod_3'];
      
      // Component that uses category assignment
      function BulkAssignment() {
        const [selectedCategories, setSelectedCategories] = React.useState<Id<'categories'>[]>([]);
        
        const handleAssign = async () => {
          await mockAssignCategories({
            productIds,
            categoryIds: selectedCategories,
          });
          toast.success('Categories assigned to products');
        };
        
        return (
          <div>
            <CategorySelector
              organizationId={"org_123" as Id<'organizations'>}
              projectId={"project_123" as Id<'projects'>}
              selectedCategories={selectedCategories}
              onChange={setSelectedCategories}
              multiple={true}
            />
            <button onClick={handleAssign}>Assign to Products</button>
          </div>
        );
      }
      
      render(<BulkAssignment />);

      // Select categories
      await user.click(screen.getByRole('button', { name: /select categories/i }));
      await user.click(screen.getByText('Electronics'));
      await user.click(screen.getByText('Computers'));
      
      // Close selector
      await user.keyboard('{Escape}');

      // Assign to products
      await user.click(screen.getByRole('button', { name: /assign to products/i }));

      await waitFor(() => {
        expect(mockAssignCategories).toHaveBeenCalledWith({
          productIds: ['prod_1', 'prod_2', 'prod_3'],
          categoryIds: ['cat_electronics', 'cat_computers'],
        });
        expect(toast.success).toHaveBeenCalledWith('Categories assigned to products');
      });
    });
  });

  describe('Category Navigation', () => {
    it('displays category breadcrumbs correctly', () => {
      // Component that shows category path
      function CategoryPath({ categoryId }: { categoryId: Id<'categories'> }) {
        const categoryTree = useQuery(api.functions.categories.categories.getCategoryTree, {
          organizationId: 'org_123' as Id<'organizations'>,
          projectId: 'project_123' as Id<'projects'>,
        });
        
        const findCategory = (
          categories: any[],
          id: string
        ): { category: any; path: string[] } | null => {
          for (const cat of categories) {
            if (cat._id === id) {
              return { category: cat, path: [] };
            }
            if (cat.children) {
              const found = findCategory(cat.children, id);
              if (found) {
                return {
                  category: found.category,
                  path: [cat.name, ...found.path],
                };
              }
            }
          }
          return null;
        };
        
        const result = categoryTree ? findCategory(categoryTree, categoryId) : null;
        
        if (!result) return null;
        
        return (
          <div>
            {result.path.length > 0 && (
              <span>{result.path.join(' > ')} &gt; </span>
            )}
            <strong>{result.category.name}</strong>
          </div>
        );
      }
      
      render(<CategoryPath categoryId={'cat_laptops' as Id<'categories'>} />);

      // Should show full path
      expect(screen.getByText(/Electronics > Computers >/)).toBeInTheDocument();
      expect(screen.getByText('Laptops')).toBeInTheDocument();
    });
  });
});