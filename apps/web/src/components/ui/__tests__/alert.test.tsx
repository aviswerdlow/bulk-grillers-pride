import React from 'react';
import { render, screen } from '@/__tests__/test-utils';
import { setupTest, cleanupTest } from '@/__tests__/frontend-test-helpers';
import { Alert, AlertTitle, AlertDescription } from '../alert';
import { InfoIcon, AlertCircle } from 'lucide-react';

describe('Alert', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Rendering', () => {
    it('renders with default variant', () => {
      render(
        <Alert>
          <AlertTitle>Default Alert</AlertTitle>
          <AlertDescription>This is a default alert message.</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('bg-background', 'text-foreground');
      expect(screen.getByText('Default Alert')).toBeInTheDocument();
      expect(screen.getByText('This is a default alert message.')).toBeInTheDocument();
    });

    it('renders with destructive variant', () => {
      render(
        <Alert variant="destructive">
          <AlertTitle>Error Alert</AlertTitle>
          <AlertDescription>This is an error alert message.</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-destructive/50', 'text-destructive');
    });

    it('renders with icon', () => {
      render(
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Alert with Icon</AlertTitle>
          <AlertDescription>This alert has an icon.</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      const icon = alert.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-4', 'w-4');
    });

    it('applies custom className', () => {
      render(
        <Alert className="custom-alert-class">
          <AlertTitle>Custom Alert</AlertTitle>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-alert-class');
    });

    it('renders with multiple paragraphs in description', () => {
      render(
        <Alert>
          <AlertTitle>Multi-paragraph Alert</AlertTitle>
          <AlertDescription>
            <p>First paragraph of the alert.</p>
            <p>Second paragraph of the alert.</p>
          </AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(screen.getByText('First paragraph of the alert.')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph of the alert.')).toBeInTheDocument();
    });
  });

  describe('Alert Components', () => {
    it('renders AlertTitle correctly', () => {
      render(
        <Alert>
          <AlertTitle className="custom-title">Important Notice</AlertTitle>
        </Alert>
      );

      const title = screen.getByText('Important Notice');
      expect(title.tagName).toBe('H5');
      expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight', 'custom-title');
    });

    it('renders AlertDescription correctly', () => {
      render(
        <Alert>
          <AlertDescription className="custom-description">
            Detailed description of the alert.
          </AlertDescription>
        </Alert>
      );

      const description = screen.getByText('Detailed description of the alert.');
      expect(description.parentElement).toHaveClass('text-sm', 'custom-description');
    });

    it('renders without title', () => {
      render(
        <Alert>
          <AlertDescription>Alert with description only.</AlertDescription>
        </Alert>
      );

      expect(screen.getByText('Alert with description only.')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders without description', () => {
      render(
        <Alert>
          <AlertTitle>Alert with title only</AlertTitle>
        </Alert>
      );

      expect(screen.getByText('Alert with title only')).toBeInTheDocument();
    });
  });

  describe('Icon Positioning', () => {
    it('applies correct spacing when icon is present', () => {
      render(
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Alert with Icon</AlertTitle>
          <AlertDescription>Icon should be positioned correctly.</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      // Check for icon positioning classes
      expect(alert).toHaveClass('[&>svg~*]:pl-7');
      expect(alert).toHaveClass('[&>svg]:absolute');
      expect(alert).toHaveClass('[&>svg]:left-4');
      expect(alert).toHaveClass('[&>svg]:top-4');
    });

    it('renders correctly without icon', () => {
      render(
        <Alert>
          <AlertTitle>No Icon Alert</AlertTitle>
          <AlertDescription>This alert has no icon.</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      const icon = alert.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies default variant styles', () => {
      render(<Alert>Default variant alert</Alert>);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-background', 'text-foreground');
    });

    it('applies destructive variant styles', () => {
      render(
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong!</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-destructive/50', 'text-destructive');
      
      const icon = alert.querySelector('svg');
      expect(alert).toHaveClass('[&>svg]:text-destructive');
    });
  });

  describe('Accessibility', () => {
    it('has alert role', () => {
      render(
        <Alert>
          <AlertTitle>Accessible Alert</AlertTitle>
          <AlertDescription>This alert is accessible.</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('maintains semantic structure', () => {
      render(
        <Alert>
          <AlertTitle>Semantic Alert</AlertTitle>
          <AlertDescription>This maintains proper heading hierarchy.</AlertDescription>
        </Alert>
      );

      const title = screen.getByText('Semantic Alert');
      expect(title.tagName).toBe('H5');
    });

    it('supports keyboard navigation', () => {
      render(
        <Alert>
          <AlertTitle>Keyboard Accessible</AlertTitle>
          <AlertDescription>
            This alert can contain <a href="#link">focusable elements</a>.
          </AlertDescription>
        </Alert>
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '#link');
    });
  });

  describe('Forwarded Refs', () => {
    it('forwards ref to Alert', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Alert ref={ref}>
          <AlertTitle>Ref Test</AlertTitle>
        </Alert>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveRole('alert');
    });

    it('forwards ref to AlertTitle', () => {
      const ref = React.createRef<HTMLHeadingElement>();
      render(
        <Alert>
          <AlertTitle ref={ref}>Title Ref Test</AlertTitle>
        </Alert>
      );

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
      expect(ref.current).toHaveTextContent('Title Ref Test');
    });

    it('forwards ref to AlertDescription', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <Alert>
          <AlertDescription ref={ref}>Description Ref Test</AlertDescription>
        </Alert>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current).toHaveTextContent('Description Ref Test');
    });
  });

  describe('Complex Content', () => {
    it('renders with custom content', () => {
      render(
        <Alert>
          <AlertTitle>Complex Alert</AlertTitle>
          <AlertDescription>
            <div>
              <p>This alert contains complex content.</p>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
              </ul>
              <button type="button">Action</button>
            </div>
          </AlertDescription>
        </Alert>
      );

      expect(screen.getByText('This alert contains complex content.')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('renders with multiple alerts', () => {
      render(
        <div>
          <Alert variant="default">
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>Informational message.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Error message.</AlertDescription>
          </Alert>
        </div>
      );

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);
      expect(alerts[0]).toHaveClass('bg-background');
      expect(alerts[1]).toHaveClass('border-destructive/50');
    });
  });
});