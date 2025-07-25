import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { fireEvent, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest } from '@/__tests__/test-helpers';
import { useParams } from 'next/navigation';
import { render, 
  screen, 
  waitFor, 
  setupTest, 
  cleanupTest,
  mockUseQuery,
  seedMockData,
  createMockOrganization,
  createMockProject
, renderWithProviders } from '@/__tests__/test-helpers';
import OrganizationDashboard from '../page';
// import { formatDistanceToNow } from 'date-fns';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// The convex/react mock is already handled by frontend-test-helpers
// The convex API mocks are handled by jest.config.js mappings

jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  };
});

jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

jest.mock('@/components/loading', () => ({
  PageLoading: ({ text }: { text?: string }) => <div>{text || 'Loading...'}</div>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  ShoppingCart: () => <div>ShoppingCart Icon</div>,
  Layers: () => <div>Layers Icon</div>,
  Upload: () => <div>Upload Icon</div>,
  Brain: () => <div>Brain Icon</div>,
  Plus: () => <div>Plus Icon</div>,
  TrendingUp: () => <div>TrendingUp Icon</div>,
  Clock: () => <div>Clock Icon</div>,
  Users: () => <div>Users Icon</div>,
  Activity: () => <div>Activity Icon</div>,
  Package: () => <div>Package Icon</div>,
  FileText: () => <div>FileText Icon</div>,
  CheckCircle: () => <div>CheckCircle Icon</div>,
  AlertCircle: () => <div>AlertCircle Icon</div>,
}));

