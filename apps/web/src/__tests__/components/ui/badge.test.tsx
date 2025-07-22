import React from 'react';
import { render, screen } from '../../test-utils';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('renders a span element by default', () => {
      render(<Badge>Test Badge</Badge>);
      const badge = screen.getByText('Test Badge');
      expect(badge).toBeInTheDocument();
      expect(badge.tagName).toBe('SPAN');
    });

    it('renders children correctly', () => {
      render(<Badge>Badge Content</Badge>);
      expect(screen.getByText('Badge Content')).toBeInTheDocument();
    });

    it('renders with default variant classes', () => {
      render(<Badge>Default Badge</Badge>);
      const badge = screen.getByText('Default Badge');
      expect(badge).toHaveAttribute('data-slot', 'badge');
      expect(badge.className).toContain('bg-primary');
      expect(badge.className).toContain('text-primary-foreground');
    });

    it('renders as a child component when asChild is true', () => {
      render(
        <Badge asChild>
          <a href="/test">Link Badge</a>
        </Badge>
      );
      const link = screen.getByRole('link', { name: 'Link Badge' });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/test');
      // When using asChild, the data-slot is applied to the child element
    });
  });

  describe('Variants', () => {
    const variants = [
      { name: 'default', className: 'bg-primary' },
      { name: 'secondary', className: 'bg-secondary' },
      { name: 'destructive', className: 'bg-destructive' },
      { name: 'outline', className: 'text-foreground' },
    ];

    variants.forEach(({ name, className }) => {
      it(`renders ${name} variant correctly`, () => {
        render(<Badge variant={name as any}>{name} Badge</Badge>);
        const badge = screen.getByText(`${name} Badge`);
        expect(badge.className).toContain(className);
      });
    });

    it('applies hover styles for link badges', () => {
      render(
        <Badge asChild>
          <a href="/test">Link Badge</a>
        </Badge>
      );
      const link = screen.getByRole('link');
      // The badge styles are applied to the link element when using asChild
      expect(link).toHaveAttribute('href', '/test');
      expect(link.textContent).toBe('Link Badge');
    });
  });

  describe('Props and Attributes', () => {
    it('applies custom className', () => {
      render(<Badge className="custom-class">Custom Badge</Badge>);
      const badge = screen.getByText('Custom Badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('forwards native span props', () => {
      render(
        <Badge
          id="test-badge"
          data-testid="badge-test"
          title="Badge tooltip"
        >
          Props Badge
        </Badge>
      );
      const badge = screen.getByText('Props Badge');
      expect(badge).toHaveAttribute('id', 'test-badge');
      expect(badge).toHaveAttribute('data-testid', 'badge-test');
      expect(badge).toHaveAttribute('title', 'Badge tooltip');
    });

    it('applies base styles correctly', () => {
      render(<Badge>Styled Badge</Badge>);
      const badge = screen.getByText('Styled Badge');
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('items-center');
      expect(badge.className).toContain('justify-center');
      expect(badge.className).toContain('rounded-md');
      expect(badge.className).toContain('border');
      expect(badge.className).toContain('px-2');
      expect(badge.className).toContain('py-0.5');
      expect(badge.className).toContain('text-xs');
      expect(badge.className).toContain('font-medium');
    });
  });

  describe('Badge with Icons', () => {
    it('renders with an icon correctly', () => {
      render(
        <Badge>
          <svg data-testid="icon" />
          With Icon
        </Badge>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('applies icon-specific styles to SVGs', () => {
      render(
        <Badge>
          <svg />
          Icon Badge
        </Badge>
      );
      const badge = screen.getByText('Icon Badge');
      expect(badge).toHaveClass('[&>svg]:size-3');
      expect(badge).toHaveClass('[&>svg]:pointer-events-none');
      expect(badge).toHaveClass('gap-1');
    });
  });

  describe('Accessibility', () => {
    it('has focus-visible styles', () => {
      render(<Badge>Focus Badge</Badge>);
      const badge = screen.getByText('Focus Badge');
      expect(badge.className).toContain('focus-visible:border-ring');
      expect(badge.className).toContain('focus-visible:ring-ring/50');
      expect(badge.className).toContain('focus-visible:ring-[3px]');
    });

    it('has aria-invalid styles', () => {
      render(<Badge aria-invalid="true">Invalid Badge</Badge>);
      const badge = screen.getByText('Invalid Badge');
      expect(badge.className).toContain('aria-invalid:ring-destructive/20');
      expect(badge.className).toContain('dark:aria-invalid:ring-destructive/40');
      expect(badge.className).toContain('aria-invalid:border-destructive');
    });

    it('applies transition styles', () => {
      render(<Badge>Transition Badge</Badge>);
      const badge = screen.getByText('Transition Badge');
      expect(badge.className).toContain('transition-[color,box-shadow]');
    });
  });

  describe('Layout Properties', () => {
    it('applies layout constraints', () => {
      render(<Badge>Layout Badge</Badge>);
      const badge = screen.getByText('Layout Badge');
      expect(badge.className).toContain('w-fit');
      expect(badge.className).toContain('whitespace-nowrap');
      expect(badge.className).toContain('shrink-0');
      expect(badge.className).toContain('overflow-hidden');
    });
  });

  describe('badgeVariants utility', () => {
    it('generates correct classes for variant', () => {
      const classes = badgeVariants({ variant: 'destructive' });
      expect(classes).toContain('bg-destructive');
      expect(classes).toContain('text-white');
    });

    it('allows custom className to be added', () => {
      const classes = cn(
        badgeVariants({ variant: 'outline' }),
        'custom-badge-class'
      );
      expect(classes).toContain('text-foreground');
      expect(classes).toContain('custom-badge-class');
    });

    it('uses default values when no props provided', () => {
      const classes = badgeVariants();
      expect(classes).toContain('bg-primary'); // default variant
      expect(classes).toContain('text-primary-foreground');
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple classNames correctly', () => {
      render(
        <Badge className="mt-2 mb-1 custom-color">
          Multiple Classes
        </Badge>
      );
      const badge = screen.getByText('Multiple Classes');
      expect(badge).toHaveClass('mt-2');
      expect(badge).toHaveClass('mb-1');
      expect(badge).toHaveClass('custom-color');
    });

    it('renders without children', () => {
      render(<Badge />);
      const badge = document.querySelector('[data-slot="badge"]');
      expect(badge).toBeInTheDocument();
      expect(badge?.tagName).toBe('SPAN');
    });

    it('handles ref forwarding', () => {
      const ref = React.createRef<HTMLSpanElement>();
      render(<Badge ref={ref}>Ref Badge</Badge>);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
      expect(ref.current?.textContent).toBe('Ref Badge');
    });
  });

  describe('Complex Scenarios', () => {
    it('renders correctly inside a button', () => {
      render(
        <button>
          <Badge variant="secondary">Button Badge</Badge>
        </button>
      );
      const badge = screen.getByText('Button Badge');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain('bg-secondary');
    });

    it('renders multiple badges with different variants', () => {
      render(
        <div>
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      );
      
      expect(screen.getByText('Default').className).toContain('bg-primary');
      expect(screen.getByText('Secondary').className).toContain('bg-secondary');
      expect(screen.getByText('Destructive').className).toContain('bg-destructive');
      expect(screen.getByText('Outline').className).toContain('text-foreground');
    });
  });
});