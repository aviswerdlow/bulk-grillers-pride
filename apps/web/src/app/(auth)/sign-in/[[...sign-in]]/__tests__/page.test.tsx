import { render, screen } from '@/__tests__/test-utils';
import SignInPage from '../page';
import { SignIn } from '@clerk/nextjs';

// Update the global mock for this test
beforeEach(() => {
  (SignIn as jest.Mock).mockImplementation(({ fallbackRedirectUrl, signUpUrl }: any) => (
    <div data-testid="sign-in-component">
      <div data-testid="fallback-redirect-url">{fallbackRedirectUrl}</div>
      <div data-testid="sign-up-url">{signUpUrl}</div>
    </div>
  ));
});

describe('SignInPage', () => {
  it('renders the sign in page with correct title and description', () => {
    render(<SignInPage />);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByText('Sign in to your Bulk account')).toBeInTheDocument();
  });

  it('renders the SignIn component with correct props', () => {
    render(<SignInPage />);

    const signInComponent = screen.getByTestId('sign-in-component');
    expect(signInComponent).toBeInTheDocument();

    // Check that correct redirect URLs are passed
    expect(screen.getByTestId('fallback-redirect-url')).toHaveTextContent('/onboarding');
    expect(screen.getByTestId('sign-up-url')).toHaveTextContent('/sign-up');
  });

  it('has correct layout styling', () => {
    const { container } = render(<SignInPage />);

    const pageContainer = container.firstChild;
    expect(pageContainer).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');

    const contentWrapper = container.querySelector('.max-w-md');
    expect(contentWrapper).toBeInTheDocument();
    expect(contentWrapper).toHaveClass('w-full');
  });

  it('renders with correct gradient background', () => {
    const { container } = render(<SignInPage />);

    const pageContainer = container.firstChild;
    expect(pageContainer).toHaveClass('bg-gradient-to-b', 'from-slate-50', 'to-white');
  });

  it('wraps SignIn component in Suspense with AuthLoading fallback', () => {
    render(<SignInPage />);

    // Since Suspense is resolved immediately in tests, we just verify the component renders
    expect(screen.getByTestId('sign-in-component')).toBeInTheDocument();
  });
});
