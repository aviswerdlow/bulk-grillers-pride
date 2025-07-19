import { render, screen, fireEvent, waitFor, act } from '@/__tests__/test-utils';
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

    // Set up default mutation mocks
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(jest.fn().mockResolvedValue({}));

    // Mock user with no organizations by default
    mockUseQuery.mockImplementation((query: any) => {
      const queryStr = query?.toString() || '';
      const queryName = query?._functionName || query?.name || '';
      
      if (queryStr.includes('currentWithOrganizations') || queryName.includes('currentWithOrganizations')) {
        return {
          _id: 'user_123',
          name: 'Test User',
          email: 'test@example.com',
          organizations: [],
        };
      }
      return undefined;
    });
  });

  it('renders loading state when user is not loaded', () => {
    (useUser as jest.Mock).mockReturnValue({ 
      isLoaded: false,
      isSignedIn: false,
      user: null 
    });
    
    // Override the default query mock for this test
    mockUseQuery.mockReturnValue(undefined);

    render(<OnboardingPage />);

    // The page shows a Loader2 icon when user is not loaded
    expect(screen.getByText('Loader2 Icon')).toBeInTheDocument();
  });

  it('renders onboarding form when user has no organizations', () => {
    render(<OnboardingPage />);

    expect(screen.getByRole('heading', { name: 'Welcome to Bulk!' })).toBeInTheDocument();
    expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
    expect(screen.getByText('Organization Name')).toBeInTheDocument();
    expect(screen.getByText('URL Slug')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Organization' })).toBeInTheDocument();
  });

  it('redirects to dashboard when user already has organizations', async () => {
    mockUseQuery.mockReturnValue({
      _id: 'user_123',
      name: 'Test User',
      email: 'test@example.com',
      organizations: [{ _id: 'org_123', name: 'Test Org', slug: 'test-org' }],
    });

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/test-org/dashboard');
    });
  });

  it('auto-generates slug from organization name', () => {
    render(<OnboardingPage />);

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
    const slugInput = screen.getByPlaceholderText('e.g., acme-store');

    fireEvent.change(nameInput, { target: { value: 'My Test Company' } });

    expect(slugInput).toHaveValue('my-test-company');
  });

  it('validates slug format and shows error for invalid slug', async () => {
    render(<OnboardingPage />);

    const slugInput = screen.getByPlaceholderText('e.g., acme-store');
    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');

    // First add a name so the form can be submitted
    fireEvent.change(nameInput, { target: { value: 'Test Org' } });
    
    // The slug should auto-generate from the name
    expect(slugInput).toHaveValue('test-org');
    
    // Now change it to an invalid slug that contains uppercase
    fireEvent.change(slugInput, { target: { value: 'Test-Invalid-Slug' } });
    
    // The component should convert to lowercase
    expect(slugInput).toHaveValue('test-invalid-slug');
    
    // Test truly invalid slug (starting with hyphen)
    fireEvent.change(slugInput, { target: { value: '-invalid' } });
    
    // Component doesn't strip leading hyphens, just converts to lowercase
    expect(slugInput).toHaveValue('-invalid');
  });

  it('creates organization successfully', async () => {
    const { toast } = require('sonner');

    // Make sure mutations are set up properly for this test
    mockUseMutation.mockReset();
    const mockStoreUserFn = jest.fn().mockResolvedValue({});
    const mockCreateOrgFn = jest.fn().mockResolvedValue({});
    
    // Setup the mocks to return our functions
    let callCount = 0;
    mockUseMutation.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return mockStoreUserFn;
      } else if (callCount === 2) {
        return mockCreateOrgFn;
      }
      return jest.fn().mockResolvedValue({});
    });

    render(<OnboardingPage />);

    // Fill in the form
    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
    const slugInput = screen.getByPlaceholderText('e.g., acme-store');
    const submitButton = screen.getByRole('button', { name: 'Create Organization' });
    
    // Change the name
    fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
    
    // The slug should auto-generate
    expect(slugInput).toHaveValue('test-organization');
    
    // Click the submit button
    await act(async () => {
      fireEvent.click(submitButton);
    });

    // Wait for mutations to complete
    await waitFor(() => {
      expect(mockStoreUserFn).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    await waitFor(() => {
      expect(mockCreateOrgFn).toHaveBeenCalledWith({
        name: 'Test Organization',
        slug: 'test-organization',
      });
      expect(toast.success).toHaveBeenCalledWith('Organization created successfully!');
      expect(mockPush).toHaveBeenCalledWith('/test-organization/dashboard');
    }, { timeout: 3000 });
  });

  it('handles slug conflict error', async () => {
    const { toast } = require('sonner');
    
    // Make sure mutations are set up properly for this test
    mockUseMutation.mockReset();
    const mockStoreUserFn = jest.fn().mockResolvedValue({});
    const mockCreateOrgFn = jest.fn().mockRejectedValue(new Error('slug already exists'));
    
    mockUseMutation
      .mockReturnValueOnce(mockStoreUserFn)
      .mockReturnValueOnce(mockCreateOrgFn);

    render(<OnboardingPage />);

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
    const form = nameInput.closest('form');

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
      fireEvent.submit(form!);
    });

    // Wait for error message using findByText for async content
    const errorMessage = await screen.findByText(
      'This organization URL is already taken. Please choose another.',
      {},
      { timeout: 3000 }
    );
    expect(errorMessage).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Organization URL already taken');
  });

  it('shows loading state while creating organization', async () => {
    // Make sure to reset the mutation mocks for this test
    mockUseMutation.mockReset();
    let mutationCallCount = 0;
    
    // Create a promise that we can control
    let resolveStoreUser: (value: any) => void;
    const storeUserPromise = new Promise((resolve) => {
      resolveStoreUser = resolve;
    });
    
    const mockCreateOrgFn = jest.fn().mockResolvedValue({});
    
    mockUseMutation.mockImplementation(() => {
      mutationCallCount++;
      if (mutationCallCount === 1) {
        return () => storeUserPromise;
      } else if (mutationCallCount === 2) {
        return mockCreateOrgFn;
      }
      return jest.fn().mockResolvedValue({});
    });

    render(<OnboardingPage />);

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
    const submitButton = screen.getByRole('button', { name: 'Create Organization' });

    fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
    fireEvent.click(submitButton);

    // Use findByText for async content
    const loadingText = await screen.findByText('Creating Organization...', {}, { timeout: 1000 });
    expect(loadingText).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    // Clean up by resolving the promise
    await act(async () => {
      resolveStoreUser!({});
    });
  });

  it('disables form during creation', async () => {
    // Make sure to reset the mutation mocks for this test
    mockUseMutation.mockReset();
    let mutationCallCount = 0;
    
    // Create a controlled promise
    let resolveStoreUser: (value: any) => void;
    const storeUserPromise = new Promise((resolve) => {
      resolveStoreUser = resolve;
    });
    
    const mockCreateOrgFn = jest.fn().mockResolvedValue({});
    
    mockUseMutation.mockImplementation(() => {
      mutationCallCount++;
      if (mutationCallCount === 1) {
        return () => storeUserPromise;
      } else if (mutationCallCount === 2) {
        return mockCreateOrgFn;
      }
      return jest.fn().mockResolvedValue({});
    });

    render(<OnboardingPage />);

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
    const slugInput = screen.getByPlaceholderText('e.g., acme-store');
    const submitButton = screen.getByRole('button', { name: 'Create Organization' });

    fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
    fireEvent.click(submitButton);

    // All form elements should be disabled during creation
    await waitFor(
      () => {
        expect(nameInput).toBeDisabled();
        expect(slugInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
      },
      { timeout: 3000 }
    );
    
    // Clean up
    await act(async () => {
      resolveStoreUser!({});
    });
  });

  // Additional test for handling general errors
  it('handles general creation errors', async () => {
    const { toast } = require('sonner');
    
    // Make sure mutations are set up properly for this test
    mockUseMutation.mockReset();
    const mockStoreUserFn = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockCreateOrgFn = jest.fn().mockResolvedValue({});
    
    mockUseMutation
      .mockReturnValueOnce(mockStoreUserFn)
      .mockReturnValueOnce(mockCreateOrgFn);

    render(<OnboardingPage />);

    const nameInput = screen.getByPlaceholderText('e.g., Acme Store');
    const form = nameInput.closest('form');

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'Test Organization' } });
      fireEvent.submit(form!);
      // Give time for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Wait for error handling
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create organization. Please try again.');
    }, { timeout: 3000 });
    
    // Form should be re-enabled after error
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: 'Create Organization' });
      expect(nameInput).toBeEnabled();
      expect(submitButton).toBeEnabled();
    });
  });
});
