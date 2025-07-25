import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';

import userEvent from '@testing-library/user-event';
import { cleanupTest, render, screen, setupTest, renderWithProviders } from '@/__tests__/test-helpers';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';

describe('Table', () => {
  beforeEach(() => {
    setupTest();
  });

  afterEach(() => {
    cleanupTest();
  });

  describe('Basic Rendering', () => {
    it('renders a simple table', () => {
      renderWithProviders(<Table>
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
            <TableRow>
              <TableCell>Jane Smith</TableCell>
              <TableCell>jane@example.com</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('renders with caption', () => {
      renderWithProviders(<Table>
          <TableCaption>User information table</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const caption = screen.getByText('User information table');
      expect(caption).toBeInTheDocument();
      expect(caption.tagName).toBe('CAPTION');
      expect(caption).toHaveClass('text-muted-foreground', 'mt-4', 'text-sm');
    });

    it('renders with footer', () => {
      renderWithProviders(<Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Item 1</TableCell>
              <TableCell>$10.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Item 2</TableCell>
              <TableCell>$20.00</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell>$30.00</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      const footer = screen.getByRole('table').querySelector('tfoot');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('bg-muted/50', 'border-t', 'font-medium');
      expect(screen.getByText('Total')).toBeInTheDocument();
    });
  });

  describe('Table Components', () => {
    it('applies correct classes to TableHeader', () => {
      const { container } = renderWithProviders(<Table>
          <TableHeader className="custom-header">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const header = container.querySelector('thead');
      expect(header).toHaveClass('[&_tr]:border-b', 'custom-header');
    });

    it('applies correct classes to TableRow', () => {
      renderWithProviders(<Table>
          <TableBody>
            <TableRow className="custom-row">
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const row = screen.getByRole('row');
      expect(row).toHaveClass(
        'hover:bg-muted/50',
        'data-[state=selected]:bg-muted',
        'border-b',
        'transition-colors',
        'custom-row'
      );
    });

    it('applies correct classes to TableHead', () => {
      renderWithProviders(<Table>
          <TableHeader>
            <TableRow>
              <TableHead className="custom-head">Column Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const th = screen.getByRole('columnheader');
      expect(th).toHaveClass(
        'text-foreground',
        'h-10',
        'px-2',
        'text-left',
        'align-middle',
        'font-medium',
        'whitespace-nowrap',
        'custom-head'
      );
    });

    it('applies correct classes to TableCell', () => {
      renderWithProviders(<Table>
          <TableBody>
            <TableRow>
              <TableCell className="custom-cell">Cell Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const cell = screen.getByRole('cell');
      expect(cell).toHaveClass(
        'p-2',
        'align-middle',
        'whitespace-nowrap',
        'custom-cell'
      );
    });
  });

  describe('Responsive Behavior', () => {
    it('wraps table in scrollable container', () => {
      const { container } = renderWithProviders(<Table>
          <TableBody>
            <TableRow>
              <TableCell>Content</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const wrapper = container.querySelector('[data-slot="table-container"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveClass('relative', 'w-full', 'overflow-x-auto');
    });
  });

  describe('Complex Tables', () => {
    it('renders table with multiple columns and rows', () => {
      const data = [
        { id: 1, name: 'Product A', price: 100, stock: 50 },
        { id: 2, name: 'Product B', price: 200, stock: 30 },
        { id: 3, name: 'Product C', price: 150, stock: 0 },
      ];

      renderWithProviders(<Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>${item.price}</TableCell>
                <TableCell>{item.stock}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

      // Check all headers
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Stock')).toBeInTheDocument();

      // Check all data
      data.forEach((item) => {
        expect(screen.getByText(item.name)).toBeInTheDocument();
        expect(screen.getByText(`$${item.price}`)).toBeInTheDocument();
        expect(screen.getByText(item.stock.toString())).toBeInTheDocument();
      });
    });

    it('renders table with checkbox column', () => {
      renderWithProviders(<Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input type="checkbox" />
              </TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <input type="checkbox" />
              </TableCell>
              <TableCell>Item 1</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('handles empty table state', () => {
      renderWithProviders(<Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={2} className="text-center">
                No data available
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
      const cell = screen.getByText('No data available').closest('td');
      expect(cell).toHaveAttribute('colspan', '2');
    });
  });

  describe('Row Selection', () => {
    it('highlights selected rows', () => {
      renderWithProviders(<Table>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>Selected Row</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Normal Row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const selectedRow = screen.getByText('Selected Row').closest('tr');
      const normalRow = screen.getByText('Normal Row').closest('tr');

      expect(selectedRow).toHaveAttribute('data-state', 'selected');
      expect(normalRow).not.toHaveAttribute('data-state', 'selected');
    });

    it('supports row click handlers', async () => {
      const user = userEvent.setup();
      const handleRowClick = jest.fn();

      renderWithProviders(<Table>
          <TableBody>
            <TableRow onClick={() => handleRowClick(1)}>
              <TableCell>Clickable Row 1</TableCell>
            </TableRow>
            <TableRow onClick={() => handleRowClick(2)}>
              <TableCell>Clickable Row 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      await user.click(screen.getByText('Clickable Row 1'));
      expect(handleRowClick).toHaveBeenCalledWith(1);

      await user.click(screen.getByText('Clickable Row 2'));
      expect(handleRowClick).toHaveBeenCalledWith(2);
    });
  });

  describe('Accessibility', () => {
    it('uses semantic table structure', () => {
      renderWithProviders(<Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(screen.getByRole('columnheader')).toBeInTheDocument();
      expect(screen.getByRole('row')).toBeInTheDocument();
      expect(screen.getByRole('cell')).toBeInTheDocument();
    });

    it('supports scope attributes for headers', () => {
      renderWithProviders(<Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Column Header</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableHead scope="row">Row Header</TableHead>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const colHeader = screen.getByText('Column Header');
      const rowHeader = screen.getByText('Row Header');

      expect(colHeader).toHaveAttribute('scope', 'col');
      expect(rowHeader).toHaveAttribute('scope', 'row');
    });

    it('properly associates caption with table', () => {
      renderWithProviders(<Table>
          <TableCaption>Accessible table caption</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = screen.getByRole('table');
      const caption = screen.getByText('Accessible table caption');
      
      expect(table.querySelector('caption')).toBe(caption);
    });
  });

  describe('Styling and Customization', () => {
    it('supports custom styling on all components', () => {
      renderWithProviders(<Table className="custom-table">
          <TableCaption className="custom-caption">Caption</TableCaption>
          <TableHeader className="custom-header">
            <TableRow className="custom-header-row">
              <TableHead className="custom-head">Header</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="custom-body">
            <TableRow className="custom-row">
              <TableCell className="custom-cell">Cell</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter className="custom-footer">
            <TableRow className="custom-footer-row">
              <TableCell className="custom-footer-cell">Footer</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByRole('table')).toHaveClass('custom-table');
      expect(screen.getByText('Caption')).toHaveClass('custom-caption');
      expect(screen.getByRole('table').querySelector('thead')).toHaveClass('custom-header');
      expect(screen.getByRole('table').querySelector('tbody')).toHaveClass('custom-body');
      expect(screen.getByRole('table').querySelector('tfoot')).toHaveClass('custom-footer');
    });

    it('handles last row border correctly', () => {
      const { container } = renderWithProviders(<Table>
          <TableBody>
            <TableRow>
              <TableCell>First Row</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Last Row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const tbody = container.querySelector('tbody');
      expect(tbody).toHaveClass('[&_tr:last-child]:border-0');
    });
  });
});