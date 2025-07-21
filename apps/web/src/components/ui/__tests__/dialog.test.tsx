import React from 'react';
import { render, screen, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { setupTest, cleanupTest } from '@/__tests__/frontend-test-helpers';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../dialog';

describe('Dialog', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Basic Functionality', () => {
    it('renders closed by default', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>This is a test dialog</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
      expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
    });

    it('opens when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>This is a test dialog</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByText('Test Dialog')).toBeInTheDocument();
        expect(screen.getByText('This is a test dialog')).toBeInTheDocument();
      });
    });

    it('shows close button by default', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('hides close button when showCloseButton is false', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByText('Test Dialog')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
      });
    });

    it('closes when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));
      await waitFor(() => expect(screen.getByText('Test Dialog')).toBeInTheDocument());

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Controlled State', () => {
    it('respects controlled open state', () => {
      const { rerender } = render(
        <Dialog open={false}>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Controlled Dialog')).not.toBeInTheDocument();

      rerender(
        <Dialog open={true}>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
    });

    it('calls onOpenChange when state changes', async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = jest.fn();
      
      render(
        <Dialog onOpenChange={mockOnOpenChange}>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      expect(mockOnOpenChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Dialog Components', () => {
    it('renders header and footer sections', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Header Title</DialogTitle>
              <DialogDescription>Header Description</DialogDescription>
            </DialogHeader>
            <div>Body Content</div>
            <DialogFooter>
              <button>Cancel</button>
              <button>Submit</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        expect(screen.getByText('Header Title')).toBeInTheDocument();
        expect(screen.getByText('Header Description')).toBeInTheDocument();
        expect(screen.getByText('Body Content')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Submit')).toBeInTheDocument();
      });
    });

    it('applies custom className to components', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent className="custom-content">
            <DialogHeader className="custom-header">
              <DialogTitle className="custom-title">Title</DialogTitle>
              <DialogDescription className="custom-description">
                Description
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="custom-footer">
              <button>Action</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const content = screen.getByRole('dialog');
        expect(content).toHaveClass('custom-content');
        
        const header = content.querySelector('[data-slot="dialog-header"]');
        expect(header).toHaveClass('custom-header');
        
        const title = screen.getByText('Title');
        expect(title).toHaveClass('custom-title');
        
        const description = screen.getByText('Description');
        expect(description).toHaveClass('custom-description');
        
        const footer = content.querySelector('[data-slot="dialog-footer"]');
        expect(footer).toHaveClass('custom-footer');
      });
    });
  });

  describe('Overlay Behavior', () => {
    it('shows overlay when dialog is open', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        const overlay = document.querySelector('[data-slot="dialog-overlay"]');
        expect(overlay).toBeInTheDocument();
        expect(overlay).toHaveClass('bg-black/50');
      });
    });

    it('closes dialog when overlay is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));
      await waitFor(() => expect(screen.getByText('Test Dialog')).toBeInTheDocument());

      const overlay = document.querySelector('[data-slot="dialog-overlay"]');
      await user.click(overlay!);

      await waitFor(() => {
        expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('closes on Escape key', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));
      await waitFor(() => expect(screen.getByText('Test Dialog')).toBeInTheDocument());

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
      });
    });

    it('traps focus within dialog', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
            </DialogHeader>
            <button>First Button</button>
            <button>Second Button</button>
            <DialogFooter>
              <DialogClose>Close</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));
      await waitFor(() => expect(screen.getByText('Test Dialog')).toBeInTheDocument());

      // Tab through elements
      await user.tab();
      expect(document.activeElement).toHaveTextContent('First Button');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Second Button');

      await user.tab();
      expect(document.activeElement).toHaveTextContent('Close');

      // Should cycle back to close button (X)
      await user.tab();
      expect(document.activeElement).toHaveAttribute('aria-label', expect.stringContaining('Close'));
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Accessible Dialog</DialogTitle>
            <DialogDescription>This dialog is accessible</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby');
        expect(dialog).toHaveAttribute('aria-describedby');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('announces dialog opening to screen readers', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Screen Reader Dialog</DialogTitle>
            <DialogDescription>This will be announced</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const title = screen.getByText('Screen Reader Dialog');
        const description = screen.getByText('This will be announced');
        
        expect(dialog).toHaveAttribute('aria-labelledby', title.id);
        expect(dialog).toHaveAttribute('aria-describedby', description.id);
      });
    });

    it('provides accessible close button', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveAttribute('aria-label');
        expect(closeButton.querySelector('.sr-only')).toHaveTextContent('Close');
      });
    });

    it('manages focus correctly', async () => {
      const user = userEvent.setup();
      const triggerRef = React.createRef<HTMLButtonElement>();
      
      render(
        <Dialog>
          <DialogTrigger ref={triggerRef}>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Focus Test Dialog</DialogTitle>
            <button autoFocus>Focused Button</button>
          </DialogContent>
        </Dialog>
      );

      const trigger = screen.getByText('Open Dialog');
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      await user.click(trigger);

      await waitFor(() => {
        const focusedButton = screen.getByText('Focused Button');
        expect(document.activeElement).toBe(focusedButton);
      });
    });
  });

  describe('Animation States', () => {
    it('applies animation classes', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Animated Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open Dialog'));

      await waitFor(() => {
        const content = screen.getByRole('dialog');
        expect(content).toHaveClass('data-[state=open]:animate-in');
        expect(content).toHaveClass('data-[state=closed]:animate-out');
      });
    });
  });
});