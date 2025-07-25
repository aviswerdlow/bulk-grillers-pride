/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CriticalIndicator, DangerIndicator, InfoIndicator, SeverityIndicatorEnhanced, WarningIndicator } from '../SeverityIndicatorEnhanced';
import { axe, toHaveNoViolations } from 'jest-axe';

import { renderWithProviders } from '@/__tests__/test-helpers';

import '@testing-library/jest-dom';
expect.extend(toHaveNoViolations);

// Mock window.matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

describe('SeverityIndicatorEnhanced', () => {
  describe('Basic Rendering', () => {
    it('renders with required props', () => {
      renderWithProviders(<SeverityIndicatorEnhanced severity="warning" />);
      const indicator = screen.getByRole('status');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('Warning');
    });

    it('renders with custom label', () => {
      renderWithProviders(<SeverityIndicatorEnhanced 
          severity="danger" 
          label="Product References" 
        />
      );
      expect(screen.getByText('Product References')).toBeInTheDocument();
    });

    it('renders with message', () => {
      renderWithProviders(<SeverityIndicatorEnhanced 
          severity="warning" 
          label="External Links"
          message="Some links will break" 
        />
      );
      expect(screen.getByText('External Links')).toBeInTheDocument();
      expect(screen.getByText('Some links will break')).toBeInTheDocument();
    });

    it('renders without pattern when pattern prop is false', () => {
      const { container } = renderWithProviders(<SeverityIndicatorEnhanced severity="info" pattern={false} />
      );
      expect(container.querySelector('.severity-pattern')).not.toBeInTheDocument();
    });
  });

  describe('Severity Levels', () => {
    const severities: Array<{ severity: 'info' | 'warning' | 'danger' | 'critical'; label: string }> = [
      { severity: 'info', label: 'Info' },
      { severity: 'warning', label: 'Warning' },
      { severity: 'danger', label: 'Danger' },
      { severity: 'critical', label: 'Critical' },
    ];

    severities.forEach(({ severity, label }) => {
      it(`renders ${severity} severity correctly`, () => {
        renderWithProviders(<SeverityIndicatorEnhanced severity={severity} />);
        const indicator = screen.getByRole('status');
        expect(indicator).toHaveTextContent(label);
      });
    });
  });

  describe('Size Variants', () => {
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];

    sizes.forEach(size => {
      it(`renders ${size} size correctly`, () => {
        renderWithProviders(<SeverityIndicatorEnhanced severity="info" size={size} />);
        const indicator = screen.getByRole('status');
        expect(indicator).toBeInTheDocument();
      });
    });
  });

  describe('Style Variants', () => {
    const variants: Array<'filled' | 'outlined' | 'text'> = ['filled', 'outlined', 'text'];

    variants.forEach(variant => {
      it(`renders ${variant} variant correctly`, () => {
        renderWithProviders(<SeverityIndicatorEnhanced severity="warning" variant={variant} />);
        const indicator = screen.getByRole('status');
        expect(indicator).toBeInTheDocument();
      });
    });
  });

  describe('Icons', () => {
    it('renders icon by default', () => {
      const { container } = renderWithProviders(<SeverityIndicatorEnhanced severity="warning" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('hides icon when showIcon is false', () => {
      const { container } = renderWithProviders(<SeverityIndicatorEnhanced severity="warning" showIcon={false} />
      );
      const icon = container.querySelector('svg:not([width="0"])');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderWithProviders(<SeverityIndicatorEnhanced 
          severity="warning" 
          label="Product References"
          message="External links will break"
        />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes', () => {
      renderWithProviders(<SeverityIndicatorEnhanced 
          severity="danger" 
          label="Delete Product"
          message="This action cannot be undone"
        />
      );
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-label');
      expect(indicator.getAttribute('aria-label')).toContain('danger severity');
      expect(indicator.getAttribute('aria-label')).toContain('Delete Product');
      expect(indicator.getAttribute('aria-label')).toContain('This action cannot be undone');
    });

    it('uses custom aria-label when provided', () => {
      renderWithProviders(<SeverityIndicatorEnhanced 
          severity="critical" 
          ariaLabel="Critical warning: System failure imminent"
        />
      );
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-label', 'Critical warning: System failure imminent');
    });

    it('pattern is marked as decorative', () => {
      const { container } = renderWithProviders(<SeverityIndicatorEnhanced severity="warning" />
      );
      const pattern = container.querySelector('.severity-pattern');
      expect(pattern).toHaveAttribute('aria-hidden', 'true');
    });

    it('icons are marked as decorative', () => {
      const { container } = renderWithProviders(<SeverityIndicatorEnhanced severity="info" />
      );
      const icon = container.querySelector('svg:not([width="0"])');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Convenience Components', () => {
    it('InfoIndicator renders with info severity', () => {
      renderWithProviders(<InfoIndicator label="Information" />);
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Information');
      expect(indicator.getAttribute('aria-label')).toContain('info severity');
    });

    it('WarningIndicator renders with warning severity', () => {
      renderWithProviders(<WarningIndicator label="Warning" />);
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Warning');
      expect(indicator.getAttribute('aria-label')).toContain('warning severity');
    });

    it('DangerIndicator renders with danger severity', () => {
      renderWithProviders(<DangerIndicator label="Danger" />);
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Danger');
      expect(indicator.getAttribute('aria-label')).toContain('danger severity');
    });

    it('CriticalIndicator renders with critical severity', () => {
      renderWithProviders(<CriticalIndicator label="Critical" />);
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveTextContent('Critical');
      expect(indicator.getAttribute('aria-label')).toContain('critical severity');
    });
  });

  describe('Pattern SVG', () => {
    it('includes pattern definitions in the DOM', () => {
      const { container } = renderWithProviders(<SeverityIndicatorEnhanced severity="warning" />
      );
      const svg = container.querySelector('svg[width="0"][height="0"]');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      
      const pattern = svg?.querySelector('pattern');
      expect(pattern).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('renders multiple indicators correctly', () => {
      renderWithProviders(<div>
          <SeverityIndicatorEnhanced severity="info" label="Info 1" />
          <SeverityIndicatorEnhanced severity="warning" label="Warning 1" />
          <SeverityIndicatorEnhanced severity="danger" label="Danger 1" />
          <SeverityIndicatorEnhanced severity="critical" label="Critical 1" />
        </div>
      );

      expect(screen.getByText('Info 1')).toBeInTheDocument();
      expect(screen.getByText('Warning 1')).toBeInTheDocument();
      expect(screen.getByText('Danger 1')).toBeInTheDocument();
      expect(screen.getByText('Critical 1')).toBeInTheDocument();
    });

    it('handles long messages gracefully', () => {
      const longMessage = 'This is a very long message that might wrap to multiple lines and should still be displayed correctly within the component';
      renderWithProviders(<SeverityIndicatorEnhanced 
          severity="warning" 
          label="Long Message Test"
          message={longMessage}
        />
      );
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });
});