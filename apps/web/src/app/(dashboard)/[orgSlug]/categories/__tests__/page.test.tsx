import { render, screen, fireEvent } from '@/__tests__/test-utils';
import CategoriesPage from '../page';
import { mockUseQuery } from '@/__tests__/test-utils';
import { useParams } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock the dialogs
jest.mock('@/components/categories/create-category-dialog', () => ({
  CreateCategoryDialog: ({ open, onOpenChange }: any) => 
    open ? (
      <div data-testid="create-category-dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

jest.mock('@/components/categories/edit-category-dialog', () => ({
  EditCategoryDialog: ({ open, onOpenChange, category }: any) => 
    open ? (
      <div data-testid="edit-category-dialog">
        <div data-testid="editing-category">{category.name}</div>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

describe('CategoriesPage', () => {
  const mockOrganization = {
    _id: 'org_123' as any,
    name: 'Test Organization',
    slug: 'test-org',
  };

  const mockProject = {
    _id: 'proj_123' as any,
    name: 'Test Project',
    organizationId: 'org_123' as any,
  };

  const mockCategory = {
    _id: 'cat_123',
    name: 'Electronics',
    handle: 'electronics',
    level: 0,
    children: [
      {
        _id: 'cat_124',
        name: 'Computers',
        handle: 'computers',
        level: 1,
        parentId: 'cat_123',
        children: [],
        status: 'active' as const,
        isVisible: true,
        updatedAt: Date.now(),
      }
    ],
    status: 'active' as const,
    isVisible: true,
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ orgSlug: 'test-org' });
  });

  it('renders loading state while fetching data', () => {
    mockUseQuery.mockReturnValue(undefined);
    
    render(<CategoriesPage />);
    
    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
  });

  it('renders error when organization not found', () => {
    mockUseQuery
      .mockReturnValueOnce(null) // organization query
      .mockReturnValueOnce([]); // projects query
    
    render(<CategoriesPage />);
    
    expect(screen.getByText('Organization not found')).toBeInTheDocument();
  });

  it('renders error when no projects found', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization) // organization query
      .mockReturnValueOnce([]); // projects query
    
    render(<CategoriesPage />);
    
    expect(screen.getByText('No Projects Found')).toBeInTheDocument();
    expect(screen.getByText('Create a project first to manage categories')).toBeInTheDocument();
  });

  it('renders categories page with empty state', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization) // organization query
      .mockReturnValueOnce([mockProject]) // projects query
      .mockReturnValueOnce([]); // categories query
    
    render(<CategoriesPage />);
    
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByText('No categories yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first category')).toBeInTheDocument();
  });

  it('renders categories page with data', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization) // organization query
      .mockReturnValueOnce([mockProject]) // projects query
      .mockReturnValueOnce([mockCategory]); // categories query
    
    render(<CategoriesPage />);
    
    // Check header
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
    
    // Check stats cards
    expect(screen.getByText('Total Categories')).toBeInTheDocument();
    expect(screen.getAllByText('2')[0]).toBeInTheDocument(); // Total: Electronics + Computers
    
    expect(screen.getByText('Root Categories')).toBeInTheDocument();
    expect(screen.getAllByText('1')[0]).toBeInTheDocument(); // Only Electronics is root
    
    expect(screen.getByText('Max Depth')).toBeInTheDocument();
    expect(screen.getAllByText('2')[1]).toBeInTheDocument(); // Level 0 and 1 = depth 2
    
    // Check categories in tree
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('electronics')).toBeInTheDocument();
    expect(screen.getByText('Computers')).toBeInTheDocument();
    expect(screen.getByText('computers')).toBeInTheDocument();
  });

  it('filters categories based on search term', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([mockCategory]);
    
    render(<CategoriesPage />);
    
    const searchInput = screen.getByPlaceholderText('Search categories...');
    
    // Search for "comp"
    fireEvent.change(searchInput, { target: { value: 'comp' } });
    
    // Should only show Computers
    expect(screen.getByText('Computers')).toBeInTheDocument();
    expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    
    // Should show all categories again
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Computers')).toBeInTheDocument();
  });

  it('opens create category dialog when clicking add category button', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([]);
    
    render(<CategoriesPage />);
    
    const addButton = screen.getAllByRole('button', { name: /Add Category/i })[0];
    fireEvent.click(addButton);
    
    expect(screen.getByTestId('create-category-dialog')).toBeInTheDocument();
  });

  it('shows active count correctly', () => {
    const categories = [
      { ...mockCategory, status: 'active' as const },
      { 
        ...mockCategory, 
        _id: 'cat_125', 
        name: 'Hidden Category',
        handle: 'hidden-category',
        status: 'hidden' as const,
        children: []
      }
    ];
    
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce(categories);
    
    render(<CategoriesPage />);
    
    // Check active count (Electronics + Computers = 2 active)
    const activeCard = screen.getByText('Active').closest('.space-y-0')?.nextElementSibling;
    expect(activeCard?.textContent).toBe('2');
  });

  it('opens dropdown menu for category actions', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([mockCategory]);
    
    render(<CategoriesPage />);
    
    // Find the dropdown button for Electronics category
    const dropdownButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg.lucide-more-horizontal')
    );
    
    fireEvent.click(dropdownButtons[0]);
    
    expect(screen.getByText('Add Subcategory')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('opens edit dialog when clicking edit in dropdown', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([mockCategory]);
    
    render(<CategoriesPage />);
    
    // Open dropdown
    const dropdownButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg.lucide-more-horizontal')
    );
    fireEvent.click(dropdownButtons[0]);
    
    // Click Edit
    fireEvent.click(screen.getByText('Edit'));
    
    expect(screen.getByTestId('edit-category-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('editing-category')).toHaveTextContent('Electronics');
  });

  it('handles search with no results', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([mockCategory]);
    
    render(<CategoriesPage />);
    
    const searchInput = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No categories found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
  });

  it('displays nested categories with proper indentation', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([mockCategory]);
    
    const { container } = render(<CategoriesPage />);
    
    // Check that nested category has indentation
    const computersCategoryRow = screen.getByText('Computers').closest('.flex');
    expect(computersCategoryRow).toHaveStyle('padding-left: 20px');
    
    // Check that root category has no indentation
    const electronicsCategoryRow = screen.getByText('Electronics').closest('.flex');
    expect(electronicsCategoryRow).toHaveStyle('padding-left: 0px');
  });

  it('displays category status badges', () => {
    mockUseQuery
      .mockReturnValueOnce(mockOrganization)
      .mockReturnValueOnce([mockProject])
      .mockReturnValueOnce([mockCategory]);
    
    render(<CategoriesPage />);
    
    // Should show active badges for both categories
    const activeBadges = screen.getAllByText('active');
    expect(activeBadges).toHaveLength(2); // Electronics and Computers
  });
});