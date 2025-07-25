import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest, renderHook } from '@/__tests__/test-helpers';
import { useEnsureUser } from '@/hooks/use-ensure-user';
import { useAuth, useUser } from '@clerk/nextjs';
;

// Mock dependencies
jest.mock('convex/react');
jest.mock('@clerk/nextjs');
// Import the mocked API
// import { api } from '@convex/_generated/api';

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
    (useUser as jest.Mock).mockReturnValue({
      isLoaded: false,
      user: null,
    });

    renderHook(() => useEnsureUser());

    expect(mockEnsureUser).not.toHaveBeenCalled();
  });

  it('should not call ensureUser when user is not signed in', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    });
    (useUser as jest.Mock).mockReturnValue({
      isLoaded: true,
      user: null,
    });

    renderHook(() => useEnsureUser());

    expect(mockEnsureUser).not.toHaveBeenCalled();
  });

  it('should call ensureUser when user is loaded and signed in', async () => {
    const mockUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'https://example.com/avatar.jpg',
    };

    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    (useUser as jest.Mock).mockReturnValue({
      isLoaded: true,
      user: mockUser,
    });

    renderHook(() => useEnsureUser());

    await waitFor(() => {
      expect(mockEnsureUser).toHaveBeenCalledTimes(1);
    });
  });

  it('should not call ensureUser multiple times for the same user', async () => {
    const mockUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'https://example.com/avatar.jpg',
    };

    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    (useUser as jest.Mock).mockReturnValue({
      isLoaded: true,
      user: mockUser,
    });

    const { rerender } = renderHook(() => useEnsureUser());

    await waitFor(() => {
      expect(mockEnsureUser).toHaveBeenCalledTimes(1);
    });

    // Rerender with same user
    rerender();

    // Should not call again
    expect(mockEnsureUser).toHaveBeenCalledTimes(1);
  });

  it('should call ensureUser when transitioning from signed out to signed in', async () => {
    const mockUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'https://example.com/avatar.jpg',
    };

    // Start signed out
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    });
    (useUser as jest.Mock).mockReturnValue({
      isLoaded: true,
      user: null,
    });

    const { rerender } = renderHook(() => useEnsureUser());

    // Should not call when signed out
    expect(mockEnsureUser).not.toHaveBeenCalled();

    // Sign in
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    (useUser as jest.Mock).mockReturnValue({
      isLoaded: true,
      user: mockUser,
    });
    rerender();

    // Should call when signed in
    await waitFor(() => {
      expect(mockEnsureUser).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle errors gracefully', async () => {
    const mockUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'Test',
      lastName: 'User',
      imageUrl: 'https://example.com/avatar.jpg',
    };

    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    (useUser as jest.Mock).mockReturnValue({
      isLoaded: true,
      user: mockUser,
    });

    mockEnsureUser.mockRejectedValue(new Error('Failed to ensure user'));

    // Should not throw
    expect(() => {
      renderHook(() => useEnsureUser());
    }).not.toThrow();

    await waitFor(() => {
      expect(mockEnsureUser).toHaveBeenCalledTimes(1);
    });
  });
});
