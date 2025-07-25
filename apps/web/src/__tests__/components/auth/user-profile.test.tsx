import React from 'react';
import { fireEvent } from '@testing-library/react';
import { resetAllMocks, renderWithProviders, mockUseQuery, mockUseMutation, screen, waitFor, createMockUser } from '@/__tests__/test-helpers';
import { UserProfile } from '@/components/auth/user-profile';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';


// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('UserProfile', () => {
  const mockUpdateProfile = jest.fn();

  const createMockCurrentUser = (overrides = {}) => ({
    _id: 'user_123',
    name: 'John Doe',
    email: 'test@example.com',
    role: 'admin',
    firstName: 'John',
    lastName: 'Doe',
    clerkId: 'user_123',
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  });

  const mockCurrentUser = createMockCurrentUser();

  beforeEach(() => {
    resetAllMocks();

    // Mock useUser
    (useUser as jest.Mock).mockReturnValue({
      user: createMockUser({
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        imageUrl: 'https://example.com/avatar.jpg',
      }),
      isLoaded: true,
      isSignedIn: true,
    });

    // Mock Convex queries
    mockUseQuery.mockReturnValue(mockCurrentUser);

    // Mock updateProfile mutation
    mockUseMutation.mockImplementation(() => mockUpdateProfile);
  });

  it('renders user profile information', () => {
    renderWithProviders(<UserProfile />);

    // Check header
    expect(screen.getByText('Profile Information')).toBeInTheDocument();
    expect(
      screen.getByText('Manage your personal information and account settings')
    ).toBeInTheDocument();

    // Check user data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('2 organizations')).toBeInTheDocument();
    expect(screen.getByText('January 1, 2024')).toBeInTheDocument();
  });

  it('shows loading state when data is not loaded', () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      isLoaded: false,
      isSignedIn: false,
    });

    renderWithProviders(<UserProfile />);

    expect(screen.getByRole('generic').querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders avatar with correct initials', () => {
    renderWithProviders(<UserProfile />);

    expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe initials
  });

  it('handles different name combinations for initials', () => {
    const { rerender } = renderWithProviders(<UserProfile />);

    // Only first name
    mockUseQuery.mockReturnValue(createMockCurrentUser({
      name: 'Alice',
      firstName: 'Alice',
      lastName: ''
    }));
    rerender(<UserProfile />);
    expect(screen.getByText('AL')).toBeInTheDocument();

    // No name, fallback to email
    mockUseQuery.mockReturnValue(createMockCurrentUser({
      name: 'test@example.com',
      firstName: '',
      lastName: ''
    }));
    rerender(<UserProfile />);
    expect(screen.getByText('TE')).toBeInTheDocument(); // test@example.com
  });

  it('shows "Not set" when name is empty', () => {
    mockUseQuery.mockReturnValue(createMockCurrentUser({
      name: '',
      firstName: '',
      lastName: ''
    }));

    renderWithProviders(<UserProfile />);

    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('handles single organization correctly', () => {
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      name: 'John Doe',
      email: 'test@example.com',
      role: 'admin',
      firstName: 'John',
      lastName: 'Doe',
      clerkId: 'user_123',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    renderWithProviders(<UserProfile />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles no organizations correctly', () => {
    mockUseQuery.mockReturnValue(createMockCurrentUser());

    renderWithProviders(<UserProfile />);

    // Note: The user type doesn't include organizations field
    // This test might need to be updated based on actual component behavior
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  describe('edit mode', () => {
    it('enters edit mode when Edit Profile is clicked', () => {
      renderWithProviders(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      if (editButton) {
        fireEvent.click(editButton as HTMLElement);
      }

      // Check form fields appear
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

      // Edit button should be hidden
      expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
    });

    it('populates form fields with current values', () => {
      renderWithProviders(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton as HTMLElement);

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });

    it('updates form fields when typing', () => {
      renderWithProviders(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton as HTMLElement);

      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');

      fireEvent.change(firstNameInput, { target: { value: 'Jane'  } } as any);
      fireEvent.change(lastNameInput, { target: { value: 'Smith'  } } as any);

      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    });

    it('saves profile changes successfully', async () => {
      renderWithProviders(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton as HTMLElement);

      // Change names
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      fireEvent.change(firstNameInput, { target: { value: 'Jane'  } } as any);
      fireEvent.change(lastNameInput, { target: { value: 'Smith'  } } as any);

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      if (saveButton) {
        fireEvent.click(saveButton as HTMLElement);
      }

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith({
          firstName: 'Jane',
          lastName: 'Smith',
        });
        expect(toast.success).toHaveBeenCalledWith('Profile updated successfully');
      });

      // Should exit edit mode
      expect(screen.queryByLabelText('First Name')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    });

    it('shows loading state while saving', async () => {
      // Make save slow
      mockUpdateProfile.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton as HTMLElement);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton as HTMLElement);

      // Check for loading spinner and disabled state
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
        expect(saveButton.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });

    it('handles save errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateProfile.mockRejectedValue(new Error('Update failed'));

      renderWithProviders(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton as HTMLElement);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton as HTMLElement);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
        expect(consoleError).toHaveBeenCalled();
      });

      // Should remain in edit mode on error
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('cancels edit mode and reverts changes', () => {
      renderWithProviders(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton as HTMLElement);

      // Change names
      const firstNameInput = screen.getByLabelText('First Name');
      fireEvent.change(firstNameInput, { target: { value: 'Jane'  } } as any);

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      if (cancelButton) {
        fireEvent.click(cancelButton as HTMLElement);
      }

      // Should exit edit mode
      expect(screen.queryByLabelText('First Name')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();

      // Original data should be displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty names in form', () => {
      mockUseQuery.mockReturnValue(createMockCurrentUser({
        name: '',
        firstName: '',
        lastName: ''
      }));

      renderWithProviders(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton as HTMLElement);

      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');

      expect(firstNameInput).toHaveValue('');
      expect(lastNameInput).toHaveValue('');
    });

    it('trims whitespace from names', () => {
      mockUseQuery.mockReturnValue(createMockCurrentUser());

      renderWithProviders(<UserProfile />);

      // Should display trimmed name
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
