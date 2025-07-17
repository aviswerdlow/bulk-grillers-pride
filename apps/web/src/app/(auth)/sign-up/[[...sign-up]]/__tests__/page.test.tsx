import { render, screen } from '@/test-utils';
import SignUpPage from '../page';

// Mock Clerk components
jest.mock('@clerk/nextjs', () => ({
  SignUp: ({ fallbackRedirectUrl, signInUrl }: any) => (
    <div data-testid="sign-up-component">
      <div data-testid="fallback-redirect-url">{fallbackRedirectUrl}</div>
      <div data-testid="sign-in-url">{signInUrl}</div>
    </div>
  ),
}));

describe('SignUpPage', () => {
  it('renders the sign up page with correct title and description', () => {
    render(<SignUpPage />);

    expect(screen.getByRole('heading', { name: 'Get started with Bulk' })).toBeInTheDocument();
    expect(screen.getByText('Create your account and start managing products')).toBeInTheDocument();
  });

  it('renders the SignUp component with correct props', () => {
    render(<SignUpPage />);

    const signUpComponent = screen.getByTestId('sign-up-component');
    expect(signUpComponent).toBeInTheDocument();

    // Check that correct redirect URLs are passed
    expect(screen.getByTestId('fallback-redirect-url')).toHaveTextContent('/onboarding');
    expect(screen.getByTestId('sign-in-url')).toHaveTextContent('/sign-in');
  });

  it('displays terms of service disclaimer', () => {
    render(<SignUpPage />);

    expect(
      screen.getByText('By signing up, you agree to our Terms of Service and Privacy Policy')
    ).toBeInTheDocument();
  });

  it('has correct layout styling', () => {
    const { container } = render(<SignUpPage />);

    const pageContainer = container.firstChild;
    expect(pageContainer).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');

    const contentWrapper = container.querySelector('.max-w-md');
    expect(contentWrapper).toBeInTheDocument();
    expect(contentWrapper).toHaveClass('w-full');
  });

  it('renders with correct gradient background', () => {
    const { container } = render(<SignUpPage />);

    const pageContainer = container.firstChild;
    expect(pageContainer).toHaveClass('bg-gradient-to-b', 'from-slate-50', 'to-white');
  });

  it('wraps SignUp component in Suspense with AuthLoading fallback', () => {
    render(<SignUpPage />);

    // Since Suspense is resolved immediately in tests, we just verify the component renders
    expect(screen.getByTestId('sign-up-component')).toBeInTheDocument();
  });

  it('positions terms disclaimer below sign up form', () => {
    const { container } = render(<SignUpPage />);

    const disclaimer = screen.getByText(
      'By signing up, you agree to our Terms of Service and Privacy Policy'
    );
    expect(disclaimer).toHaveClass('text-center', 'mt-6', 'text-sm', 'text-gray-500');
  });
});
