import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders a button element by default', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: 'Click me' });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('renders children correctly', () => {
      render(<Button>Button Text</Button>);
      expect(screen.getByText('Button Text')).toBeInTheDocument();
    });

    it('renders with default variant and size classes', () => {
      render(<Button>Default Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-slot', 'button');
      expect(button.className).toContain('bg-primary');
      expect(button.className).toContain('h-9');
    });

    it('renders as a child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );
      const link = screen.getByRole('link', { name: 'Link Button' });
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/test');
    });
  });

  describe('Variants', () => {
    const variants = [
      { name: 'default', className: 'bg-primary' },
      { name: 'destructive', className: 'bg-destructive' },
      { name: 'outline', className: 'border' },
      { name: 'secondary', className: 'bg-secondary' },
      { name: 'ghost', className: 'hover:bg-accent' },
      { name: 'link', className: 'text-primary' },
    ];

    variants.forEach(({ name, className }) => {
      it(`renders ${name} variant correctly`, () => {
        render(<Button variant={name as any}>{name} Button</Button>);
        const button = screen.getByRole('button');
        expect(button.className).toContain(className);
      });
    });
  });

  describe('Sizes', () => {
    const sizes = [
      { name: 'default', className: 'h-9' },
      { name: 'sm', className: 'h-8' },
      { name: 'lg', className: 'h-10' },
      { name: 'icon', className: 'size-9' },
    ];

    sizes.forEach(({ name, className }) => {
      it(`renders ${name} size correctly`, () => {
        render(<Button size={name as any}>{name} Size</Button>);
        const button = screen.getByRole('button');
        expect(button.className).toContain(className);
      });
    });
  });

  describe('Props and Attributes', () => {
    it('applies custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('forwards native button props', () => {
      render(
        <Button
          type="submit"
          disabled
          aria-label="Submit form"
          data-testid="submit-button"
        >
          Submit
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-label', 'Submit form');
      expect(button).toHaveAttribute('data-testid', 'submit-button');
    });

    it('handles onClick events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger onClick when disabled', () => {
      const handleClick = jest.fn();
      render(
        <Button onClick={handleClick} disabled>
          Disabled Button
        </Button>
      );
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct disabled styles when disabled', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:opacity-50');
      expect(button.className).toContain('disabled:pointer-events-none');
    });

    it('supports keyboard navigation', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard Button</Button>);
      const button = screen.getByRole('button');
      
      // Simulate Enter key press
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      fireEvent.keyUp(button, { key: 'Enter', code: 'Enter' });
      
      // Simulate Space key press
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      fireEvent.keyUp(button, { key: ' ', code: 'Space' });
    });

    it('has focus-visible styles', () => {
      render(<Button>Focus Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:ring-ring/50');
      expect(button.className).toContain('focus-visible:border-ring');
    });

    it('has aria-invalid styles', () => {
      render(<Button aria-invalid="true">Invalid Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('aria-invalid:ring-destructive/20');
      expect(button.className).toContain('aria-invalid:border-destructive');
    });
  });

  describe('Button with Icons', () => {
    it('renders with an icon correctly', () => {
      render(
        <Button>
          <svg data-testid="icon" />
          With Icon
        </Button>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('applies icon-specific styles to SVGs', () => {
      render(
        <Button>
          <svg />
          Icon Button
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('[&_svg]:pointer-events-none');
      expect(button.className).toContain('[&_svg]:shrink-0');
    });

    it('adjusts padding for icon-only buttons', () => {
      render(
        <Button size="icon" aria-label="Settings">
          <svg />
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button.className).toContain('size-9');
    });
  });

  describe('buttonVariants utility', () => {
    it('generates correct classes for variant combinations', () => {
      const classes = buttonVariants({ variant: 'destructive', size: 'lg' });
      expect(classes).toContain('bg-destructive');
      expect(classes).toContain('h-10');
    });

    it('allows custom className to be added', () => {
      const classes = cn(
        buttonVariants({ variant: 'outline' }),
        'custom-button-class'
      );
      expect(classes).toContain('border');
      expect(classes).toContain('custom-button-class');
    });

    it('uses default values when no props provided', () => {
      const classes = buttonVariants();
      expect(classes).toContain('bg-primary'); // default variant
      expect(classes).toContain('h-9'); // default size
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple classNames correctly', () => {
      render(
        <Button className="mt-4 mb-2 custom-color">
          Multiple Classes
        </Button>
      );
      const button = screen.getByRole('button');
      expect(button).toHaveClass('mt-4');
      expect(button).toHaveClass('mb-2');
      expect(button).toHaveClass('custom-color');
    });

    it('renders without children', () => {
      render(<Button />);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeEmptyDOMElement();
    });

    it('handles ref forwarding', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.textContent).toBe('Ref Button');
    });
  });
});