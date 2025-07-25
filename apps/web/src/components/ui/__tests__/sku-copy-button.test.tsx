/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SkuCopyButton } from '../sku-copy-button';
import { toast } from 'sonner';

import { renderWithProviders } from '@/__tests__/test-helpers';

// Mock the clipboard API
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
    });

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Copy: ({ className }: { className?: string }) => <span className={className} data-testid="copy-icon">Copy</span>,
  Check: ({ className }: { className?: string }) => <span className={className} data-testid="check-icon">Check</span>,
}));

// Mock Button component to pass through props
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: unknown) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

describe('SkuCopyButton', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    (toast.success as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders icon variant by default', () => {
    renderWithProviders(<SkuCopyButton sku="TEST-SKU-123" />);
    const button = screen.getByRole('button', { name: /copy sku test-sku-123/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Copy SKU to clipboard');
  });

  it('renders button variant when specified', () => {
    renderWithProviders(<SkuCopyButton sku="TEST-SKU-123" variant="button" />);
    const button = screen.getByRole('button', { name: /copy sku test-sku-123/i });
    expect(button).toHaveTextContent('Copy SKU');
  });

  it('copies SKU to clipboard and shows success toast', async () => {
    mockWriteText.mockResolvedValueOnce(undefined);
    
    renderWithProviders(<SkuCopyButton sku="TEST-SKU-123" />);
    const button = screen.getByRole('button', { name: /copy sku test-sku-123/i });
    
    if (button) {
      fireEvent.click(button as HTMLElement);
    }
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('TEST-SKU-123');
      expect(toast.success).toHaveBeenCalledWith('SKU copied to clipboard');
    });
  });

  it('shows check icon after successful copy', async () => {
    mockWriteText.mockResolvedValueOnce(undefined);
    
    renderWithProviders(<SkuCopyButton sku="TEST-SKU-123" />);
    const button = screen.getByRole('button', { name: /copy sku test-sku-123/i });
    
    fireEvent.click(button as HTMLElement);
    
    await waitFor(() => {
      // The button should show the check icon
      const checkIcon = screen.getByTestId('check-icon');
      expect(checkIcon).toBeInTheDocument();
      expect(checkIcon).toHaveClass('text-green-600');
    });
  });

  it('shows error toast when copy fails', async () => {
    const error = new Error('Copy failed');
    mockWriteText.mockRejectedValueOnce(error);
    
    // Mock console.error to avoid test output noise
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    renderWithProviders(<SkuCopyButton sku="TEST-SKU-123" />);
    const button = screen.getByRole('button', { name: /copy sku test-sku-123/i });
    
    fireEvent.click(button as HTMLElement);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('TEST-SKU-123');
      expect(toast.error).toHaveBeenCalledWith('Failed to copy SKU');
      expect(consoleError).toHaveBeenCalledWith('Failed to copy:', error);
    });
    
    consoleError.mockRestore();
  });

  it('applies custom className', () => {
    renderWithProviders(<SkuCopyButton sku="TEST-SKU-123" className="custom-class" />);
    const button = screen.getByRole('button', { name: /copy sku test-sku-123/i });
    expect(button).toHaveClass('custom-class');
  });

  it('shows "Copied!" text in button variant after successful copy', async () => {
    mockWriteText.mockResolvedValueOnce(undefined);
    
    renderWithProviders(<SkuCopyButton sku="TEST-SKU-123" variant="button" />);
    const button = screen.getByRole('button', { name: /copy sku test-sku-123/i });
    
    fireEvent.click(button as HTMLElement);
    
    await waitFor(() => {
      expect(button).toHaveTextContent('Copied!');
    });
  });
});