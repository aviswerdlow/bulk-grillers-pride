import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest } from '@/__tests__/test-helpers';
import { Skeleton } from '@/components/ui/skeleton';
describe('Skeleton Component', () => {
  describe('Rendering', () => {
    it('renders as a div element', () => {
      const { container } = renderWithProviders(<Skeleton />);
      const skeleton = container.firstChild;
      expect(skeleton).toBeInTheDocument();
      expect(skeleton?.nodeName).toBe('DIV');
    });

    it('applies base animation and styling classes', () => {
      const { container } = renderWithProviders(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.className).toContain('animate-pulse');
      expect(skeleton.className).toContain('rounded-md');
      expect(skeleton.className).toContain('bg-muted');
    });

    it('applies custom className', () => {
      const { container } = renderWithProviders(<Skeleton className="custom-skeleton" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('custom-skeleton');
      expect(skeleton).toHaveClass('animate-pulse'); // Still has base classes
      expect(skeleton).toHaveClass('rounded-md');
      expect(skeleton).toHaveClass('bg-muted');
    });

    it('forwards HTML div props', () => {
      const { container } = renderWithProviders(<Skeleton
          id="skeleton-loader"
          data-testid="skeleton-test"
          aria-label="Loading content"
          role="status"
        />
      );
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveAttribute('id', 'skeleton-loader');
      expect(skeleton).toHaveAttribute('data-testid', 'skeleton-test');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
      expect(skeleton).toHaveAttribute('role', 'status');
    });
  });

  describe('Styling Variations', () => {
    it('can override rounded corners with custom className', () => {
      const { container } = renderWithProviders(<Skeleton className="rounded-full" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('rounded-full');
      // Note: rounded-full will override the base rounded-md class
    });

    it('can set custom dimensions', () => {
      const { container } = renderWithProviders(<Skeleton className="h-12 w-48" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-12');
      expect(skeleton).toHaveClass('w-48');
    });

    it('can override background color', () => {
      const { container } = renderWithProviders(<Skeleton className="bg-gray-300" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('bg-gray-300');
      // Note: bg-gray-300 will override the base bg-muted class
    });

    it('can disable animation', () => {
      const { container } = renderWithProviders(<Skeleton className="animate-none" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('animate-none');
      // Note: animate-none will override animate-pulse effect
    });
  });

  describe('Common Use Cases', () => {
    it('renders as a text skeleton', () => {
      const { container } = renderWithProviders(<Skeleton className="h-4 w-[250px]" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-4');
      expect(skeleton).toHaveClass('w-[250px]');
    });

    it('renders as a card skeleton', () => {
      const { container } = renderWithProviders(<Skeleton className="h-[125px] w-full rounded-xl" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-[125px]');
      expect(skeleton).toHaveClass('w-full');
      expect(skeleton).toHaveClass('rounded-xl');
    });

    it('renders as an avatar skeleton', () => {
      const { container } = renderWithProviders(<Skeleton className="h-12 w-12 rounded-full" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-12');
      expect(skeleton).toHaveClass('w-12');
      expect(skeleton).toHaveClass('rounded-full');
    });

    it('renders multiple skeletons for list loading', () => {
      renderWithProviders(<div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      );
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('can have accessible loading text with screen reader only class', () => {
      renderWithProviders(<Skeleton role="status">
          <span className="sr-only">Loading...</span>
        </Skeleton>
      );
      const skeleton = screen.getByRole('status');
      expect(skeleton).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('works with aria-busy on parent', () => {
      renderWithProviders(<div aria-busy="true">
          <Skeleton className="h-4 w-full" />
        </div>
      );
      const parent = document.querySelector('[aria-busy="true"]');
      expect(parent).toBeInTheDocument();
      expect(parent?.firstChild).toHaveClass('animate-pulse');
    });

    it('can be labeled for specific content', () => {
      const { container } = renderWithProviders(<Skeleton 
          aria-label="Loading user profile" 
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
        />
      );
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveAttribute('aria-label', 'Loading user profile');
      expect(skeleton).toHaveAttribute('role', 'progressbar');
    });
  });

  describe('Complex Layouts', () => {
    it('renders a card skeleton with multiple elements', () => {
      renderWithProviders(<div className="card">
          <Skeleton className="h-48 w-full mb-4" /> {/* Image */}
          <Skeleton className="h-6 w-3/4 mb-2" /> {/* Title */}
          <Skeleton className="h-4 w-full mb-1" /> {/* Description line 1 */}
          <Skeleton className="h-4 w-5/6" /> {/* Description line 2 */}
        </div>
      );
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(4);
      expect(skeletons[0]).toHaveClass('h-48');
      expect(skeletons[1]).toHaveClass('h-6');
      expect(skeletons[2]).toHaveClass('h-4');
      expect(skeletons[3]).toHaveClass('h-4');
    });

    it('renders a table skeleton', () => {
      renderWithProviders(<table>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i}>
                <td><Skeleton className="h-4 w-24" /></td>
                <td><Skeleton className="h-4 w-32" /></td>
                <td><Skeleton className="h-4 w-16" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      );
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(9); // 3 rows × 3 columns
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple classNames correctly', () => {
      const { container } = renderWithProviders(<Skeleton className="h-4 w-full mt-2 mb-4 rounded-lg bg-gray-200" />
      );
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveClass('h-4', 'w-full', 'mt-2', 'mb-4', 'rounded-lg', 'bg-gray-200');
    });

    it('renders with style prop', () => {
      const { container } = renderWithProviders(<Skeleton style={{ width: '200px', height: '20px' }} />
      );
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton.style.width).toBe('200px');
      expect(skeleton.style.height).toBe('20px');
    });

    it('can be used as a child of flex container', () => {
      renderWithProviders(<div className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      );
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(3);
    });

    it('maintains animation when nested', () => {
      renderWithProviders(<Skeleton className="p-4">
          <div className="space-y-2">
            <div className="h-4 bg-white rounded" />
            <div className="h-4 bg-white rounded w-3/4" />
          </div>
        </Skeleton>
      );
      
      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('p-4');
    });
  });

  describe('Performance Considerations', () => {
    it('renders efficiently in large lists', () => {
      const items = Array.from({ length: 50 }, (_, i) => i);
      renderWithProviders(<div>
          {items.map((i) => (
            <Skeleton key={i} className="h-4 w-full mb-1" />
          ))}
        </div>
      );
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons).toHaveLength(50);
    });
  });
});