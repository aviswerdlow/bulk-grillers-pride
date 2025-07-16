import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import OrganizationDashboard from '../page';
import {
  mockOrganization,
  mockProjects,
  mockDashboardStats,
  mockRecentActivity,
} from './page.test';

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
      (useQuery as jest.Mock).mockImplementation((query: any) => {
        if (query === 'mock-getOrganizationBySlug') {
          return mockOrganization;
        }
        if (query === 'mock-getOrganizationProjects') {
          return mockProjects;
        }
        if (query === 'mock-getDashboardStats') {
          return mockDashboardStats;
        }
        if (query === 'mock-getRecentActivity') {
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
      (useQuery as jest.Mock).mockImplementation((query: any) => {
        if (query === 'mock-getOrganizationBySlug') {
          return mockOrganization;
        }
        if (query === 'mock-getOrganizationProjects') {
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
      (useQuery as jest.Mock).mockImplementation((query: any) => {
        if (query.name?.includes('getOrganizationBySlug')) {
          return mockOrganization;
        }
        if (query.name?.includes('getOrganizationProjects')) {
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
      (useQuery as jest.Mock).mockImplementation((query: any) => {
        if (query.name?.includes('getOrganizationBySlug')) {
          return mockOrganization;
        }
        if (query.name?.includes('getOrganizationProjects')) {
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
        if (query.name?.includes('getOrganizationBySlug')) {
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
        if (query.name?.includes('getOrganizationBySlug')) {
          return mockOrganization;
        }
        if (query.name?.includes('getRecentActivity')) {
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
        if (query.name?.includes('getOrganizationBySlug')) {
          return mockOrganization;
        }
        if (query.name?.includes('getOrganizationProjects')) {
          return mockProjects;
        }
        if (query.name?.includes('getDashboardStats')) {
          return mockDashboardStats;
        }
        if (query.name?.includes('getRecentActivity')) {
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
