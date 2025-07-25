import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest } from '@/__tests__/test-helpers';
import { InlineLoading, Loading, PageLoading } from '@/components/loading';
// Mock lucide-react
jest.mock('lucide-react', () => ({
  Loader2: ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg 
      data-testid="loader-icon" 
      className={className} 
      {...props}
    />
  ),
}));

describe('Loading Components', () => {
  describe('Loading Component', () => {
    it('renders with default size', () => {
      renderWithProviders(<Loading />);
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toBeInTheDocument();
      expect(loader).toHaveClass('h-6');
      expect(loader).toHaveClass('w-6');
    });

    it('renders with small size', () => {
      renderWithProviders(<Loading size="sm" />);
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toHaveClass('h-4');
      expect(loader).toHaveClass('w-4');
    });

    it('renders with medium size', () => {
      renderWithProviders(<Loading size="md" />);
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toHaveClass('h-6');
      expect(loader).toHaveClass('w-6');
    });

    it('renders with large size', () => {
      renderWithProviders(<Loading size="lg" />);
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toHaveClass('h-8');
      expect(loader).toHaveClass('w-8');
    });

    it('renders with text', () => {
      renderWithProviders(<Loading text="Loading data..." />);
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      const text = screen.getByText('Loading data...');
      expect(text).toHaveClass('mt-2');
      expect(text.className).toContain('text-sm');
      expect(text.className).toContain('text-semantic-tertiary');
    });

    it('renders without text when not provided', () => {
      renderWithProviders(<Loading />);
      expect(screen.queryByText(/./)).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderWithProviders(<Loading className="custom-loading" />);
      const container = screen.getByTestId('loader-icon').parentElement;
      expect(container).toHaveClass('custom-loading');
    });

    it('applies default container styles', () => {
      renderWithProviders(<Loading />);
      const container = screen.getByTestId('loader-icon').parentElement;
      expect(container?.className).toContain('flex');
      expect(container?.className).toContain('flex-col');
      expect(container?.className).toContain('items-center');
      expect(container?.className).toContain('justify-center');
      expect(container?.className).toContain('p-8');
    });

    it('applies animation and color styles to loader', () => {
      renderWithProviders(<Loading />);
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toHaveClass('animate-spin');
      expect(loader).toHaveClass('text-semantic-info');
    });

    it('combines size and text props correctly', () => {
      renderWithProviders(<Loading size="lg" text="Please wait..." />);
      const loader = screen.getByTestId('loader-icon');
      const text = screen.getByText('Please wait...');
      
      expect(loader).toHaveClass('h-8');
      expect(loader).toHaveClass('w-8');
      expect(text).toBeInTheDocument();
    });

    it('overrides default padding with custom className', () => {
      renderWithProviders(<Loading className="p-4" />);
      const container = screen.getByTestId('loader-icon').parentElement;
      expect(container?.className).toContain('p-4');
    });
  });

  describe('PageLoading Component', () => {
    it('renders with default text', () => {
      renderWithProviders(<PageLoading />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with custom text', () => {
      renderWithProviders(<PageLoading text="Fetching your data..." />);
      expect(screen.getByText('Fetching your data...')).toBeInTheDocument();
    });

    it('uses large size loader', () => {
      renderWithProviders(<PageLoading />);
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toHaveClass('h-8');
      expect(loader).toHaveClass('w-8');
    });

    it('applies min-height container styles', () => {
      renderWithProviders(<PageLoading />);
      const container = screen.getByTestId('loader-icon').parentElement?.parentElement;
      expect(container?.className).toContain('min-h-[400px]');
      expect(container?.className).toContain('flex');
      expect(container?.className).toContain('items-center');
      expect(container?.className).toContain('justify-center');
    });

    it('renders Loading component inside with correct props', () => {
      renderWithProviders(<PageLoading text="Custom loading..." />);
      const loader = screen.getByTestId('loader-icon');
      const text = screen.getByText('Custom loading...');
      
      // Verify it's using the Loading component with size="lg"
      expect(loader).toHaveClass('h-8');
      expect(loader).toHaveClass('w-8');
      expect(text).toBeInTheDocument();
    });
  });

  describe('InlineLoading Component', () => {
    it('renders with small size loader', () => {
      renderWithProviders(<InlineLoading />);
      const loader = screen.getByTestId('loader-icon');
      expect(loader).toHaveClass('h-4');
      expect(loader).toHaveClass('w-4');
    });

    it('renders without text by default', () => {
      renderWithProviders(<InlineLoading />);
      expect(screen.queryByText(/./)).not.toBeInTheDocument();
    });

    it('renders with custom text', () => {
      renderWithProviders(<InlineLoading text="Saving..." />);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('applies reduced padding', () => {
      renderWithProviders(<InlineLoading />);
      const container = screen.getByTestId('loader-icon').parentElement;
      expect(container?.className).toContain('p-4');
    });

    it('renders Loading component with correct props', () => {
      renderWithProviders(<InlineLoading text="Processing..." />);
      const loader = screen.getByTestId('loader-icon');
      const text = screen.getByText('Processing...');
      
      // Verify it's using the Loading component with size="sm"
      expect(loader).toHaveClass('h-4');
      expect(loader).toHaveClass('w-4');
      expect(text).toBeInTheDocument();
    });
  });

  describe('Integration Scenarios', () => {
    it('renders multiple loading components simultaneously', () => {
      renderWithProviders(<div>
          <Loading size="sm" text="Small loading" />
          <PageLoading text="Page loading" />
          <InlineLoading text="Inline loading" />
        </div>
      );

      const loaders = screen.getAllByTestId('loader-icon');
      expect(loaders).toHaveLength(3);
      
      // Check sizes
      expect(loaders[0]).toHaveClass('h-4'); // small
      expect(loaders[1]).toHaveClass('h-8'); // large (PageLoading)
      expect(loaders[2]).toHaveClass('h-4'); // small (InlineLoading)
      
      // Check texts
      expect(screen.getByText('Small loading')).toBeInTheDocument();
      expect(screen.getByText('Page loading')).toBeInTheDocument();
      expect(screen.getByText('Inline loading')).toBeInTheDocument();
    });

    it('can be used inside other components', () => {
      const Card = ({ isLoading }: { isLoading: boolean }) => (
        <div className="card">
          {isLoading ? (
            <InlineLoading text="Loading card content..." />
          ) : (
            <div>Card content</div>
          )}
        </div>
      );

      const { rerender } = renderWithProviders(<Card isLoading={true} />);
      expect(screen.getByText('Loading card content...')).toBeInTheDocument();

      rerender(<Card isLoading={false} />);
      expect(screen.queryByText('Loading card content...')).not.toBeInTheDocument();
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('loader icon is not focusable', () => {
      renderWithProviders(<Loading />);
      const loader = screen.getByTestId('loader-icon');
      expect(loader).not.toHaveAttribute('tabindex');
    });

    it('provides loading context with text', () => {
      renderWithProviders(<Loading text="Please wait while we load your data" />);
      const text = screen.getByText('Please wait while we load your data');
      expect(text).toBeInTheDocument();
      expect(text.tagName).toBe('P');
    });

    it('can be wrapped with aria-live region', () => {
      renderWithProviders(<div aria-live="polite" aria-busy="true">
          <Loading text="Loading..." />
        </div>
      );
      const liveRegion = screen.getByText('Loading...').parentElement?.parentElement;
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string text', () => {
      renderWithProviders(<Loading text="" />);
      // Text element should not be rendered for empty string
      const container = screen.getByTestId('loader-icon').parentElement;
      const paragraphs = container?.querySelectorAll('p');
      expect(paragraphs).toHaveLength(0);
    });

    it('handles very long text', () => {
      const longText = 'This is a very long loading message that might wrap to multiple lines in a narrow container';
      renderWithProviders(<Loading text={longText} />);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('maintains consistent spacing with different sizes', () => {
      const { rerender } = renderWithProviders(<Loading size="sm" text="Loading..." />);
      let text = screen.getByText('Loading...');
      expect(text).toHaveClass('mt-2');

      rerender(<Loading size="md" text="Loading..." />);
      text = screen.getByText('Loading...');
      expect(text).toHaveClass('mt-2');

      rerender(<Loading size="lg" text="Loading..." />);
      text = screen.getByText('Loading...');
      expect(text).toHaveClass('mt-2');
    });
  });
});