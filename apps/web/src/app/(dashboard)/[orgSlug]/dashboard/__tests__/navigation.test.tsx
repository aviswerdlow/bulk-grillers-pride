import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import OrganizationDashboard from '../page';
// Mock data
const mockOrganization = {
  _id: 'org123',
  name: 'Test Organization',
  slug: 'test-org',
};

const mockProjects = [
  {
    _id: 'proj1',
    name: 'Test Project',
    slug: 'test-project',
    status: 'active',
  },
];

const mockDashboardStats = {
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
  recentImports: [],
};

const mockRecentActivity = [
  {
    _id: 'activity1',
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
];

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href} data-testid={`link-${href}`}>
        {children}
      </a>
    ),
  };
});

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}));

// Mock the Convex API paths
jest.mock('@convex/_generated/api', () => ({
  api: {
    functions: {
      organizations: {
        organizations: {
          getOrganizationBySlug: jest.fn(),
        },
      },
      projects: {
        projects: {
          getOrganizationProjects: jest.fn(),
        },
      },
      dashboard: {
        getDashboardStats: jest.fn(),
        getRecentActivity: jest.fn(),
      },
    },
  },
}));
jest.mock('@convex/_generated/dataModel', () => ({
  Doc: {},
}));

// Mock loading component
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

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

