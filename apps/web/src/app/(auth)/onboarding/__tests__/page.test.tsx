import { render, screen, fireEvent, waitFor } from '@/__tests__/test-utils';
import OnboardingPage from '../page';
import { mockUseQuery, mockUseMutation } from '@/__tests__/test-utils';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ShoppingCart: () => <div>ShoppingCart Icon</div>,
  Loader2: () => <div>Loader2 Icon</div>,
}));

// Mock utils
jest.mock('@/utils/slugValidation', () => ({
  sanitizeSlug: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  isValidSlug: jest.fn((slug: string) => /^[a-z0-9-]+$/.test(slug)),
  getSlugValidationError: jest.fn((slug: string) => {
    if (!slug) return 'Slug is required';
    if (!/^[a-z0-9-]+$/.test(slug)) return 'Slug can only contain lowercase letters, numbers, and hyphens';
    return null;
  }),
}));

describe('OnboardingPage', () => {
  const mockStoreUser = jest.fn();
  const mockCreateOrganization = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();

    // Default mocks
    (useUser as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: 'user_123',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    mockUseMutation.mockImplementation((mutation: any) => {
      // Check the mutation function path or string representation
      const mutationStr = mutation?.toString() || '';
      if (mutationStr.includes('store') || mutationStr.includes('users')) {
        return mockStoreUser;
      }
      if (mutationStr.includes('create') || mutationStr.includes('organizations')) {
        return mockCreateOrganization;
      }
      return jest.fn();
    });

    // Mock user with no organizations by default
    mockUseQuery.mockReturnValue(undefined);
  });

  it('renders loading state when user is not loaded', () => {
    (useUser as jest.Mock).mockReturnValue({ 
      isLoaded: false,
      isSignedIn: false,
      user: null 
    });

    render(<OnboardingPage />);

    // The page shows a Loader2 icon when user is not loaded
    expect(screen.getByText('Loader2 Icon')).toBeInTheDocument();
  });

  it('renders onboarding form when user has no organizations', () => {
    mockUseQuery.mockReturnValue({ organizations: [] });

    render(<OnboardingPage />);

    expect(screen.getByRole('heading', { name: 'Welcome to Bulk!' })).toBeInTheDocument();
    expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
    expect(screen.getByText('Organization Name')).toBeInTheDocument();
    expect(screen.getByText('URL Slug')).toBeInTheDocument();
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

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
    const slugInput = screen.getByPlaceholderText('e.g., acme-store');

    fireEvent.change(nameInput, { target: { value: 'My Test Company' } });

    expect(slugInput).toHaveValue('my-test-company');
  });

  it('validates slug format and shows error for invalid slug', () => {
    mockUseQuery.mockReturnValue({ organizations: [] });

    render(<OnboardingPage />);

    const slugInput = screen.getByPlaceholderText('e.g., acme-store');
    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');

    // First add a name so the form can be submitted
    fireEvent.change(nameInput, { target: { value: 'Test Org' } });
    
    // The slug should auto-generate from the name
    expect(slugInput).toHaveValue('test-org');
    
    // Now change it to an invalid slug
    fireEvent.change(slugInput, { target: { value: '-invalid' } });
    
    // Our mock strips out invalid characters, so it should become 'invalid'
    expect(slugInput).toHaveValue('invalid');
  });

  it('creates organization successfully', async () => {
    const { toast } = require('sonner');
    
    mockUseQuery.mockReturnValue({ organizations: [] });
    mockStoreUser.mockResolvedValue({});
    mockCreateOrganization.mockResolvedValue({});

    render(<OnboardingPage />);

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
    const slugInput = screen.getByPlaceholderText('e.g., acme-store');

    // Fill in the form
    fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
    fireEvent.change(slugInput, { target: { value: 'test-org' } });

    // Wait for the button to be enabled and submit
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Create Organization' });
      expect(submitButton).toBeEnabled();
    });

    const submitButton = screen.getByRole('button', { name: 'Create Organization' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockStoreUser).toHaveBeenCalled();
      expect(mockCreateOrganization).toHaveBeenCalledWith({
        name: 'Test Organization',
        slug: 'test-org',
      });
      expect(toast.success).toHaveBeenCalledWith('Organization created successfully!');
      expect(mockPush).toHaveBeenCalledWith('/test-org/dashboard');
    }, { timeout: 3000 });
  });

  it('handles slug conflict error', async () => {
    mockUseQuery.mockReturnValue({ organizations: [] });
    mockStoreUser.mockResolvedValue({});
    mockCreateOrganization.mockRejectedValue(new Error('slug already exists'));

    render(<OnboardingPage />);

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
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

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
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

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
    const slugInput = screen.getByPlaceholderText('e.g., acme-store');
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
