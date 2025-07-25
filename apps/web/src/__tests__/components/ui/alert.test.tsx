/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest } from '@/__tests__/test-helpers';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
describe('Alert Components', () => {
  describe('Alert Component', () => {
    it('renders with default variant', () => {
      renderWithProviders(<Alert>Default alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert.className).toContain('bg-background');
      expect(alert.className).toContain('text-foreground');
    });

    it('renders with destructive variant', () => {
      renderWithProviders(<Alert variant="destructive">Error alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('border-destructive/50');
      expect(alert.className).toContain('text-destructive');
      expect(alert.className).toContain('dark:border-destructive');
    });

    it('applies custom className', () => {
      renderWithProviders(<Alert className="custom-alert">Custom alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('custom-alert');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      renderWithProviders(<Alert ref={ref}>Ref alert</Alert>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current?.textContent).toBe('Ref alert');
    });

    it('applies base styles correctly', () => {
      renderWithProviders(<Alert>Styled alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('relative');
      expect(alert.className).toContain('w-full');
      expect(alert.className).toContain('rounded-lg');
      expect(alert.className).toContain('border');
      expect(alert.className).toContain('p-4');
    });

    it('applies icon-related styles', () => {
      renderWithProviders(<Alert>Icon alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('[&>svg~*]:pl-7');
      expect(alert.className).toContain('[&>svg+div]:translate-y-[-3px]');
      expect(alert.className).toContain('[&>svg]:absolute');
      expect(alert.className).toContain('[&>svg]:left-4');
      expect(alert.className).toContain('[&>svg]:top-4');
      expect(alert.className).toContain('[&>svg]:text-foreground');
    });

    it('renders with icon and applies correct styles to icon', () => {
      renderWithProviders(<Alert>
          <svg data-testid="alert-icon" />
          Alert with icon
        </Alert>
      );
      const alert = screen.getByRole('alert');
      const icon = screen.getByTestId('alert-icon');
      expect(icon).toBeInTheDocument();
      expect(alert.className).toContain('[&>svg]:text-foreground');
    });

    it('renders with destructive variant and icon', () => {
      renderWithProviders(<Alert variant="destructive">
          <svg data-testid="alert-icon" />
          Destructive alert with icon
        </Alert>
      );
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('[&>svg]:text-destructive');
    });

    it('forwards HTML div props', () => {
      renderWithProviders(<Alert
          id="test-alert"
          data-testid="alert-test"
          aria-label="Test alert"
        >
          Props alert
        </Alert>
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('id', 'test-alert');
      expect(alert).toHaveAttribute('data-testid', 'alert-test');
      expect(alert).toHaveAttribute('aria-label', 'Test alert');
    });
  });

  describe('AlertTitle Component', () => {
    it('renders as h5 element', () => {
      renderWithProviders(<AlertTitle>Alert Title</AlertTitle>);
      const title = screen.getByText('Alert Title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H5');
    });

    it('applies custom className', () => {
      renderWithProviders(<AlertTitle className="custom-title">Custom Title</AlertTitle>);
      const title = screen.getByText('Custom Title');
      expect(title).toHaveClass('custom-title');
    });

    it('applies base styles correctly', () => {
      renderWithProviders(<AlertTitle>Styled Title</AlertTitle>);
      const title = screen.getByText('Styled Title');
      expect(title.className).toContain('mb-1');
      expect(title.className).toContain('font-medium');
      expect(title.className).toContain('leading-none');
      expect(title.className).toContain('tracking-tight');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      renderWithProviders(<AlertTitle ref={ref}>Ref Title</AlertTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
      expect(ref.current?.textContent).toBe('Ref Title');
    });

    it('forwards HTML heading props', () => {
      renderWithProviders(<AlertTitle
          id="alert-title"
          data-testid="title-test"
          aria-level={3}
        >
          Props Title
        </AlertTitle>
      );
      const title = screen.getByText('Props Title');
      expect(title).toHaveAttribute('id', 'alert-title');
      expect(title).toHaveAttribute('data-testid', 'title-test');
      expect(title).toHaveAttribute('aria-level', '3');
    });
  });

  describe('AlertDescription Component', () => {
    it('renders as div element', () => {
      renderWithProviders(<AlertDescription>Alert Description</AlertDescription>);
      const description = screen.getByText('Alert Description');
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('DIV');
    });

    it('applies custom className', () => {
      renderWithProviders(<AlertDescription className="custom-description">
          Custom Description
        </AlertDescription>
      );
      const description = screen.getByText('Custom Description');
      expect(description).toHaveClass('custom-description');
    });

    it('applies base styles correctly', () => {
      renderWithProviders(<AlertDescription>Styled Description</AlertDescription>);
      const description = screen.getByText('Styled Description');
      expect(description.className).toContain('text-sm');
      expect(description.className).toContain('[&_p]:leading-relaxed');
    });

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>();
      renderWithProviders(<AlertDescription ref={ref}>Ref Description</AlertDescription>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current?.textContent).toBe('Ref Description');
    });

    it('forwards HTML div props', () => {
      renderWithProviders(<AlertDescription
          id="alert-desc"
          data-testid="desc-test"
          role="status"
        >
          Props Description
        </AlertDescription>
      );
      const description = screen.getByText('Props Description');
      expect(description).toHaveAttribute('id', 'alert-desc');
      expect(description).toHaveAttribute('data-testid', 'desc-test');
      expect(description).toHaveAttribute('role', 'status');
    });

    it('applies styles to nested paragraphs', () => {
      renderWithProviders(<AlertDescription>
          <p>Paragraph in description</p>
        </AlertDescription>
      );
      const description = screen.getByText('Paragraph in description').parentElement;
      expect(description?.className).toContain('[&_p]:leading-relaxed');
    });
  });

  describe('Combined Usage', () => {
    it('renders Alert with AlertTitle and AlertDescription', () => {
      renderWithProviders(<Alert>
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            This is a warning message with important information.
          </AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      const title = screen.getByText('Warning');
      const description = screen.getByText('This is a warning message with important information.');

      expect(alert).toBeInTheDocument();
      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      expect(title.tagName).toBe('H5');
      expect(description.tagName).toBe('DIV');
    });

    it('renders destructive Alert with icon, title, and description', () => {
      renderWithProviders(<Alert variant="destructive">
          <svg data-testid="error-icon" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            An error occurred while processing your request.
          </AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      const icon = screen.getByTestId('error-icon');
      const title = screen.getByText('Error');
      const description = screen.getByText('An error occurred while processing your request.');

      expect(alert.className).toContain('border-destructive/50');
      expect(alert.className).toContain('text-destructive');
      expect(icon).toBeInTheDocument();
      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();
    });

    it('renders multiple alerts with different variants', () => {
      renderWithProviders(<div>
          <Alert>
            <AlertTitle>Info</AlertTitle>
            <AlertDescription>This is an informational message.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>This is an error message.</AlertDescription>
          </Alert>
        </div>
      );

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);
      expect(alerts[0]?.className).toContain('bg-background');
      expect(alerts[1]?.className).toContain('border-destructive/50');
    });
  });

  describe('Accessibility', () => {
    it('has correct role attribute', () => {
      renderWithProviders(<Alert>Accessible alert</Alert>);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('role', 'alert');
    });

    it('can be found by role with custom content', () => {
      renderWithProviders(<Alert>
          <AlertTitle>Accessible Title</AlertTitle>
          <AlertDescription>Accessible description content</AlertDescription>
        </Alert>
      );
      const alert = screen.getByRole('alert');
      expect(alert).toContainElement(screen.getByText('Accessible Title'));
      expect(alert).toContainElement(screen.getByText('Accessible description content'));
    });
  });

  describe('Edge Cases', () => {
    it('renders Alert without children', () => {
      const { container } = renderWithProviders(<Alert />);
      const alert = container.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
      expect(alert?.textContent).toBe('');
    });

    it('renders AlertTitle without children', () => {
      renderWithProviders(<AlertTitle />);
      const title = document.querySelector('h5');
      expect(title).toBeInTheDocument();
      expect(title?.textContent).toBe('');
    });

    it('renders AlertDescription without children', () => {
      const { container } = renderWithProviders(<AlertDescription />);
      const description = container.firstChild;
      expect(description).toBeInTheDocument();
      expect(description?.textContent).toBe('');
    });

    it('handles multiple classNames correctly', () => {
      renderWithProviders(<Alert className="mt-4 mb-2 custom-alert">
          <AlertTitle className="text-lg custom-title">Title</AlertTitle>
          <AlertDescription className="text-xs custom-desc">
            Description
          </AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      const title = screen.getByText('Title');
      const description = screen.getByText('Description');

      expect(alert).toHaveClass('mt-4', 'mb-2', 'custom-alert');
      expect(title).toHaveClass('text-lg', 'custom-title');
      expect(description).toHaveClass('text-xs', 'custom-desc');
    });
  });
});