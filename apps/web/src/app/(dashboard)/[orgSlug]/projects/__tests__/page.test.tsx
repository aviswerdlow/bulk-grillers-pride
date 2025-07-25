import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest } from '@/__tests__/test-helpers';
import { formatDistanceToNow } from 'date-fns';
import { useParams } from 'next/navigation';
import ProjectsPage from '../page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 days ago'),
}));

// Mock loading component
jest.mock('@/components/loading', () => ({
  Loading: ({ size, text }: { size?: string; text?: string }) => 
    <div data-testid="loading" data-size={size}>{text || 'Loading...'}</div>,
  PageLoading: ({ text }: { text?: string }) => 
    <div data-testid="page-loading">{text || 'Loading...'}</div>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Plus: () => <div>Plus Icon</div>,
  Folder: () => <div>Folder Icon</div>,
  Package: () => <div>Package Icon</div>,
  Calendar: () => <div>Calendar Icon</div>,
  Settings: () => <div>Settings Icon</div>,
  Trash2: () => <div>Trash2 Icon</div>,
}))

describe('ProjectsPage', () => {
  const mockOrganization = {
    _id: 'org_123' as unknown,
    name: 'Test Organization',
    slug: 'test-org',
  };

  const mockProject = {
    _id: 'proj_123' as unknown,
    name: 'Test Project',
    slug: 'test-project',
    description: 'A test project description',
    status: 'active',
    organizationId: 'org_123' as unknown,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockStats = {
    productsCount: 42,
    categorizedProducts: 38,
    uncategorizedProducts: 4,
    projectsCount: 1,
    teamMembersCount: 3,
    categoryPaths: {},
    recentActivity: [],
    recentImports: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ orgSlug: 'test-org' });
  });

  it('renders loading state while fetching data', () => {
    mockUseQuery.mockReturnValue(undefined);
    
    renderWithProviders(<ProjectsPage />);
    
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });

  it('renders error when organization not found', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return null;
      if (callCount === 2) return [];
      return undefined;
    }) as any); // projects query
    
    renderWithProviders(<ProjectsPage />);
    
    expect(screen.getByText('Organization not found')).toBeInTheDocument();
    expect(screen.getByText("The organization you're looking for doesn't exist.")).toBeInTheDocument();
  });

  it('renders projects page with empty state', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [];
      if (callCount === 3) return mockStats;
      return undefined;
    }) as any); // stats query
    
    renderWithProviders(<ProjectsPage />);
    
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first project to start managing your e-commerce products and categories.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create Your First Project/i })).toBeInTheDocument();
  });

  it('renders projects page with data', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return mockStats;
      return undefined;
    }) as any); // stats query
    
    renderWithProviders(<ProjectsPage />);
    
    // Check header
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('Manage your e-commerce projects and product catalogs')).toBeInTheDocument();
    
    // Check new project button
    expect(screen.getByRole('link', { name: /New Project/i })).toBeInTheDocument();
    
    // Check project card
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A test project description')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('displays project stats correctly', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return mockStats;
      return undefined;
    }) as any);
    
    renderWithProviders(<ProjectsPage />);
    
    expect(screen.getByText('42 products')).toBeInTheDocument();
    expect(screen.getByText('38 categorized')).toBeInTheDocument();
  });

  it('formats creation date correctly', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return mockStats;
      return undefined;
    }) as any);
    
    renderWithProviders(<ProjectsPage />);
    
    expect(formatDistanceToNow).toHaveBeenCalledWith(
      new Date(mockProject.createdAt),
      { addSuffix: true }
    );
    expect(screen.getByText('Created 2 days ago')).toBeInTheDocument();
  });

  it('renders multiple projects in grid layout', () => {
    const projects = [
      mockProject,
      { ...mockProject, _id: 'proj_124', name: 'Second Project', slug: 'second-project' },
      { ...mockProject, _id: 'proj_125', name: 'Third Project', slug: 'third-project', status: 'draft' },
    ];
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return projects;
      if (callCount === 3) return mockStats;
      return undefined;
    }) as any);
    
    renderWithProviders(<ProjectsPage />);
    
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Second Project')).toBeInTheDocument();
    expect(screen.getByText('Third Project')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
  });

  it('renders correct links for project actions', () => {
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return mockStats;
      return undefined;
    }) as any);
    
    renderWithProviders(<ProjectsPage />);
    
    // Check settings link
    const settingsLink = screen.getByRole('link', { name: '' }).closest('a');
    expect(settingsLink).toHaveAttribute('href', '/test-org/projects/test-project/settings');
    
    // Check view products link
    const productsLink = screen.getByRole('link', { name: 'View Products' });
    expect(productsLink).toHaveAttribute('href', '/test-org/products');
    
    // Check dashboard link
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('href', '/test-org/dashboard');
  });

  it('handles projects without description', () => {
    const projectWithoutDesc = {
      ...mockProject,
      description: undefined,
    };
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [projectWithoutDesc];
      if (callCount === 3) return mockStats;
      return undefined;
    }) as any);
    
    renderWithProviders(<ProjectsPage />);
    
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.queryByText('A test project description')).not.toBeInTheDocument();
  });

  it('shows correct stats when no products exist', () => {
    const emptyStats = {
      ...mockStats,
      productsCount: 0,
      categorizedProducts: 0,
    };
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return [mockProject];
      if (callCount === 3) return emptyStats;
      return undefined;
    }) as any);
    
    renderWithProviders(<ProjectsPage />);
    
    expect(screen.getByText('0 products')).toBeInTheDocument();
    expect(screen.getByText('0 categorized')).toBeInTheDocument();
  });

  it('displays correct badge variant for project status', () => {
    const projects = [
      { ...mockProject, status: 'active' },
      { ...mockProject, _id: 'proj_124', name: 'Draft Project', status: 'draft' },
    ];
    
    let callCount = 0;
    mockUseQuery.mockImplementation(((query: any, args: any) => {
      callCount++;
      if (callCount === 1) return mockOrganization;
      if (callCount === 2) return projects;
      if (callCount === 3) return mockStats;
      return undefined;
    }) as any);
    
    renderWithProviders(<ProjectsPage />);
    
    const activeBadge = screen.getByText('active');
    expect(activeBadge).toHaveClass('bg-primary'); // default variant
    
    const draftBadge = screen.getByText('draft');
    expect(draftBadge).toHaveClass('bg-secondary'); // secondary variant
  });
});