describe('OrganizationDashboard', () => {
  const mockOrgSlug = 'test-org';
  const mockOrganization = createMockOrganization({
    _id: 'org123',
    name: 'Test Organization',
    slug: mockOrgSlug,
  });

  const mockProjects = [
    createMockProject({
      _id: 'proj1',
      name: 'Project 1',
      description: 'First test project',
      status: 'active',
      slug: 'project-1',
      createdAt: new Date('2024-01-01').getTime(),
    }),
    createMockProject({
      _id: 'proj2',
      name: 'Project 2',
      description: 'Second test project',
      status: 'inactive',
      slug: 'project-2',
      createdAt: new Date('2024-01-02').getTime(),
    }),
  ];

  const mockDashboardStats = {
    _id: 'stats_1',
    _creationTime: Date.now(),
    projectsCount: 5,
    productsCount: 100,
    activeAiJobsCount: 2,
    teamMembersCount: 8,
    productsByStatus: {
      active: 80,
      draft: 20,
      total: 100,
    },
    categorizedProducts: 75,
    uncategorizedProducts: 25,
    recentImports: [
      {
        _id: 'import1',
        filename: 'products.csv',
        status: 'completed',
        createdAt: new Date('2024-01-15').getTime(),
        stats: {
          successful: 50,
          failed: 0,
          skipped: 5,
        },
      },
    ],
  };

  const mockRecentActivity = [
    {
      _id: 'activity1',
      _creationTime: Date.now(),
      timestamp: new Date().getTime(),
      eventType: 'CREATE',
      entityType: 'products',
      entityId: 'prod123',
      action: 'created',
      performedBy: {
        type: 'user',
        userId: 'user123',
        userEmail: 'test@example.com',
        name: 'Test User',
      },
    },
    {
      _id: 'activity2',
      _creationTime: Date.now(),
      timestamp: new Date().getTime() - 3600000,
      eventType: 'UPDATE',
      entityType: 'categories',
      entityId: 'cat456',
      action: 'updated',
      performedBy: {
        type: 'system',
        service: 'AI Categorization',
        name: 'AI Categorization',
      },
    },
  ];

  beforeEach(async () => {
    setupTest();
    (useParams as jest.Mock).mockReturnValue({ orgSlug: mockOrgSlug });

    // Seed mock data
    await seedMockData({
      organizations: [mockOrganization],
      projects: mockProjects,
    });

    // Set up console spy to capture logs
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanupTest();
    jest.restoreAllMocks();
  });

  describe('Loading States', () => {
    it('should show loading state when organization is undefined', () => {
      mockUseQuery.mockReturnValue(undefined);

      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('Loading organization...')).toBeInTheDocument();
    });

    it('should handle missing getDashboardStats function gracefully', async () => {
      // Mock the queries to simulate missing function
      mockUseQuery.mockImplementation((query, args) => {
        void args;
        if (query?.toString?.().includes('getOrganizationBySlug')) {
          return mockOrganization;
        }
        if (query?.toString?.().includes('getOrganizationProjects')) {
          return mockProjects;
        }
        if (query?.toString?.().includes('getDashboardStats')) {
          // Simulate missing function error
          console.error('Function functions.dashboard.getDashboardStats not found');
          return undefined;
        }
        if (query?.toString?.().includes('getRecentActivity')) {
          return mockRecentActivity;
        }
        return undefined;
      });

      renderWithProviders(<OrganizationDashboard />);

      // Component should still render with fallback values
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        // Check for specific 0 values in stats cards
        const zeroElements = screen.getAllByText('0');
        expect(zeroElements.length).toBeGreaterThan(0); // Should have fallback counts
      });

      // Check that error was logged
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('getDashboardStats not found')
      );
    });
  });

  describe('Organization Not Found', () => {
    it('should show not found message when organization is null', () => {
      mockUseQuery.mockImplementation((query) => {
        if (query?.toString?.().includes('getOrganizationBySlug')) {
          return null;
        }
        return undefined;
      });

      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('Organization not found')).toBeInTheDocument();
      expect(
        screen.getByText("The organization you're looking for doesn't exist.")
      ).toBeInTheDocument();
    });
  });

  describe('Dashboard Content', () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((query, args) => {
        void args;
        if (query?.toString?.().includes('getOrganizationBySlug')) {
          return mockOrganization;
        }
        if (query?.toString?.().includes('getOrganizationProjects')) {
          return mockProjects;
        }
        if (query?.toString?.().includes('getDashboardStats')) {
          return mockDashboardStats;
        }
        if (query?.toString?.().includes('getRecentActivity')) {
          return mockRecentActivity;
        }
        return undefined;
      });
    });

    it('should render dashboard header correctly', () => {
      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(
        screen.getByText('Welcome to Test Organization - manage your e-commerce product catalog')
      ).toBeInTheDocument();
      expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    it('should render quick stats cards', () => {
      renderWithProviders(<OrganizationDashboard />);

      // Project count
      expect(screen.getByText('Total Projects')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();

      // Products count
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('80 active, 20 draft')).toBeInTheDocument();

      // AI Jobs
      expect(screen.getByText('AI Jobs')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();

      // Team members
      expect(screen.getByText('Team Size')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should render projects section', () => {
      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('First test project')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('should render categorization progress', () => {
      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('Categorization Progress')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument(); // Categorized count
      expect(screen.getByText('25')).toBeInTheDocument(); // Uncategorized count
    });

    it('should render quick actions', () => {
      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Import Products')).toBeInTheDocument();
      expect(screen.getByText('AI Categorization')).toBeInTheDocument();
      expect(screen.getByText('View Analytics')).toBeInTheDocument();
    });

    it('should render recent activity', () => {
      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText(/Test User created a product/)).toBeInTheDocument();
      expect(screen.getByText(/AI Categorization updated a categorie/)).toBeInTheDocument();
    });

    it('should render recent imports', () => {
      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('Recent Imports')).toBeInTheDocument();
      expect(screen.getByText('products.csv')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText(/products[\s\n]+imported/)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state for projects', () => {
      const mockUseQuery = useQuery as jest.Mock;
      mockUseQuery.mockImplementation((query, args) => {
        void args;
        if (query.toString().includes('getOrganizationBySlug')) {
          return mockOrganization;
        }
        if (query.toString().includes('getOrganizationProjects')) {
          return [];
        }
        if (query.toString().includes('getDashboardStats')) {
          return mockDashboardStats;
        }
        if (query.toString().includes('getRecentActivity')) {
          return mockRecentActivity;
        }
        return undefined;
      });

      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('No projects yet')).toBeInTheDocument();
      expect(
        screen.getByText('Create your first project to start managing products.')
      ).toBeInTheDocument();
    });

    it('should show empty state for recent activity', () => {
      const mockUseQuery = useQuery as jest.Mock;
      mockUseQuery.mockImplementation((query, args) => {
        void args;
        if (query.toString().includes('getOrganizationBySlug')) {
          return mockOrganization;
        }
        if (query.toString().includes('getOrganizationProjects')) {
          return mockProjects;
        }
        if (query.toString().includes('getDashboardStats')) {
          return mockDashboardStats;
        }
        if (query.toString().includes('getRecentActivity')) {
          return [];
        }
        return undefined;
      });

      renderWithProviders(<OrganizationDashboard />);

      expect(screen.getByText('No recent activity')).toBeInTheDocument();
      expect(
        screen.getByText('Activity will appear here as you use the platform.')
      ).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle Convex query errors gracefully', async () => {
      const mockUseQuery = useQuery as jest.Mock;
      const convexError = new Error('Convex query failed');

      mockUseQuery.mockImplementation((query) => {
        if (query.toString().includes('getOrganizationBySlug')) {
          throw convexError;
        }
        return undefined;
      });

      // Component will throw error when useQuery throws
      expect(() => renderWithProviders(<OrganizationDashboard />)).toThrow('Convex query failed');
    });

    it('should handle missing data gracefully', () => {
      const mockUseQuery = useQuery as jest.Mock;
      mockUseQuery.mockImplementation((query, args) => {
        void args;
        if (query.toString().includes('getOrganizationBySlug')) {
          return mockOrganization;
        }
        // Return undefined for all other queries
        return undefined;
      });

      renderWithProviders(<OrganizationDashboard />);

      // Should render with fallback values
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });
});
