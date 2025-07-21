import React, { ReactElement } from 'react';
import { render, screen, waitFor } from '@/__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import { setupTest, cleanupTest } from '@/__tests__/frontend-test-helpers';
import { A11yTestUtils } from '../utils/A11yTestUtils';
import { useForm } from 'react-hook-form';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Info } from 'lucide-react';

describe('UI Components Accessibility', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Dialog Accessibility', () => {
    it('supports keyboard navigation for dialog', async () => {
      const TestDialog = () => {
        const [open, setOpen] = React.useState(false);
        
        return (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Accessible Dialog</DialogTitle>
                <DialogDescription>
                  This dialog demonstrates accessibility features.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="First input" />
                <Input placeholder="Second input" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button>Submit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      };

      const { container } = render(<TestDialog />);

      // Test keyboard navigation
      await A11yTestUtils.testKeyboardNavigation(
        <TestDialog />,
        {
          expectedElements: [
            { selector: 'button[aria-label*="Close"]', label: 'Close button' },
            { selector: 'input[placeholder="First input"]', label: 'First input' },
            { selector: 'input[placeholder="Second input"]', label: 'Second input' },
            { selector: 'button:has-text("Cancel")', label: 'Cancel button' },
            { selector: 'button:has-text("Submit")', label: 'Submit button' },
          ],
          initialFocus: 'button:has-text("Open Dialog")',
        }
      );
    });

    it('traps focus within dialog', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Focus Trap Test</DialogTitle>
            <Button>First Button</Button>
            <Button>Last Button</Button>
          </DialogContent>
        </Dialog>
      );

      await A11yTestUtils.testFocusTrap({
        container: screen.getByRole('dialog'),
        firstElement: screen.getByText('First Button'),
        lastElement: screen.getByText('Last Button'),
      });
    });

    it('announces dialog opening to screen readers', async () => {
      const user = userEvent.setup();
      
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Announcement Test</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Important Announcement</DialogTitle>
            <DialogDescription>
              This dialog contains important information.
            </DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const trigger = screen.getByText('Open Announcement Test');
      
      await A11yTestUtils.testScreenReaderAnnouncements(
        async () => {
          await user.click(trigger);
        },
        'Important Announcement',
        { timeout: 1000 }
      );
    });

    it('has sufficient color contrast in dialog', async () => {
      const { container } = render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Contrast Test Dialog</DialogTitle>
            <DialogDescription>
              Testing color contrast for accessibility.
            </DialogDescription>
            <Button>Action Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="destructive">Delete</Button>
          </DialogContent>
        </Dialog>
      );

      await A11yTestUtils.testColorContrast(
        container as ReactElement,
        { minContrastRatio: 4.5 }
      );
    });
  });

  describe('Alert Accessibility', () => {
    it('properly announces alerts to screen readers', async () => {
      const TestAlert = () => {
        const [showAlert, setShowAlert] = React.useState(false);
        
        return (
          <div>
            <Button onClick={() => setShowAlert(true)}>Show Alert</Button>
            {showAlert && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important Notice</AlertTitle>
                <AlertDescription>
                  This is an important accessibility announcement.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      };

      const { rerender } = render(<TestAlert />);
      
      await A11yTestUtils.testScreenReaderAnnouncements(
        async () => {
          const button = screen.getByText('Show Alert');
          await userEvent.click(button);
        },
        'Important Notice',
        { timeout: 500 }
      );
    });

    it('maintains proper heading hierarchy in alerts', () => {
      render(
        <div>
          <h1>Page Title</h1>
          <Alert>
            <AlertTitle>Alert Title</AlertTitle>
            <AlertDescription>Alert description text.</AlertDescription>
          </Alert>
        </div>
      );

      const pageTitle = screen.getByText('Page Title');
      const alertTitle = screen.getByText('Alert Title');
      
      expect(pageTitle.tagName).toBe('H1');
      expect(alertTitle.tagName).toBe('H5'); // AlertTitle uses h5
    });

    it('supports keyboard navigation for interactive alerts', async () => {
      render(
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Interactive Alert</AlertTitle>
          <AlertDescription>
            This alert contains <a href="#link">a link</a> and{' '}
            <button type="button">a button</button>.
          </AlertDescription>
        </Alert>
      );

      await A11yTestUtils.testKeyboardNavigation(
        <Alert>
          <AlertDescription>
            <a href="#link">a link</a>
            <button type="button">a button</button>
          </AlertDescription>
        </Alert>,
        {
          expectedElements: [
            { selector: 'a[href="#link"]', label: 'Link' },
            { selector: 'button', label: 'Button' },
          ],
        }
      );
    });

    it('provides sufficient contrast for alert variants', async () => {
      const { container } = render(
        <div>
          <Alert variant="default">
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>Default alert text</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Error Alert</AlertTitle>
            <AlertDescription>Error alert text</AlertDescription>
          </Alert>
        </div>
      );

      await A11yTestUtils.testColorContrast(
        container as ReactElement,
        { minContrastRatio: 4.5 }
      );
    });
  });

  describe('Form Accessibility', () => {
    it('associates labels with form controls', () => {
      function TestForm() {
        const form = useForm({
          defaultValues: {
            username: '',
            email: '',
          },
        });

        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>Enter your username</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      }

      render(<TestForm />);

      const usernameInput = screen.getByLabelText('Username');
      const emailInput = screen.getByLabelText('Email');
      
      expect(usernameInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('announces form errors to screen readers', async () => {
      const user = userEvent.setup();
      
      function TestForm() {
        const form = useForm({
          defaultValues: { required: '' },
        });

        return (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(() => {})}
            >
              <FormField
                control={form.control}
                name="required"
                rules={{ required: 'This field is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Field</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        );
      }

      render(<TestForm />);

      await A11yTestUtils.testScreenReaderAnnouncements(
        async () => {
          await user.click(screen.getByText('Submit'));
        },
        'This field is required',
        { timeout: 1000 }
      );
    });

    it('supports keyboard navigation through form fields', async () => {
      function ComplexForm() {
        const form = useForm();

        return (
          <Form {...form}>
            <form>
              <FormField
                name="field1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field 1</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="field2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field 2</FormLabel>
                    <FormControl>
                      <select {...field}>
                        <option value="">Select...</option>
                        <option value="opt1">Option 1</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit">Submit</Button>
            </form>
          </Form>
        );
      }

      await A11yTestUtils.testKeyboardNavigation(
        <ComplexForm />,
        {
          expectedElements: [
            { selector: 'input', label: 'Field 1' },
            { selector: 'select', label: 'Field 2' },
            { selector: 'button[type="submit"]', label: 'Submit button' },
          ],
        }
      );
    });
  });

  describe('Table Accessibility', () => {
    it('uses semantic table markup', () => {
      render(
        <Table>
          <TableCaption>User Information</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
              <TableCell>Admin</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(3);
      expect(screen.getAllByRole('cell')).toHaveLength(3);
      expect(screen.getByText('User Information')).toBeInTheDocument();
    });

    it('supports keyboard navigation in interactive tables', async () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input type="checkbox" aria-label="Select all" />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <input type="checkbox" aria-label="Select row 1" />
              </TableCell>
              <TableCell>Item 1</TableCell>
              <TableCell>
                <Button size="sm">Edit</Button>
                <Button size="sm" variant="destructive">Delete</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      await A11yTestUtils.testKeyboardNavigation(
        screen.getByRole('table'),
        {
          expectedElements: [
            { selector: 'input[aria-label="Select all"]', label: 'Select all checkbox' },
            { selector: 'input[aria-label="Select row 1"]', label: 'Row checkbox' },
            { selector: 'button:has-text("Edit")', label: 'Edit button' },
            { selector: 'button:has-text("Delete")', label: 'Delete button' },
          ],
        }
      );
    });

    it('provides row headers for data tables', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Product</TableHead>
              <TableHead scope="col">Price</TableHead>
              <TableHead scope="col">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableHead scope="row">Widget A</TableHead>
              <TableCell>$10.00</TableCell>
              <TableCell>50</TableCell>
            </TableRow>
            <TableRow>
              <TableHead scope="row">Widget B</TableHead>
              <TableCell>$15.00</TableCell>
              <TableCell>30</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const colHeaders = screen.getAllByRole('columnheader');
      const rowHeaders = screen.getAllByRole('rowheader');
      
      expect(colHeaders).toHaveLength(3);
      expect(rowHeaders).toHaveLength(2);
      
      colHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });
      
      rowHeaders.forEach(header => {
        expect(header).toHaveAttribute('scope', 'row');
      });
    });

    it('maintains sufficient contrast in table cells', async () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header 1</TableHead>
              <TableHead>Header 2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Regular cell</TableCell>
              <TableCell className="text-muted-foreground">Muted cell</TableCell>
            </TableRow>
            <TableRow data-state="selected">
              <TableCell>Selected row</TableCell>
              <TableCell>Selected cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      await A11yTestUtils.testColorContrast(
        container as ReactElement,
        { minContrastRatio: 4.5 }
      );
    });
  });
});