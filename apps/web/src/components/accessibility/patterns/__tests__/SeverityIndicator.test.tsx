/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SeverityIndicator, SeverityIndicatorGroup, SeverityIndicatorWithIcon } from '../SeverityIndicator';
import { AccessibilityProvider } from '@/contexts/accessibility';
import { Info } from 'lucide-react';

import { renderWithProviders } from '@/__tests__/test-helpers';

describe('SeverityIndicator', () => {
  it('renders with default props', () => {
    renderWithProviders(
        <SeverityIndicator severity="info" />
    );

    const indicator = screen.getByRole('status');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent('Info');
  });

  it('renders with custom children', () => {
    renderWithProviders(
        <SeverityIndicator severity="warning">Custom Warning</SeverityIndicator>
    );

    expect(screen.getByText('Custom Warning')).toBeInTheDocument();
  });

  it('applies correct aria-label', () => {
    renderWithProviders(
        <SeverityIndicator severity="danger" />
    );

    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('danger severity'));
  });

  it('renders custom aria-label when provided', () => {
    renderWithProviders(
        <SeverityIndicator severity="critical" ariaLabel="Critical error" />
    );

    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-label', 'Critical error');
  });

  it('renders different size variants', () => {
    const { rerender } = renderWithProviders(
        <SeverityIndicator severity="info" size="sm" />
    );

    let indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('text-xs');

    rerender(
        <SeverityIndicator severity="info" size="lg" />
    );

    indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('text-base');
  });

  it('renders different style variants', () => {
    const { rerender } = renderWithProviders(
        <SeverityIndicator severity="warning" variant="outlined" />
    );

    let indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('bg-transparent');

    rerender(
        <SeverityIndicator severity="warning" variant="text" />
    );

    indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('border-0');
  });

  it('renders pattern overlay when showPattern is true', () => {
    renderWithProviders(
        <SeverityIndicator severity="danger" showPattern={true} variant="filled" />
    );

    const patternOverlay = document.querySelector('.severity-pattern');
    expect(patternOverlay).toBeInTheDocument();
    expect(patternOverlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not render pattern for non-filled variants', () => {
    renderWithProviders(
        <SeverityIndicator severity="danger" showPattern={true} variant="outlined" />
    );

    const patternOverlay = document.querySelector('.severity-pattern');
    expect(patternOverlay).not.toBeInTheDocument();
  });
});

describe('SeverityIndicatorWithIcon', () => {
  it('renders with icon and label', () => {
    renderWithProviders(
        <SeverityIndicatorWithIcon
          severity="info"
          icon={<Info data-testid="info-icon" />}
          label="Information"
        />
    );

    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    expect(screen.getByText('Information')).toBeInTheDocument();
  });

  it('renders without icon', () => {
    renderWithProviders(
        <SeverityIndicatorWithIcon severity="warning" label="Warning" />
    );

    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('uses severity as label when label not provided', () => {
    renderWithProviders(
        <SeverityIndicatorWithIcon severity="critical" />
    );

    expect(screen.getByText('critical')).toBeInTheDocument();
  });
});

describe('SeverityIndicatorGroup', () => {
  it('renders multiple indicators', () => {
    const items = [
      { severity: 'info' as const, label: 'Info' },
      { severity: 'warning' as const, label: 'Warning' },
      { severity: 'danger' as const, label: 'Danger' },
    ];

    renderWithProviders(
        <SeverityIndicatorGroup items={items} />
    );

    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Danger')).toBeInTheDocument();
  });

  it('renders with counts', () => {
    const items = [
      { severity: 'critical' as const, label: 'Critical', count: 5 },
      { severity: 'warning' as const, count: 10 },
    ];

    renderWithProviders(
        <SeverityIndicatorGroup items={items} />
    );

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('(5)')).toBeInTheDocument();
    expect(screen.getByText('(10)')).toBeInTheDocument();
  });

  it('returns null for empty items', () => {
    const { container } = renderWithProviders(
        <SeverityIndicatorGroup items={[]} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('applies custom className', () => {
    const items = [{ severity: 'info' as const }];

    renderWithProviders(
        <SeverityIndicatorGroup items={items} className="custom-class" />
    );

    const group = screen.getByRole('status').parentElement;
    expect(group).toHaveClass('custom-class');
  });
});