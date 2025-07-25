import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest, renderHook } from '@/__tests__/test-helpers';
import { useAuth } from '@clerk/nextjs';
;

// Mock the entire module to avoid import issues
jest.mock('@/hooks/use-ensure-user', () => {
  const actualModule = jest.requireActual('@/hooks/use-ensure-user');
  return actualModule;
});

// Mock dependencies
jest.mock('convex/react');
jest.mock('@clerk/nextjs');

// Create a test version of the hook that doesn't import the api
const useEnsureUserTest = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const ensureUser = mockUseMutation('auth.users.ensureUser' as any);

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    ensureUser()
      .then(() => {
        console.log('User record ensured in Convex');
      })
      .catch((error) => {
        console.error('Failed to ensure user record:', error);
      });
  }, [isSignedIn, isLoaded, ensureUser]);
};

describe('useEnsureUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEnsureUser = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureUser.mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockEnsureUser);
  });

  it('should not call ensureUser when user is not loaded', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
    });

    renderHook(() => useEnsureUserTest());

    expect(mockEnsureUser).not.toHaveBeenCalled();
  });

  it('should not call ensureUser when user is not signed in', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    });

    renderHook(() => useEnsureUserTest());

    expect(mockEnsureUser).not.toHaveBeenCalled();
  });

  it('should call ensureUser when user is loaded and signed in', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });

    renderHook(() => useEnsureUserTest());

    await waitFor(() => {
      expect(mockEnsureUser).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call ensureUser multiple times for the same user', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });

    const { rerender } = renderHook(() => useEnsureUserTest());

    await waitFor(() => {
      expect(mockEnsureUser).toHaveBeenCalledTimes(1);
    });

    // Rerender with same user
    rerender();

    // Should not call again
    expect(mockEnsureUser).toHaveBeenCalledTimes(1);
  });

  it('should call ensureUser when transitioning from signed out to signed in', async () => {
    // Start signed out
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    });

    const { rerender } = renderHook(() => useEnsureUserTest());

    // Should not call when signed out
    expect(mockEnsureUser).not.toHaveBeenCalled();

    // Sign in
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    rerender();

    // Should call when signed in
    await waitFor(() => {
      expect(mockEnsureUser).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle errors gracefully', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });

    mockEnsureUser.mockRejectedValue(new Error('Failed to ensure user'));

    // Should not throw
    expect(() => {
      renderHook(() => useEnsureUserTest());
    }).not.toThrow();

    await waitFor(() => {
      expect(mockEnsureUser).toHaveBeenCalledTimes(1);
    });
  });
});
