import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationMethodSelector, type ConfirmationMethod } from '../ConfirmationMethodSelector';

describe('ConfirmationMethodSelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all confirmation methods', () => {
    render(
      <ConfirmationMethodSelector value="click" onChange={mockOnChange} />
    );

    expect(screen.getByText('Choose confirmation method:')).toBeInTheDocument();
    expect(screen.getByLabelText(/Standard Click/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hold to Confirm/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Type to Confirm/)).toBeInTheDocument();
  });

  it('shows recommended badge when specified', () => {
    render(
      <ConfirmationMethodSelector 
        value="click" 
        onChange={mockOnChange}
        recommendedMethod="hold"
      />
    );

    const recommendedOption = screen.getByText('Hold to Confirm').closest('div');
    expect(recommendedOption).toContainElement(screen.getByText('Recommended'));
  });

  it('selects default method on mount when no value provided', () => {
    render(
      <ConfirmationMethodSelector 
        value={'' as ConfirmationMethod}
        onChange={mockOnChange}
        defaultMethod="type"
      />
    );

    expect(mockOnChange).toHaveBeenCalledWith('type');
  });

  it('handles method selection', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationMethodSelector value="click" onChange={mockOnChange} />
    );

    const holdOption = screen.getByLabelText(/Hold to Confirm/);
    await user.click(holdOption);
    
    expect(mockOnChange).toHaveBeenCalledWith('hold');
  });

  it('handles keyboard navigation with arrow keys', () => {
    const { rerender } = render(
      <ConfirmationMethodSelector value="click" onChange={mockOnChange} />
    );

    const clickRadio = screen.getByLabelText(/Standard Click/);
    clickRadio.focus();
    
    // Arrow down should select next option
    fireEvent.keyDown(clickRadio.parentElement!.parentElement!, { key: 'ArrowDown' });
    expect(mockOnChange).toHaveBeenCalledWith('hold');
    
    // Update the value prop and refocus
    rerender(<ConfirmationMethodSelector value="hold" onChange={mockOnChange} />);
    const holdRadio = screen.getByLabelText(/Hold to Confirm/);
    holdRadio.focus();
    
    // Arrow up should select previous option
    fireEvent.keyDown(holdRadio.parentElement!.parentElement!, { key: 'ArrowUp' });
    expect(mockOnChange).toHaveBeenCalledWith('click');
  });

  it('handles Home and End keys', () => {
    const { rerender } = render(
      <ConfirmationMethodSelector value="hold" onChange={mockOnChange} />
    );

    const container = screen.getByRole('radiogroup');
    
    // Home should select first option
    fireEvent.keyDown(container, { key: 'Home' });
    expect(mockOnChange).toHaveBeenCalledWith('click');
    
    // End should select last option
    fireEvent.keyDown(container, { key: 'End' });
    expect(mockOnChange).toHaveBeenCalledWith('type');
  });

  it('wraps around when navigating past boundaries', () => {
    const { rerender } = render(
      <ConfirmationMethodSelector value="type" onChange={mockOnChange} />
    );

    const container = screen.getByRole('radiogroup');
    
    // Arrow down from last should go to first
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(mockOnChange).toHaveBeenCalledWith('click');
    
    // Update and test wrap from first to last
    rerender(<ConfirmationMethodSelector value="click" onChange={mockOnChange} />);
    fireEvent.keyDown(container, { key: 'ArrowUp' });
    expect(mockOnChange).toHaveBeenCalledWith('type');
  });

  it('respects disabled prop', () => {
    render(
      <ConfirmationMethodSelector 
        value="click" 
        onChange={mockOnChange}
        disabled
      />
    );

    const radios = screen.getAllByRole('radio');
    radios.forEach(radio => {
      expect(radio).toBeDisabled();
    });
    
    // Keyboard navigation should not work when disabled
    const container = screen.getByRole('radiogroup');
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('shows correct descriptions for each method', () => {
    render(
      <ConfirmationMethodSelector value="click" onChange={mockOnChange} />
    );

    expect(screen.getByText('Quick confirmation for non-critical actions')).toBeInTheDocument();
    expect(screen.getByText('Prevents accidental clicks')).toBeInTheDocument();
    expect(screen.getByText('Maximum security for critical actions')).toBeInTheDocument();
  });

  it('highlights selected option', () => {
    const { rerender } = render(
      <ConfirmationMethodSelector value="click" onChange={mockOnChange} />
    );

    let clickRadio = screen.getByLabelText(/Standard Click/);
    expect(clickRadio).toBeChecked();
    expect(screen.getByLabelText(/Hold to Confirm/)).not.toBeChecked();
    expect(screen.getByLabelText(/Type to Confirm/)).not.toBeChecked();
    
    // Change selection
    rerender(<ConfirmationMethodSelector value="type" onChange={mockOnChange} />);
    
    expect(screen.getByLabelText(/Standard Click/)).not.toBeChecked();
    expect(screen.getByLabelText(/Hold to Confirm/)).not.toBeChecked();
    expect(screen.getByLabelText(/Type to Confirm/)).toBeChecked();
  });

  it('has proper ARIA attributes', () => {
    render(
      <ConfirmationMethodSelector value="click" onChange={mockOnChange} />
    );

    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toBeInTheDocument();
    
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    
    radios.forEach(radio => {
      expect(radio).toHaveAttribute('name', 'confirmation-method');
      expect(radio).toHaveAttribute('aria-describedby');
    });
  });
});