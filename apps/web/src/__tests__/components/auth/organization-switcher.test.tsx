import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import { OrganizationSwitcher } from '@/components/auth/organization-switcher';
import {
  render,
  resetAllMocks,
  mockUseQuery,
  mockUseMutation,
  createMockOrganization,
} from '../../test-utils';
import { toast } from 'sonner';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('OrganizationSwitcher', () => {
  const mockPush = jest.fn();
  const mockSwitchOrganization = jest.fn();

  const mockCurrentOrg = createMockOrganization({
    _id: 'org_123',
    name: 'Test Organization',
    slug: 'test-org',
  });

  const mockOrganizations = [
    {
      ...mockCurrentOrg,
      memberRole: 'admin',
    },
    {
      ...createMockOrganization({
        _id: 'org_456',
        name: 'Second Organization',
        slug: 'second-org',
      }),
      memberRole: 'member',
    },
    {
      ...createMockOrganization({
        _id: 'org_789',
        name: 'Third Organization',
        slug: 'third-org',
      }),
      memberRole: 'owner',
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mockUserWithOrgs = {
    user: {
      id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
    },
    organizations: mockOrganizations,
  };

  beforeEach(() => {
    resetAllMocks();

    // Mock router
    const mockUseRouter = useRouter as jest.Mock;
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    // Mock params
    const mockUseParams = useParams as jest.Mock;
    mockUseParams.mockReturnValue({
      orgSlug: 'test-org',
    });

    // Mock Convex queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseQuery.mockImplementation((query: any, args: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      const queryName = (query as any)?._functionName || (query as any)?.name || (query as any)?.toString() || '';
      
      // Mock currentWithOrganizations query
      if (queryName.includes('currentWithOrganizations')) {
        return {
          _id: 'user_123',
          name: 'Test User',
          email: 'test@example.com',
          organizations: mockOrganizations.map(org => ({ _id: org.id }))
        };
      }
      // Mock getOrganizationBySlug query
      if (queryName.includes('getOrganizationBySlug')) {
        return {
          _id: mockCurrentOrg.id,
          name: mockCurrentOrg.name,
          slug: mockCurrentOrg.slug,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      }
      return undefined;
    });

    // Mock switchOrganization mutation
    mockUseMutation.mockReturnValue(mockSwitchOrganization);
  });

  describe('dropdown variant', () => {
    it('renders current organization', () => {
      render(<OrganizationSwitcher />);

      expect(screen.getByRole('button', { name: /test organization/i })).toBeInTheDocument();
      expect(screen.getByText('TO')).toBeInTheDocument(); // Avatar initials
    });

    it('shows loading state when data is not loaded', () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<OrganizationSwitcher />);

      expect(screen.getByRole('generic').querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('opens dropdown menu when clicked', async () => {
      render(<OrganizationSwitcher />);

      const button = screen.getByRole('button', { name: /test organization/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Organizations')).toBeInTheDocument();
        expect(screen.getByText('Second Organization')).toBeInTheDocument();
        expect(screen.getByText('Third Organization')).toBeInTheDocument();
      });
    });

    it('shows member roles in dropdown', async () => {
      render(<OrganizationSwitcher />);

      const button = screen.getByRole('button', { name: /test organization/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('member')).toBeInTheDocument();
        expect(screen.getByText('owner')).toBeInTheDocument();
      });
    });

    it('shows checkmark for current organization', async () => {
      render(<OrganizationSwitcher />);

      const button = screen.getByRole('button', { name: /test organization/i });
      fireEvent.click(button);

      await waitFor(() => {
        const currentOrgItem = screen.getByText('Test Organization').closest('[role="menuitem"]');
        expect(currentOrgItem?.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('switches organization when different one is selected', async () => {
      render(<OrganizationSwitcher />);

      // Open dropdown
      const button = screen.getByRole('button', { name: /test organization/i });
      fireEvent.click(button);

      // Click on second organization
      await waitFor(() => {
        const secondOrg = screen.getByText('Second Organization');
        fireEvent.click(secondOrg);
      });

      await waitFor(() => {
        expect(mockSwitchOrganization).toHaveBeenCalledWith({ organizationId: 'org_456' });
        expect(mockPush).toHaveBeenCalledWith('/second-org/dashboard');
        expect(toast.success).toHaveBeenCalledWith('Switched organization successfully');
      });
    });

    it('does not switch when clicking current organization', async () => {
      render(<OrganizationSwitcher />);

      // Open dropdown
      const button = screen.getByRole('button', { name: /test organization/i });
      fireEvent.click(button);

      // Click on current organization
      await waitFor(() => {
        const currentOrg = screen.getByText('Test Organization');
        fireEvent.click(currentOrg);
      });

      expect(mockSwitchOrganization).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles switch errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSwitchOrganization.mockRejectedValue(new Error('Switch failed'));

      render(<OrganizationSwitcher />);

      // Open dropdown and click second org
      const button = screen.getByRole('button', { name: /test organization/i });
      fireEvent.click(button);

      await waitFor(() => {
        const secondOrg = screen.getByText('Second Organization');
        fireEvent.click(secondOrg);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to switch organization');
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('shows loading state while switching', async () => {
      // Make switch organization slow
      mockSwitchOrganization.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<OrganizationSwitcher />);

      const button = screen.getByRole('button', { name: /test organization/i });
      fireEvent.click(button);

      await waitFor(() => {
        const secondOrg = screen.getByText('Second Organization');
        fireEvent.click(secondOrg);
      });

      // Check for loading spinner
      await waitFor(() => {
        expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument();
      });
    });

    it('shows links to team and settings', async () => {
      render(<OrganizationSwitcher />);

      const button = screen.getByRole('button', { name: /test organization/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /team members/i })).toBeInTheDocument();
        expect(
          screen.getByRole('menuitem', { name: /organization settings/i })
        ).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /create organization/i })).toBeInTheDocument();
      });
    });

    it('renders with custom className', () => {
      render(<OrganizationSwitcher className="custom-switcher" />);

      const button = screen.getByRole('button', { name: /test organization/i });
      expect(button).toHaveClass('custom-switcher');
    });
  });

  describe('select variant', () => {
    it('renders as select when variant is select', () => {
      render(<OrganizationSwitcher variant="select" />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Test Organization')).toBeInTheDocument();
    });

    it('shows all organizations in select', () => {
      render(<OrganizationSwitcher variant="select" />);

      const select = screen.getByRole('combobox');
      fireEvent.click(select);

      // Note: Select component might render options differently
      // This test assumes options are rendered when select is clicked
      expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
    });

    it('switches organization when option is selected', async () => {
      render(<OrganizationSwitcher variant="select" />);

      const select = screen.getByRole('combobox');

      // Simulate selecting a different organization
      // Note: The actual implementation might vary based on the Select component
      fireEvent.change(select, { target: { value: 'org_456' } });

      await waitFor(() => {
        expect(mockSwitchOrganization).toHaveBeenCalledWith({ organizationId: 'org_456' });
      });
    });

    it('is disabled while switching', async () => {
      mockSwitchOrganization.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<OrganizationSwitcher variant="select" />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'org_456' } });

      await waitFor(() => {
        expect(select).toBeDisabled();
      });
    });
  });

  describe('organization name initials', () => {
    it('generates correct initials for single word', () => {
      mockUseQuery.mockImplementation((query: any) => {
        const queryName = (query as any)?._functionName || (query as any)?.name || (query as any)?.toString() || '';
        
        if (queryName.includes('currentWithOrganizations')) {
          return {
            _id: 'user_123',
            name: 'Test User',
            email: 'test@example.com',
            organizations: mockOrganizations.map(org => ({ _id: org.id }))
          };
        }
        if (queryName.includes('getOrganizationBySlug')) {
          return {
            _id: mockCurrentOrg._id,
            name: 'Apple',
            slug: mockCurrentOrg.slug,
            createdAt: mockCurrentOrg.createdAt,
            updatedAt: mockCurrentOrg.updatedAt
          };
        }
        return undefined;
      });

      render(<OrganizationSwitcher />);

      expect(screen.getByText('AP')).toBeInTheDocument();
    });

    it('generates correct initials for multiple words', () => {
      mockUseQuery.mockImplementation((query: any) => {
        const queryName = (query as any)?._functionName || (query as any)?.name || (query as any)?.toString() || '';
        
        if (queryName.includes('currentWithOrganizations')) {
          return {
            _id: 'user_123',
            name: 'Test User',
            email: 'test@example.com',
            organizations: mockOrganizations.map(org => ({ _id: org.id }))
          };
        }
        if (queryName.includes('getOrganizationBySlug')) {
          return { ...mockCurrentOrg, name: 'Big Long Company Name' };
        }
        return undefined;
      });

      render(<OrganizationSwitcher />);

      expect(screen.getByText('BL')).toBeInTheDocument(); // Only first two words
    });
  });
});
