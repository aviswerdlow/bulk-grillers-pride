import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TypeToConfirmInput } from '../TypeToConfirmInput';

import { renderWithProviders } from '@/__tests__/test-helpers';

describe('TypeToConfirmInput', () => {
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
  });

  it('renders with initial empty state', () => {
    renderWithProviders(<TypeToConfirmInput confirmText="DELETE" onConfirm={mockOnConfirm} />
    );

    expect(screen.getByLabelText(/Type.*DELETE.*to confirm:/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
  });

  it('shows partial match state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TypeToConfirmInput confirmText="DELETE" onConfirm={mockOnConfirm} />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'DEL');
    
    // Use getAllByText since the text appears in both visible helper and screen reader announcement
    const elements = screen.getAllByText('3 more characters needed');
    expect(elements.length).toBeGreaterThan(0);
    expect(mockOnConfirm).toHaveBeenCalledWith(false);
  });

  it('shows complete match state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TypeToConfirmInput confirmText="DELETE" onConfirm={mockOnConfirm} />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'DELETE');
    
    expect(screen.getByText('Ready to proceed')).toBeInTheDocument();
    expect(mockOnConfirm).toHaveBeenLastCalledWith(true);
  });

  it('shows mismatch state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TypeToConfirmInput confirmText="DELETE" onConfirm={mockOnConfirm} />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'DELTE');
    
    expect(screen.getByText(/Text doesn.*t match\. Please try again\./)).toBeInTheDocument();
    expect(mockOnConfirm).toHaveBeenLastCalledWith(false);
  });

  it('handles case-insensitive matching by default', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TypeToConfirmInput confirmText="DELETE" onConfirm={mockOnConfirm} />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'delete');
    
    expect(screen.getByText('Ready to proceed')).toBeInTheDocument();
    expect(mockOnConfirm).toHaveBeenLastCalledWith(true);
  });

  it('handles case-sensitive matching when enabled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TypeToConfirmInput 
        confirmText="DELETE" 
        onConfirm={mockOnConfirm}
        caseSensitive
      />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'delete');
    
    expect(screen.getByText(/Text doesn.*t match\. Please try again\./)).toBeInTheDocument();
    expect(mockOnConfirm).toHaveBeenLastCalledWith(false);
  });

  it('respects disabled prop', () => {
    renderWithProviders(<TypeToConfirmInput 
        confirmText="DELETE" 
        onConfirm={mockOnConfirm}
        disabled
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('uses custom placeholder when provided', () => {
    renderWithProviders(<TypeToConfirmInput 
        confirmText="DELETE" 
        onConfirm={mockOnConfirm}
        placeholder="Type confirmation text"
      />
    );

    expect(screen.getByPlaceholderText('Type confirmation text')).toBeInTheDocument();
  });

  it('resets to empty state when cleared', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TypeToConfirmInput confirmText="DELETE" onConfirm={mockOnConfirm} />
    );

    const input = screen.getByRole('textbox');
    
    // Type and then clear
    await user.type(input, 'DELETE');
    expect(mockOnConfirm).toHaveBeenLastCalledWith(true);
    
    await user.clear(input);
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
    expect(mockOnConfirm).toHaveBeenLastCalledWith(false);
  });

  it('shows correct character count for partial matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TypeToConfirmInput confirmText="CONFIRM" onConfirm={mockOnConfirm} />
    );

    const input = screen.getByRole('textbox');
    
    await user.type(input, 'C');
    // Use getAllByText since the text appears in both visible helper and screen reader announcement
    let elements = screen.getAllByText('6 more characters needed');
    expect(elements.length).toBeGreaterThan(0);
    
    await user.type(input, 'O');
    elements = screen.getAllByText('5 more characters needed');
    expect(elements.length).toBeGreaterThan(0);
    
    await user.type(input, 'NFIR');
    elements = screen.getAllByText('1 more character needed');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('has proper ARIA attributes', () => {
    renderWithProviders(<TypeToConfirmInput confirmText="DELETE" onConfirm={mockOnConfirm} />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'type-confirm-helper');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('autoComplete', 'off');
    expect(input).toHaveAttribute('spellCheck', 'false');
  });

  it('sets aria-invalid on mismatch', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TypeToConfirmInput confirmText="DELETE" onConfirm={mockOnConfirm} />
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'WRONG');
    
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});