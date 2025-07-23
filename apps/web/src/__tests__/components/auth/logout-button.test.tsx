import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { fireEvent } from '@testing-library/react';
import { render, resetAllMocks, setAuthState
import { LogoutButton } from '@/components/auth/logout-button';
import { useClerk } from '@clerk/nextjs';
// Mock is now handled by jest module mapper
const mockUseClerk = useClerk as jest.MockedFunction<typeof useClerk>;

describe('LogoutButton', () => {
  let mockSignOut: jest.Mock;

  const setAuthState = jest.fn();

beforeEach(() => {
    jest.useFakeTimers();
    resetAllMocks();
    setAuthState(true, 'user_123');

    // Create a fresh mock for each test
    mockSignOut = jest.fn().mockResolvedValue(undefined);
    mockUseClerk.mockReturnValue({
      signOut: mockSignOut,
      redirectToSignIn: jest.fn(),
      redirectToSignUp: jest.fn(),
      openSignIn: jest.fn(),
      openSignUp: jest.fn(),
    } as unknown as ReturnType<typeof useClerk>);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders with default props', () => {
    renderWithProviders(<LogoutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders with custom class name', () => {
    renderWithProviders(<LogoutButton className="custom-class" />);

    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toHaveClass('custom-class');
  });

  it('renders different variants', () => {
    const { rerender } = renderWithProviders(<LogoutButton variant="default" />);
    const button = screen.getByRole('button', { name: /sign out/i });

    // The Button component should apply the variant classes
    rerender(<LogoutButton variant="ghost" />);
    expect(button).toBeInTheDocument();

    rerender(<LogoutButton variant="outline" />);
    expect(button).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender } = renderWithProviders(<LogoutButton size="sm" />);
    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toBeInTheDocument();

    rerender(<LogoutButton size="lg" />);
    expect(button).toBeInTheDocument();
  });

  it('renders with custom children', () => {
    renderWithProviders(<LogoutButton>Log Out</LogoutButton>);

    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('calls signOut when clicked', async () => {
    renderWithProviders(<LogoutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    if (button) {
      fireEvent.click(button as HTMLElement);
    }

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({
        redirectUrl: '/',
      });
    });
  });

  it('shows loading state when signing out', async () => {
    renderWithProviders(<LogoutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });

    // Button should not be disabled initially
    expect(button).not.toBeDisabled();
    expect(screen.queryByText('Signing out...')).not.toBeInTheDocument();

    // Click the button
    fireEvent.click(button as HTMLElement);

    // Button should show loading state
    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(screen.getByText('Signing out...')).toBeInTheDocument();
    });
  });

  it('handles sign out errors gracefully', async () => {
    // Mock signOut to throw an error
    mockSignOut.mockRejectedValue(new Error('Sign out failed'));

    renderWithProviders(<LogoutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(button as HTMLElement);

    // Wait for error handling - button should be re-enabled
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('is disabled when already signing out', async () => {
    // Mock signOut to be slow
    mockSignOut.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

    renderWithProviders(<LogoutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });

    // Click the button
    fireEvent.click(button as HTMLElement);

    // Try to click again while signing out
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    fireEvent.click(button as HTMLElement);

    // Should still only be called once
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('passes additional button props', () => {
    renderWithProviders(<LogoutButton className="custom-class test-class" variant="destructive" />);

    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('test-class');
  });
});
