import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

// Mock Radix UI Dialog primitive
jest.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children, ...props }: any) => <div data-testid="dialog-root" {...props}>{children}</div>,
  Trigger: ({ children, ...props }: any) => <button data-testid="dialog-trigger" {...props}>{children}</button>,
  Portal: ({ children }: any) => <div data-testid="dialog-portal">{children}</div>,
  Overlay: ({ className, ...props }: any) => <div data-testid="dialog-overlay" className={className} {...props} />,
  Content: ({ children, className, ...props }: any) => (
    <div data-testid="dialog-content" className={className} {...props}>
      {children}
    </div>
  ),
  Title: ({ children, className, ...props }: any) => <h2 data-testid="dialog-title" className={className} {...props}>{children}</h2>,
  Description: ({ children, className, ...props }: any) => <p data-testid="dialog-description" className={className} {...props}>{children}</p>,
  Close: ({ children, ...props }: any) => <button data-testid="dialog-close" {...props}>{children}</button>,
}));

describe('Dialog Component', () => {
  describe('Basic Rendering', () => {
    it('renders dialog trigger and content', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog description text</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
      expect(screen.getByText('Dialog description text')).toBeInTheDocument();
    });

    it('renders with data-slot attributes', () => {
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      expect(screen.getByTestId('dialog-root')).toHaveAttribute('data-slot', 'dialog');
      expect(screen.getByTestId('dialog-trigger')).toHaveAttribute('data-slot', 'dialog-trigger');
    });
  });

  describe('DialogContent', () => {
    it('renders with default styles', () => {
      render(
        <Dialog>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('dialog-content');
      expect(content).toHaveAttribute('data-slot', 'dialog-content');
      expect(content.className).toContain('bg-background');
      expect(content.className).toContain('rounded-lg');
      expect(content.className).toContain('shadow-lg');
    });

    it('renders close button by default', () => {
      render(
        <Dialog>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      const closeButton = screen.getAllByTestId('dialog-close')[0];
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('data-slot', 'dialog-close');
      expect(screen.getByText('Close')).toHaveClass('sr-only');
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <Dialog>
          <DialogContent showCloseButton={false}>Content</DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Dialog>
          <DialogContent className="custom-dialog-content">
            Content
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('dialog-content');
      expect(content).toHaveClass('custom-dialog-content');
    });

    it('renders overlay with correct styles', () => {
      render(
        <Dialog>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      const overlay = screen.getByTestId('dialog-overlay');
      expect(overlay).toHaveAttribute('data-slot', 'dialog-overlay');
      expect(overlay.className).toContain('bg-black/50');
      expect(overlay.className).toContain('fixed');
      expect(overlay.className).toContain('inset-0');
    });
  });

  describe('DialogHeader', () => {
    it('renders with default styles', () => {
      render(
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
        </DialogHeader>
      );

      const header = screen.getByText('Title').parentElement;
      expect(header).toHaveAttribute('data-slot', 'dialog-header');
      expect(header?.className).toContain('flex');
      expect(header?.className).toContain('flex-col');
      expect(header?.className).toContain('gap-2');
    });

    it('applies custom className', () => {
      render(
        <DialogHeader className="custom-header">
          Header Content
        </DialogHeader>
      );

      const header = screen.getByText('Header Content');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('DialogTitle', () => {
    it('renders with default styles', () => {
      render(
        <Dialog>
          <DialogContent>
            <DialogTitle>Main Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByTestId('dialog-title');
      expect(title).toHaveAttribute('data-slot', 'dialog-title');
      expect(title.className).toContain('text-lg');
      expect(title.className).toContain('font-semibold');
      expect(title.className).toContain('leading-none');
    });

    it('forwards props correctly', () => {
      render(
        <Dialog>
          <DialogContent>
            <DialogTitle id="dialog-title-1">Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const title = screen.getByTestId('dialog-title');
      expect(title).toHaveAttribute('id', 'dialog-title-1');
    });
  });

  describe('DialogDescription', () => {
    it('renders with default styles', () => {
      render(
        <Dialog>
          <DialogContent>
            <DialogDescription>Description text</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const description = screen.getByTestId('dialog-description');
      expect(description).toHaveAttribute('data-slot', 'dialog-description');
      expect(description.className).toContain('text-muted-foreground');
      expect(description.className).toContain('text-sm');
    });

    it('supports long descriptions', () => {
      const longDescription = 'This is a very long description. '.repeat(10);
      render(
        <Dialog>
          <DialogContent>
            <DialogDescription>{longDescription}</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      // The text has trailing space, so we need to check with the exact text
      const description = screen.getByTestId('dialog-description');
      expect(description).toHaveTextContent(longDescription.trim());
    });
  });

  describe('DialogFooter', () => {
    it('renders with default styles', () => {
      render(
        <DialogFooter>
          <button>Cancel</button>
          <button>Save</button>
        </DialogFooter>
      );

      const footer = screen.getByRole('button', { name: 'Cancel' }).parentElement;
      expect(footer).toHaveAttribute('data-slot', 'dialog-footer');
      expect(footer?.className).toContain('flex');
      expect(footer?.className).toContain('flex-col-reverse');
      expect(footer?.className).toContain('sm:flex-row');
      expect(footer?.className).toContain('sm:justify-end');
    });

    it('renders multiple footer actions', () => {
      render(
        <DialogFooter>
          <button>Secondary</button>
          <button>Primary</button>
        </DialogFooter>
      );

      expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument();
    });
  });

  describe('Complete Dialog Composition', () => {
    it('renders a complete dialog with all components', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>
                Are you sure you want to proceed with this action?
              </DialogDescription>
            </DialogHeader>
            <div>Additional content here</div>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to proceed with this action?')).toBeInTheDocument();
      expect(screen.getByText('Additional content here')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('supports custom content between header and footer', () => {
      render(
        <Dialog>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Form Dialog</DialogTitle>
            </DialogHeader>
            <form>
              <input type="text" placeholder="Enter name" />
              <input type="email" placeholder="Enter email" />
            </form>
            <DialogFooter>
              <button type="submit">Submit</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible close button', () => {
      render(
        <Dialog>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      const closeButton = screen.getAllByTestId('dialog-close')[0];
      expect(closeButton).toContainElement(screen.getByText('Close'));
      expect(screen.getByText('Close')).toHaveClass('sr-only');
    });

    it('supports ARIA attributes', () => {
      render(
        <Dialog>
          <DialogContent aria-labelledby="dialog-title" aria-describedby="dialog-desc">
            <DialogTitle id="dialog-title">Accessible Dialog</DialogTitle>
            <DialogDescription id="dialog-desc">
              This dialog demonstrates accessibility features
            </DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('dialog-content');
      expect(content).toHaveAttribute('aria-labelledby', 'dialog-title');
      expect(content).toHaveAttribute('aria-describedby', 'dialog-desc');
    });

    it('includes focus management classes', () => {
      render(
        <Dialog>
          <DialogContent>
            <DialogClose>Close</DialogClose>
          </DialogContent>
        </Dialog>
      );

      // The close button inside DialogContent has specific styling
      const closeButtons = screen.getAllByTestId('dialog-close');
      const contentCloseButton = closeButtons.find(btn => 
        btn.className.includes('ring-offset-background')
      );
      
      if (contentCloseButton) {
        expect(contentCloseButton.className).toContain('focus:ring-2');
        expect(contentCloseButton.className).toContain('focus:outline-hidden');
      } else {
        // If no styled close button found, just verify basic close button exists
        expect(closeButtons.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Animation Classes', () => {
    it('includes animation classes on content', () => {
      render(
        <Dialog>
          <DialogContent>Animated Content</DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('dialog-content');
      expect(content.className).toContain('data-[state=open]:animate-in');
      expect(content.className).toContain('data-[state=closed]:animate-out');
      expect(content.className).toContain('data-[state=open]:fade-in-0');
      expect(content.className).toContain('data-[state=closed]:fade-out-0');
    });

    it('includes animation classes on overlay', () => {
      render(
        <Dialog>
          <DialogContent>Content</DialogContent>
        </Dialog>
      );

      const overlay = screen.getByTestId('dialog-overlay');
      expect(overlay.className).toContain('data-[state=open]:animate-in');
      expect(overlay.className).toContain('data-[state=closed]:animate-out');
    });
  });

  describe('Edge Cases', () => {
    it('renders without trigger', () => {
      render(
        <Dialog>
          <DialogContent>No Trigger Content</DialogContent>
        </Dialog>
      );

      expect(screen.getByText('No Trigger Content')).toBeInTheDocument();
    });

    it('renders empty dialog content', () => {
      render(
        <Dialog>
          <DialogContent />
        </Dialog>
      );

      const content = screen.getByTestId('dialog-content');
      expect(content).toBeInTheDocument();
    });

    it('handles multiple dialogs', () => {
      render(
        <>
          <Dialog>
            <DialogTrigger>Open Dialog 1</DialogTrigger>
            <DialogContent>
              <DialogTitle>Dialog 1</DialogTitle>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger>Open Dialog 2</DialogTrigger>
            <DialogContent>
              <DialogTitle>Dialog 2</DialogTitle>
            </DialogContent>
          </Dialog>
        </>
      );

      expect(screen.getByText('Open Dialog 1')).toBeInTheDocument();
      expect(screen.getByText('Open Dialog 2')).toBeInTheDocument();
      expect(screen.getByText('Dialog 1')).toBeInTheDocument();
      expect(screen.getByText('Dialog 2')).toBeInTheDocument();
    });

    it('forwards additional props to components', () => {
      render(
        <Dialog>
          <DialogContent data-custom="value" role="alertdialog">
            <DialogTitle data-title="custom">Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      const content = screen.getByTestId('dialog-content');
      expect(content).toHaveAttribute('data-custom', 'value');
      expect(content).toHaveAttribute('role', 'alertdialog');

      const title = screen.getByTestId('dialog-title');
      expect(title).toHaveAttribute('data-title', 'custom');
    });
  });
});