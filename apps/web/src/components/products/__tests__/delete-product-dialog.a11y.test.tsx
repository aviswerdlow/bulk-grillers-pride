import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
/**
 * @jest-environment jsdom
 */
import React from 'react';

import userEvent from '@testing-library/user-event';
import { cleanupTest, render, screen, setupTest, renderWithProviders } from '@/__tests__/test-helpers';
import { DeleteProductDialog } from '../delete-product-dialog';
import { Product } from '@/types/models';
import type { Doc } from '@/../../../convex/_generated/dataModel';
import {
  expectNoA11yViolations,
  expectFocusable,
  expectAnnouncement,
  simulateKeyboardNavigation,
  testFocusTrap,
  expectAccessibleLabeling,
  expectLogicalHeadingOrder,
} from '@/__tests__/utils/accessibility';

// Mock product data
const mockProduct: Product = {
  _id: 'test-id' as unknown as any,
  _creationTime: Date.now(),
  sku: 'TEST-SKU-001',
  name: 'Test Product',
  description: 'A test product for accessibility testing',
  price: 99.99,
  imageUrl: 'https://example.com/image.jpg',
  organizationId: 'org-123' as unknown,
  isDeleted: false,
  categoryProductAssignments: [],
};

// Mock the onDelete function
const mockOnDelete = jest.fn().mockResolvedValue(undefined);

describe('DeleteProductDialog Accessibility', () => {
  beforeEach(() => {
    setupTest();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTest();
  });

  it('should have no accessibility violations', async () => {
    renderWithProviders(<DeleteProductDialog
        open={true}
        onOpenChange={jest.fn()}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    // Wait for dialog to be fully rendered
    await screen.findByRole('dialog');

    // Check for accessibility violations
    await expectNoA11yViolations(container);
  });

  it('should support keyboard navigation through all interactive elements', async () => {
    renderWithProviders(<DeleteProductDialog
        open={true}
        onOpenChange={jest.fn()}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

//     const dialog = await screen.findByRole('dialog');

    // Test keyboard navigation
    await simulateKeyboardNavigation([
      '{Tab}', // Focus first interactive element
      '{Tab}', // Move to next element
      '{Tab}', // Continue through elements
      '{Enter}', // Activate element
      '{Escape}', // Close dialog
    ]);

    // Verify focus management
    const closeButton = screen.getByRole('button', { name: /close/i });
    expectFocusable(closeButton);
  });

  it('should trap focus within the dialog when open', async () => {
    renderWithProviders(<DeleteProductDialog
        open={true}
        onOpenChange={jest.fn()}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    const dialog = await screen.findByRole('dialog');
    
    // Test focus trap
    await testFocusTrap(dialog as HTMLElement);
  });

  it('should announce important changes to screen readers', async () => {
    const { rerender } = renderWithProviders(<DeleteProductDialog
        open={false}
        onOpenChange={jest.fn()}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    // Open the dialog
    rerender(
      <DeleteProductDialog
        open={true}
        onOpenChange={jest.fn()}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    // Check for dialog announcement
    await expectAnnouncement('Delete Product', 'assertive');
  });

  it('should have proper ARIA labels and descriptions', async () => {
    renderWithProviders(<DeleteProductDialog
        open={true}
        onOpenChange={jest.fn()}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    const dialog = await screen.findByRole('dialog');

    // Check dialog labeling
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');

    // Check button labeling
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expectAccessibleLabeling(
      deleteButton,
      expect.stringMatching(/delete/i)
    );

    // Check that dangerous actions have clear labels
    const permanentDeleteOption = screen.queryByRole('radio', { name: /permanent/i });
    if (permanentDeleteOption) {
      expectAccessibleLabeling(
        permanentDeleteOption,
        expect.stringMatching(/permanent/i),
        expect.stringMatching(/cannot be undone/i)
      );
    }
  });

  it('should have logical heading hierarchy', async () => {
    renderWithProviders(<DeleteProductDialog
        open={true}
        onOpenChange={jest.fn()}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    await screen.findByRole('dialog');

    // Check heading order
    expectLogicalHeadingOrder(container);
  });

  it('should handle keyboard shortcuts appropriately', async () => {
    const onOpenChange = jest.fn();
    const user = userEvent.setup();

    renderWithProviders(<DeleteProductDialog
        open={true}
        onOpenChange={onOpenChange}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    await screen.findByRole('dialog');

    // Test Escape key closes dialog
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should announce errors and warnings appropriately', async () => {
    const user = userEvent.setup();
    
    renderWithProviders(<DeleteProductDialog
        open={true}
        onOpenChange={jest.fn()}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

//     const dialog = await screen.findByRole('dialog');

    // Find and click delete button without checking consequences
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Check for error announcement
    await expectAnnouncement(
      expect.stringMatching(/consequences|confirm|warning/i),
      'assertive'
    );
  });

  it('should support high contrast mode', async () => {
    renderWithProviders(<DeleteProductDialog
        open={true}
        onOpenChange={jest.fn()}
        products={mockProduct}
        onDelete={mockOnDelete}
      />
    );

    await screen.findByRole('dialog');

    // Check that important UI elements use semantic colors that work in high contrast
    const alerts = container.querySelectorAll('[role="alert"]');
    alerts.forEach((alert: any) => {
      const styles = window.getComputedStyle(alert);
      // Verify borders or other visual indicators exist beyond just color
      expect(
        styles.borderWidth !== '0px' || 
        styles.outline !== 'none' ||
        alert.querySelector('svg') // Icon provides additional context
      ).toBeTruthy();
    });
  });

  it('should handle multiple product deletion accessibility', async () => {
    const multipleProducts = [mockProduct, { ...mockProduct, _id: 'test-id-2' as unknown }];
    
    renderWithProviders(<DeleteProductDialog
        open={true}
        onOpenChange={jest.fn()}
        products={multipleProducts} as any
        onDelete={mockOnDelete}
      />
    );

//     const dialog = await screen.findByRole('dialog');

    // Check for plural form in announcements
    await expectAnnouncement(
      expect.stringMatching(/2 products/i),
      'polite'
    );

    // Verify list of products is properly labeled
    const productList = screen.queryByRole('list');
    if (productList) {
      expectAccessibleLabeling(
        productList,
        expect.stringMatching(/products.*delete/i)
      );
    }
  });
});