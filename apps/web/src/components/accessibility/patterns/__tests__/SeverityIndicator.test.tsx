import React from 'react';
import { render, screen } from '@testing-library/react';
import { SeverityIndicator, SeverityIndicatorWithIcon, SeverityIndicatorGroup } from '../SeverityIndicator';
import { AccessibilityProvider } from '@/contexts/accessibility';
import { Info } from 'lucide-react';

// Wrapper component for tests
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}

describe('SeverityIndicator', () => {
  it('renders with default props', () => {
    render(
      <TestWrapper>
        <SeverityIndicator severity="info" />
      </TestWrapper>
    );

    const indicator = screen.getByRole('status');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent('Info');
  });

  it('renders with custom children', () => {
    render(
      <TestWrapper>
        <SeverityIndicator severity="warning">Custom Warning</SeverityIndicator>
      </TestWrapper>
    );

    expect(screen.getByText('Custom Warning')).toBeInTheDocument();
  });

  it('applies correct aria-label', () => {
    render(
      <TestWrapper>
        <SeverityIndicator severity="danger" />
      </TestWrapper>
    );

    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-label', expect.stringContaining('danger severity'));
  });

  it('renders custom aria-label when provided', () => {
    render(
      <TestWrapper>
        <SeverityIndicator severity="critical" ariaLabel="Critical error" />
      </TestWrapper>
    );

    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-label', 'Critical error');
  });

  it('renders different size variants', () => {
    const { rerender } = render(
      <TestWrapper>
        <SeverityIndicator severity="info" size="sm" />
      </TestWrapper>
    );

    let indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('text-xs');

    rerender(
      <TestWrapper>
        <SeverityIndicator severity="info" size="lg" />
      </TestWrapper>
    );

    indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('text-base');
  });

  it('renders different style variants', () => {
    const { rerender } = render(
      <TestWrapper>
        <SeverityIndicator severity="warning" variant="outlined" />
      </TestWrapper>
    );

    let indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('bg-transparent');

    rerender(
      <TestWrapper>
        <SeverityIndicator severity="warning" variant="text" />
      </TestWrapper>
    );

    indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('border-0');
  });

  it('renders pattern overlay when showPattern is true', () => {
    render(
      <TestWrapper>
        <SeverityIndicator severity="danger" showPattern={true} variant="filled" />
      </TestWrapper>
    );

    const patternOverlay = document.querySelector('.severity-pattern');
    expect(patternOverlay).toBeInTheDocument();
    expect(patternOverlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not render pattern for non-filled variants', () => {
    render(
      <TestWrapper>
        <SeverityIndicator severity="danger" showPattern={true} variant="outlined" />
      </TestWrapper>
    );

    const patternOverlay = document.querySelector('.severity-pattern');
    expect(patternOverlay).not.toBeInTheDocument();
  });
});

describe('SeverityIndicatorWithIcon', () => {
  it('renders with icon and label', () => {
    render(
      <TestWrapper>
        <SeverityIndicatorWithIcon
          severity="info"
          icon={<Info data-testid="info-icon" />}
          label="Information"
        />
      </TestWrapper>
    );

    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    expect(screen.getByText('Information')).toBeInTheDocument();
  });

  it('renders without icon', () => {
    render(
      <TestWrapper>
        <SeverityIndicatorWithIcon severity="warning" label="Warning" />
      </TestWrapper>
    );

    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('uses severity as label when label not provided', () => {
    render(
      <TestWrapper>
        <SeverityIndicatorWithIcon severity="critical" />
      </TestWrapper>
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

    render(
      <TestWrapper>
        <SeverityIndicatorGroup items={items} />
      </TestWrapper>
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

    render(
      <TestWrapper>
        <SeverityIndicatorGroup items={items} />
      </TestWrapper>
    );

    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('(5)')).toBeInTheDocument();
    expect(screen.getByText('(10)')).toBeInTheDocument();
  });

  it('returns null for empty items', () => {
    const { container } = render(
      <TestWrapper>
        <SeverityIndicatorGroup items={[]} />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });

  it('applies custom className', () => {
    const items = [{ severity: 'info' as const }];

    render(
      <TestWrapper>
        <SeverityIndicatorGroup items={items} className="custom-class" />
      </TestWrapper>
    );

    const group = screen.getByRole('status').parentElement;
    expect(group).toHaveClass('custom-class');
  });
});