describe('Dashboard Navigation Tests', () => {
  const mockPush = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
    (useParams as jest.Mock).mockReturnValue({
      orgSlug: 'test-org',
    });
  });

  describe('Quick Actions Navigation', () => {
    beforeEach(() => {
      (useQuery as jest.Mock).mockImplementation((query: any, args: any) => {
        // Check if it's the getOrganizationBySlug query
        if (query === api.functions.organizations.organizations.getOrganizationBySlug) {
          return mockOrganization;
        }
        // Check if it's the getOrganizationProjects query
        if (query === api.functions.projects.projects.getOrganizationProjects) {
          return mockProjects;
        }
        // Check if it's the getDashboardStats query
        if (query === api.functions.dashboard.getDashboardStats) {
          return mockDashboardStats;
        }
        // Check if it's the getRecentActivity query
        if (query === api.functions.dashboard.getRecentActivity) {
          return mockRecentActivity;
        }
        return undefined;
      });
    });

    it('should have correct href for Import Products button', async () => {
      render(<OrganizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const importLink = screen.getByTestId('link-/test-org/imports');
      expect(importLink).toBeInTheDocument();
      expect(importLink).toHaveAttribute('href', '/test-org/imports');
      expect(importLink).toHaveTextContent('Import Products');
    });

    it('should have correct href for AI Categorization button', async () => {
      render(<OrganizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const aiLink = screen.getByTestId('link-/test-org/ai/categorization');
      expect(aiLink).toBeInTheDocument();
      expect(aiLink).toHaveAttribute('href', '/test-org/ai/categorization');
      expect(aiLink).toHaveTextContent('AI Categorization');
    });

    it('should have correct href for View Analytics button', async () => {
      render(<OrganizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const analyticsLink = screen.getByTestId('link-/test-org/analytics');
      expect(analyticsLink).toBeInTheDocument();
      expect(analyticsLink).toHaveAttribute('href', '/test-org/analytics');
      expect(analyticsLink).toHaveTextContent('View Analytics');
    });
  });

  describe('Projects Section Navigation', () => {
    it('should have correct href for View All Projects link', async () => {
      (useQuery as jest.Mock).mockImplementation((query: any, args: any) => {
        if (query === api.functions.organizations.organizations.getOrganizationBySlug) {
          return mockOrganization;
        }
        if (query === api.functions.projects.projects.getOrganizationProjects) {
          return mockProjects;
        }
        return undefined;
      });

      render(<OrganizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const viewAllLink = screen.getByTestId('link-/test-org/projects');
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink).toHaveAttribute('href', '/test-org/projects');
      expect(viewAllLink).toHaveTextContent('View All');
    });

    it('should have correct href for individual project links', async () => {
      (useQuery as jest.Mock).mockImplementation((query: any, args: any) => {
        if (query === api.functions.organizations.organizations.getOrganizationBySlug) {
          return mockOrganization;
        }
        if (query === api.functions.projects.projects.getOrganizationProjects) {
          return mockProjects;
        }
        return undefined;
      });

      render(<OrganizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const projectLink = screen.getByTestId('link-/test-org/test-project');
      expect(projectLink).toBeInTheDocument();
      expect(projectLink).toHaveAttribute('href', '/test-org/test-project');
    });

    it('should show Create Project link when no projects exist', async () => {
      (useQuery as jest.Mock).mockImplementation((query: any, args: any) => {
        if (query === api.functions.organizations.organizations.getOrganizationBySlug) {
          return mockOrganization;
        }
        if (query === api.functions.projects.projects.getOrganizationProjects) {
          return []; // No projects
        }
        return undefined;
      });

      render(<OrganizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No projects yet')).toBeInTheDocument();
      });

      const createProjectLinks = screen.getAllByTestId('link-/test-org/projects/new');
      expect(createProjectLinks.length).toBeGreaterThan(0);
      expect(createProjectLinks[0]).toHaveAttribute('href', '/test-org/projects/new');
    });
  });

  describe('Header Navigation', () => {
    it('should have correct href for New Project button in header', async () => {
      (useQuery as jest.Mock).mockImplementation((query: any) => {
        if (query === api.functions.organizations.organizations.getOrganizationBySlug) {
          return mockOrganization;
        }
        return undefined;
      });

      render(<OrganizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const newProjectLinks = screen.getAllByTestId('link-/test-org/projects/new');
      const headerNewProjectLink = newProjectLinks[0]; // First one should be in header
      expect(headerNewProjectLink).toBeInTheDocument();
      expect(headerNewProjectLink).toHaveAttribute('href', '/test-org/projects/new');
    });
  });

  describe('Recent Activity Navigation', () => {
    it('should have correct href for View All Activity link', async () => {
      (useQuery as jest.Mock).mockImplementation((query: any) => {
        if (query === api.functions.organizations.organizations.getOrganizationBySlug) {
          return mockOrganization;
        }
        if (query === api.functions.dashboard.getRecentActivity) {
          return mockRecentActivity;
        }
        return undefined;
      });

      render(<OrganizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });

      const viewAllActivityLink = screen.getByTestId('link-/test-org/activity');
      expect(viewAllActivityLink).toBeInTheDocument();
      expect(viewAllActivityLink).toHaveAttribute('href', '/test-org/activity');
      expect(viewAllActivityLink).toHaveTextContent('View All');
    });
  });

  describe('All Navigation Links Summary', () => {
    it('should have all expected navigation links with correct hrefs', async () => {
      (useQuery as jest.Mock).mockImplementation((query: any) => {
        if (query === api.functions.organizations.organizations.getOrganizationBySlug) {
          return mockOrganization;
        }
        if (query === api.functions.projects.projects.getOrganizationProjects) {
          return mockProjects;
        }
        if (query === api.functions.dashboard.getDashboardStats) {
          return mockDashboardStats;
        }
        if (query === api.functions.dashboard.getRecentActivity) {
          return mockRecentActivity;
        }
        return undefined;
      });

      render(<OrganizationDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Verify all navigation links
      const expectedLinks = [
        { href: '/test-org/projects/new', count: 'multiple' }, // Header + empty state
        { href: '/test-org/projects', count: 'single' }, // View All Projects
        { href: '/test-org/test-project', count: 'single' }, // Individual project
        { href: '/test-org/imports', count: 'single' }, // Import Products
        { href: '/test-org/ai/categorization', count: 'single' }, // AI Categorization
        { href: '/test-org/analytics', count: 'single' }, // View Analytics
        { href: '/test-org/activity', count: 'single' }, // View All Activity
      ];

      expectedLinks.forEach(({ href, count }) => {
        const links = screen.queryAllByTestId(`link-${href}`);
        if (count === 'single') {
          expect(links).toHaveLength(1);
          expect(links[0]).toHaveAttribute('href', href);
        } else {
          expect(links.length).toBeGreaterThan(0);
          links.forEach((link) => {
            expect(link).toHaveAttribute('href', href);
          });
        }
      });
    });
  });
});
