import { render, screen, fireEvent, waitFor } from '@/test-utils';
import OnboardingPage from '../page';
import { mockUseQuery, mockUseMutation, mockUseUser } from '@/test-utils';
import { useRouter } from 'next/navigation';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}));

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('OnboardingPage', () => {
  const mockStoreUser = jest.fn();
  const mockCreateOrganization = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();

    // Default mocks
    (mockUseUser as jest.Mock).mockReturnValue({
      user: {
        id: 'user_123',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    mockUseMutation.mockImplementation((mutation: any) => {
      if (mutation._functionPath === 'functions.auth.users.store') {
        return mockStoreUser;
      }
      if (mutation._functionPath === 'functions.organizations.organizations.create') {
        return mockCreateOrganization;
      }
      return jest.fn();
    });

    // Mock user with no organizations by default
    mockUseQuery.mockReturnValue(undefined);
  });

  it('renders loading state when user is not loaded', () => {
    (mockUseUser as jest.Mock).mockReturnValue({ user: null });

    const { container } = render(<OnboardingPage />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders onboarding form when user has no organizations', () => {
    mockUseQuery.mockReturnValue({ organizations: [] });

    render(<OnboardingPage />);

    expect(screen.getByRole('heading', { name: 'Welcome to Bulk!' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create Your Organization' })).toBeInTheDocument();
    expect(screen.getByLabelText('Organization Name')).toBeInTheDocument();
    expect(screen.getByLabelText('URL Slug')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Organization' })).toBeInTheDocument();
  });

  it('redirects to dashboard when user already has organizations', async () => {
    mockUseQuery.mockReturnValue({
      organizations: [{ _id: 'org_123', name: 'Test Org', slug: 'test-org' }],
    });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/test-org/dashboard');
    });
  });

  it('auto-generates slug from organization name', () => {
    mockUseQuery.mockReturnValue({ organizations: [] });

    render(<OnboardingPage />);

    const nameInput = screen.getByLabelText('Organization Name');
    const slugInput = screen.getByLabelText('URL Slug');

    fireEvent.change(nameInput, { target: { value: 'My Test Company' } });

    expect(slugInput).toHaveValue('my-test-company');
  });

  it('validates slug format and shows error for invalid slug', () => {
    mockUseQuery.mockReturnValue({ organizations: [] });

    render(<OnboardingPage />);

    const slugInput = screen.getByLabelText('URL Slug');

    // Test invalid slug starting with hyphen
    fireEvent.change(slugInput, { target: { value: '-invalid' } });

    expect(
      screen.getByText('Organization URL cannot start or end with hyphens')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Organization' })).toBeDisabled();
  });

  it('creates organization successfully', async () => {
    mockUseQuery.mockReturnValue({ organizations: [] });
    mockStoreUser.mockResolvedValue({});
    mockCreateOrganization.mockResolvedValue({});

    render(<OnboardingPage />);

    const nameInput = screen.getByLabelText('Organization Name');
    const slugInput = screen.getByLabelText('URL Slug');
    const submitButton = screen.getByRole('button', { name: 'Create Organization' });

    fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
    fireEvent.change(slugInput, { target: { value: 'test-org' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockStoreUser).toHaveBeenCalled();
      expect(mockCreateOrganization).toHaveBeenCalledWith({
        name: 'Test Organization',
        slug: 'test-org',
      });
      expect(mockPush).toHaveBeenCalledWith('/test-org/dashboard');
    });
  });

  it('handles slug conflict error', async () => {
    mockUseQuery.mockReturnValue({ organizations: [] });
    mockStoreUser.mockResolvedValue({});
    mockCreateOrganization.mockRejectedValue(new Error('slug already exists'));

    render(<OnboardingPage />);

    const nameInput = screen.getByLabelText('Organization Name');
    const submitButton = screen.getByRole('button', { name: 'Create Organization' });

    fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('This organization URL is already taken. Please choose another.')
      ).toBeInTheDocument();
    });
  });

  it('shows loading state while creating organization', async () => {
    mockUseQuery.mockReturnValue({ organizations: [] });
    mockStoreUser.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<OnboardingPage />);

    const nameInput = screen.getByLabelText('Organization Name');
    const submitButton = screen.getByRole('button', { name: 'Create Organization' });

    fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Creating Organization...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('disables form during creation', async () => {
    mockUseQuery.mockReturnValue({ organizations: [] });
    mockStoreUser.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<OnboardingPage />);

    const nameInput = screen.getByLabelText('Organization Name');
    const slugInput = screen.getByLabelText('URL Slug');
    const submitButton = screen.getByRole('button', { name: 'Create Organization' });

    fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(nameInput).toBeDisabled();
      expect(slugInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});
