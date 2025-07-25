import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HoldToConfirmButton } from '../HoldToConfirmButton';

// import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/__tests__/test-helpers';
describe('HoldToConfirmButton', () => {
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders with initial state', () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Hold to Delete')).toBeInTheDocument();
    expect(screen.getByText('Hold for 3 seconds')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('shows progress when mouse is held down', () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm} duration={1000}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    
    fireEvent.mouseDown(button);
    expect(screen.getByText('Keep Holding...')).toBeInTheDocument();
    
    // Progress should increase
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    });
  });

  it('cancels when mouse is released early', async () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm} duration={1000}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    
    fireEvent.mouseDown(button);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.mouseUp(button);
    
    await waitFor(() => {
      expect(screen.getByText('✗ Cancelled')).toBeInTheDocument();
    });
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('confirms action when held for full duration', async () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm} duration={1000}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    
    fireEvent.mouseDown(button);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(screen.getByText('✓ Confirmed')).toBeInTheDocument();
    });
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('works with keyboard interactions', async () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm} duration={1000}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    button.focus();
    
    // Press and hold Space
    fireEvent.keyDown(button, { key: ' ' } as HTMLElement);
    expect(screen.getByText('Keep Holding...')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(screen.getByText('✓ Confirmed')).toBeInTheDocument();
    });
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels on keyboard release', async () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm} duration={1000}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    button.focus();
    
    fireEvent.keyDown(button, { key: 'Enter' } as HTMLElement);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.keyUp(button, { key: 'Enter' } as HTMLElement);
    
    await waitFor(() => {
      expect(screen.getByText('✗ Cancelled')).toBeInTheDocument();
    });
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('works with touch events', async () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm} duration={1000}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    
    fireEvent.touchStart(button);
    expect(screen.getByText('Keep Holding...')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(screen.getByText('✓ Confirmed')).toBeInTheDocument();
    });
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels when mouse leaves button', async () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm} duration={1000}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    
    fireEvent.mouseDown(button);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    fireEvent.mouseLeave(button);
    
    await waitFor(() => {
      expect(screen.getByText('✗ Cancelled')).toBeInTheDocument();
    });
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('respects disabled prop', () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm} disabled>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.mouseDown(button);
    expect(screen.queryByText('Keep Holding...')).not.toBeInTheDocument();
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('shows correct helper text during progress', async () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm} duration={3000}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    
    fireEvent.mouseDown(button);
    
    // Check remaining time updates
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/2\.00s remaining/)).toBeInTheDocument();
    });
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/1\.00s remaining/)).toBeInTheDocument();
    });
  });

  it('has proper ARIA attributes', () => {
    renderWithProviders(<HoldToConfirmButton onConfirm={mockOnConfirm}>
        Hold to Delete
      </HoldToConfirmButton>
    );

    const button = screen.getByRole('button');
    const progressbar = screen.getByRole('progressbar');
    
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    
    fireEvent.mouseDown(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});