import React from 'react';
import { render, screen } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import OrganizationDashboard from '../page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}));

// Mock Next.js Link to verify hrefs
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

describe('Dashboard Navigation Links', () => {
  const mockPush = jest.fn();

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

  it('should render with correct navigation links when data is loaded', () => {
    // Mock all queries to return data
    (useQuery as jest.Mock).mockImplementation((query: any) => {
      if (query.toString().includes('getOrganizationBySlug')) {
        return {
          _id: 'org123',
          name: 'Test Organization',
          slug: 'test-org',
        };
      }
      if (query.toString().includes('getOrganizationProjects')) {
        return [
          {
            _id: 'proj123',
            name: 'Test Project',
            slug: 'test-project',
            description: 'A test project',
            status: 'active',
            createdAt: Date.now(),
          },
        ];
      }
      if (query.toString().includes('getDashboardStats')) {
        return {
          projectsCount: 1,
          productsCount: 10,
          productsByStatus: { active: 8, draft: 2 },
          activeAiJobsCount: 0,
          teamMembersCount: 3,
          categorizedProducts: 7,
          uncategorizedProducts: 3,
          recentImports: [],
        };
      }
      if (query.toString().includes('getRecentActivity')) {
        return [];
      }
      return undefined;
    });

    const { container } = render(<OrganizationDashboard />);

    // Check that the component rendered (not in loading state)
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Test Organization', { exact: false })).toBeInTheDocument();

    // Check Quick Actions links
    const importProductsLink = container.querySelector('a[href="/test-org/imports"]');
    expect(importProductsLink).toBeInTheDocument();
    expect(importProductsLink).toHaveTextContent('Import Products');

    const aiCategorizationLink = container.querySelector('a[href="/test-org/ai/categorization"]');
    expect(aiCategorizationLink).toBeInTheDocument();
    expect(aiCategorizationLink).toHaveTextContent('AI Categorization');

    const analyticsLink = container.querySelector('a[href="/test-org/analytics"]');
    expect(analyticsLink).toBeInTheDocument();
    expect(analyticsLink).toHaveTextContent('View Analytics');

    // Check other navigation links
    const viewAllProjectsLink = container.querySelector('a[href="/test-org/projects"]');
    expect(viewAllProjectsLink).toBeInTheDocument();
    expect(viewAllProjectsLink).toHaveTextContent('View All');

    const projectLink = container.querySelector('a[href="/test-org/test-project"]');
    expect(projectLink).toBeInTheDocument();
    expect(projectLink).toHaveTextContent('Open');

    const newProjectLinks = container.querySelectorAll('a[href="/test-org/projects/new"]');
    expect(newProjectLinks.length).toBeGreaterThan(0);
    expect(newProjectLinks[0]).toHaveTextContent('New Project');
  });

  it('should NOT have the old /products/import link', () => {
    // Mock all queries to return data
    (useQuery as jest.Mock).mockImplementation((query: any) => {
      if (query.toString().includes('getOrganizationBySlug')) {
        return {
          _id: 'org123',
          name: 'Test Organization',
          slug: 'test-org',
        };
      }
      if (query.toString().includes('getOrganizationProjects')) {
        return [];
      }
      if (query.toString().includes('getDashboardStats')) {
        return {
          projectsCount: 0,
          productsCount: 0,
          productsByStatus: { active: 0, draft: 0 },
          activeAiJobsCount: 0,
          teamMembersCount: 1,
          categorizedProducts: 0,
          uncategorizedProducts: 0,
          recentImports: [],
        };
      }
      if (query.toString().includes('getRecentActivity')) {
        return [];
      }
      return undefined;
    });

    const { container } = render(<OrganizationDashboard />);

    // Ensure the old link does not exist
    const oldImportLink = container.querySelector('a[href="/test-org/products/import"]');
    expect(oldImportLink).not.toBeInTheDocument();

    // Ensure the new link exists
    const newImportLink = container.querySelector('a[href="/test-org/imports"]');
    expect(newImportLink).toBeInTheDocument();
  });
});
