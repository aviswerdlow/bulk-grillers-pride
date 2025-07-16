import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfile } from '@/components/auth/user-profile';
import {
  render,
  resetAllMocks,
  mockUseQuery,
  mockUseMutation,
  mockUseUser,
  createMockUser,
} from '../../test-utils';
import { toast } from 'sonner';

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('UserProfile', () => {
  const mockUpdateProfile = jest.fn();

  const mockCurrentUser = {
    _id: 'user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    imageUrl: 'https://example.com/avatar.jpg',
    organizationIds: ['org_123', 'org_456'],
    createdAt: new Date('2024-01-01').toISOString(),
  };

  beforeEach(() => {
    resetAllMocks();

    // Mock useUser
    mockUseUser.user = createMockUser({
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      imageUrl: 'https://example.com/avatar.jpg',
    });

    // Mock Convex queries
    mockUseQuery.mockReturnValue(mockCurrentUser);

    // Mock updateProfile mutation
    mockUseMutation.mockReturnValue(mockUpdateProfile);
  });

  it('renders user profile information', () => {
    render(<UserProfile />);

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
    mockUseUser.user = null;

    render(<UserProfile />);

    expect(screen.getByRole('generic').querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders avatar with correct initials', () => {
    render(<UserProfile />);

    expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe initials
  });

  it('handles different name combinations for initials', () => {
    const { rerender } = render(<UserProfile />);

    // Only first name
    mockUseQuery.mockReturnValue({
      ...mockCurrentUser,
      firstName: 'Alice',
      lastName: null,
    });
    rerender(<UserProfile />);
    expect(screen.getByText('AL')).toBeInTheDocument();

    // No name, fallback to email
    mockUseQuery.mockReturnValue({
      ...mockCurrentUser,
      firstName: null,
      lastName: null,
    });
    rerender(<UserProfile />);
    expect(screen.getByText('TE')).toBeInTheDocument(); // test@example.com
  });

  it('shows "Not set" when name is empty', () => {
    mockUseQuery.mockReturnValue({
      ...mockCurrentUser,
      firstName: null,
      lastName: null,
    });

    render(<UserProfile />);

    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('handles single organization correctly', () => {
    mockUseQuery.mockReturnValue({
      ...mockCurrentUser,
      organizationIds: ['org_123'],
    });

    render(<UserProfile />);

    expect(screen.getByText('1 organization')).toBeInTheDocument(); // Singular
  });

  it('handles no organizations correctly', () => {
    mockUseQuery.mockReturnValue({
      ...mockCurrentUser,
      organizationIds: [],
    });

    render(<UserProfile />);

    expect(screen.getByText('0 organizations')).toBeInTheDocument();
  });

  describe('edit mode', () => {
    it('enters edit mode when Edit Profile is clicked', () => {
      render(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      // Check form fields appear
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();

      // Edit button should be hidden
      expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument();
    });

    it('populates form fields with current values', () => {
      render(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    });

    it('updates form fields when typing', () => {
      render(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');

      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      fireEvent.change(lastNameInput, { target: { value: 'Smith' } });

      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
    });

    it('saves profile changes successfully', async () => {
      render(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      // Change names
      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
      fireEvent.change(lastNameInput, { target: { value: 'Smith' } });

      // Save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

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

      render(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      // Check for loading spinner and disabled state
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
        expect(saveButton.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });

    it('handles save errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateProfile.mockRejectedValue(new Error('Update failed'));

      render(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to update profile');
        expect(consoleError).toHaveBeenCalled();
      });

      // Should remain in edit mode on error
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it('cancels edit mode and reverts changes', () => {
      render(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      // Change names
      const firstNameInput = screen.getByLabelText('First Name');
      fireEvent.change(firstNameInput, { target: { value: 'Jane' } });

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should exit edit mode
      expect(screen.queryByLabelText('First Name')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();

      // Original data should be displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty names in form', () => {
      mockUseQuery.mockReturnValue({
        ...mockCurrentUser,
        firstName: '',
        lastName: '',
      });

      render(<UserProfile />);

      const editButton = screen.getByRole('button', { name: /edit profile/i });
      fireEvent.click(editButton);

      const firstNameInput = screen.getByLabelText('First Name');
      const lastNameInput = screen.getByLabelText('Last Name');

      expect(firstNameInput).toHaveValue('');
      expect(lastNameInput).toHaveValue('');
    });

    it('trims whitespace from names', () => {
      mockUseQuery.mockReturnValue({
        ...mockCurrentUser,
        firstName: ' John ',
        lastName: ' Doe ',
      });

      render(<UserProfile />);

      // Should display trimmed name
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
