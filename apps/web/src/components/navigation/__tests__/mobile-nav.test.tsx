import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNav } from '../mobile-nav';
import { usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

describe('MobileNav', () => {
  const mockOnClose = jest.fn();
  const orgSlug = 'test-org';

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/test-org/dashboard');
  });

  it('renders all navigation links', () => {
    render(<MobileNav orgSlug={orgSlug} onClose={mockOnClose} />);

    const expectedLinks = [
      'Dashboard',
      'Projects',
      'Products',
      'Categories',
      'AI Categorization',
      'Import Data',
      'Analytics',
      'Team',
      'Trash',
      'New Project',
      'Settings',
    ];

    expectedLinks.forEach(linkText => {
      expect(screen.getByText(linkText)).toBeInTheDocument();
    });
  });

  it('highlights the active link based on current path', () => {
    render(<MobileNav orgSlug={orgSlug} onClose={mockOnClose} />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('bg-semantic-info', 'text-white');
  });

  it('calls onClose when a link is clicked', () => {
    render(<MobileNav orgSlug={orgSlug} onClose={mockOnClose} />);

    const projectsLink = screen.getByText('Projects');
    fireEvent.click(projectsLink);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('generates correct href for each link', () => {
    render(<MobileNav orgSlug={orgSlug} onClose={mockOnClose} />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/test-org/dashboard');

    const settingsLink = screen.getByText('Settings').closest('a');
    expect(settingsLink).toHaveAttribute('href', '/test-org/settings');
  });

  it('renders icons for each navigation item', () => {
    render(<MobileNav orgSlug={orgSlug} onClose={mockOnClose} />);

    // Check that SVG icons are rendered (they will have the lucide-* class)
    const icons = screen.getAllByRole('img', { hidden: true });
    expect(icons.length).toBeGreaterThan(0);
  });

  it('applies hover styles to non-active links', () => {
    (usePathname as jest.Mock).mockReturnValue('/test-org/products');
    render(<MobileNav orgSlug={orgSlug} onClose={mockOnClose} />);

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('hover:text-semantic-primary', 'hover:bg-semantic-secondary');
  });
});