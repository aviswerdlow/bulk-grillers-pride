import React from 'react';
import { fireEvent, mockUseQuery, render, screen, renderWithProviders } from '@/__tests__/test-helpers';
import { useParams } from 'next/navigation';
import CategoriesPage from '../page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock the dialogs
jest.mock('@/components/categories/create-category-dialog', () => ({
  CreateCategoryDialog: ({ open, onOpenChange }: any) => 
    open ? (
      <div data-testid="create-category-dialog">
        <button onClick={() => (onOpenChange as any)(false)}>Close</button>
      </div>
    ) : null,
}));

jest.mock('@/components/categories/edit-category-dialog', () => ({
  EditCategoryDialog: ({ open, onOpenChange, category }: any) => 
    open ? (
      <div data-testid="edit-category-dialog">
        <div data-testid="editing-category">{(category as any).name}</div>
        <button onClick={() => (onOpenChange as any)(false)}>Close</button>
      </div>
    ) : null,
}));

// Mock loading component
jest.mock('@/components/loading', () => ({
  Loading: ({ size, text }: { size?: string; text?: string }) => 
    <div data-testid="loading" data-size={size}>{text || 'Loading...'}</div>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Plus: () => <div>Plus Icon</div>,
  ChevronRight: () => <div>ChevronRight Icon</div>,
  ChevronDown: () => <div>ChevronDown Icon</div>,
  Eye: () => <div>Eye Icon</div>,
  EyeOff: () => <div>EyeOff Icon</div>,
  Edit: () => <div>Edit Icon</div>,
  Trash: () => <div>Trash Icon</div>,
  Trash2: () => <div>Trash2 Icon</div>,
  Search: () => <div>Search Icon</div>,
  FolderTree: () => <div>FolderTree Icon</div>,
  MoreHorizontal: () => <div>MoreHorizontal Icon</div>,
  FolderPlus: () => <div>FolderPlus Icon</div>,
}));

describe('CategoriesPage', () => {
  const mockOrganization = {
    _id: 'org_123',
    _creationTime: Date.now(),
    name: 'Test Organization',
    slug: 'test-org',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockProject = {
    _id: 'proj_123',
    _creationTime: Date.now(),
    name: 'Test Project',
    organizationId: 'org_123',
  };

  const mockCategory = {
    _id: 'cat_123',
    _creationTime: Date.now(),
    name: 'Electronics',
    handle: 'electronics',
    level: 0,
    children: [
      {
        _id: 'cat_124',
        _creationTime: Date.now(),
        name: 'Computers',
        handle: 'computers',
        level: 1,
        parentId: 'cat_123',
        children: [] as Category[],
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
    
    renderWithProviders(<CategoriesPage />);
    
    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
  });

  it('renders error when organization not found', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return null; // organization query
      if (callCount === 2) return []; // projects query
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    expect(screen.getByText('Organization not found')).toBeInTheDocument();
  });

  it('renders error when no projects found', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization; // organization query
      if (callCount === 2) return []; // projects query
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    expect(screen.getByText('No Projects Found')).toBeInTheDocument();
    expect(screen.getByText('Create a project first to manage categories')).toBeInTheDocument();
  });

  it('renders categories page with empty state', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization; // organization query
      if (callCount === 2) return [mockProject]; // projects query
      if (callCount === 3) return []; // categories query
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByText('No categories yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first category')).toBeInTheDocument();
  });

  it('renders categories page with data', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization; // organization query
      if (callCount === 2) return [mockProject]; // projects query
      if (callCount === 3) return [mockCategory]; // categories query
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
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
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [mockCategory];
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    const searchInput = screen.getByPlaceholderText('Search categories...');
    
    // Search for "comp"
    fireEvent.change(searchInput, { target: { value: 'comp'  } } as any);
    
    // Should only show Computers
    expect(screen.getByText('Computers')).toBeInTheDocument();
    expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: ''  } } as any);
    
    // Should show all categories again
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Computers')).toBeInTheDocument();
  });

  it('opens create category dialog when clicking add category button', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [];
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    const addButton = screen.getAllByRole('button', { name: /Add Category/i })[0];
    if (addButton) {
      fireEvent.click(addButton as HTMLElement);
    }
    
    expect(screen.getByTestId('create-category-dialog')).toBeInTheDocument();
  });

  it('shows active count correctly', () => {
    const categories = [
      { ...mockCategory, status: 'active' as const },
      { 
        ...mockCategory, 
        _id: 'cat_125', 
        _creationTime: Date.now(),
        name: 'Hidden Category',
        handle: 'hidden-category',
        status: 'hidden' as const,
        children: []
      }
    ];
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return categories;
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    // Check active count (Electronics + Computers = 2 active)
    const activeCard = screen.getByText('Active').closest('.space-y-0')?.nextElementSibling;
    expect(activeCard?.textContent).toBe('2');
  });

  it('opens dropdown menu for category actions', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [mockCategory];
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    // Find the dropdown button for Electronics category
    const dropdownButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg.lucide-more-horizontal')
    );
    
    if (dropdownButtons[0]) {
      fireEvent.click(dropdownButtons[0] as HTMLElement);
    }
    
    expect(screen.getByText('Add Subcategory')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('opens edit dialog when clicking edit in dropdown', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [mockCategory];
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    // Open dropdown
    const dropdownButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg.lucide-more-horizontal')
    );
    if (dropdownButtons[0]) {
      fireEvent.click(dropdownButtons[0] as HTMLElement);
    }
    
    // Click Edit
    fireEvent.click(screen.getByText('Edit'));
    
    expect(screen.getByTestId('edit-category-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('editing-category')).toHaveTextContent('Electronics');
  });

  it('handles search with no results', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [mockCategory];
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    const searchInput = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent'  } } as any);
    
    expect(screen.getByText('No categories found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search')).toBeInTheDocument();
  });

  it('displays nested categories with proper indentation', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [mockCategory];
      return undefined;
    }) as any);
    
    const { } = renderWithProviders(<CategoriesPage />);
    
    // Check that nested category has indentation
    const computersCategoryRow = screen.getByText('Computers').closest('.flex');
    expect(computersCategoryRow).toHaveStyle('padding-left: 20px');
    
    // Check that root category has no indentation
    const electronicsCategoryRow = screen.getByText('Electronics').closest('.flex');
    expect(electronicsCategoryRow).toHaveStyle('padding-left: 0px');
  });

  it('displays category status badges', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return [mockCategory];
      return undefined;
    }) as any);
    
    renderWithProviders(<CategoriesPage />);
    
    // Should show active badges for both categories
    const activeBadges = screen.getAllByText('active');
    expect(activeBadges).toHaveLength(2); // Electronics and Computers
  });
});