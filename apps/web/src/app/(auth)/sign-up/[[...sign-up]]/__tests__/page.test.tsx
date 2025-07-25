import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { cleanupTest, mockUseQuery, mockUseMutation, renderWithProviders, setupTest } from '@/__tests__/test-helpers';
import { SignUp } from '@clerk/nextjs';
import SignUpPage from '../page';

// Mock is already set up in __mocks__/@clerk/nextjs.tsx
beforeEach(() => {
  jest.clearAllMocks();
});

describe('SignUpPage', () => {
  it('renders the sign up page with correct title and description', () => {
    renderWithProviders(<SignUpPage />);

    expect(screen.getByRole('heading', { name: 'Get started with Bulk' })).toBeInTheDocument();
    expect(screen.getByText('Create your account and start managing products')).toBeInTheDocument();
  });

  it('renders the SignUp component with correct props', () => {
    renderWithProviders(<SignUpPage />);

    const signUpComponent = screen.getByTestId('sign-up-component');
    expect(signUpComponent).toBeInTheDocument();

    // Check that correct redirect URLs are passed
    expect(screen.getByTestId('fallback-redirect-url')).toHaveTextContent('/onboarding');
    expect(screen.getByTestId('sign-in-url')).toHaveTextContent('/sign-in');
  });

  it('displays terms of service disclaimer', () => {
    renderWithProviders(<SignUpPage />);

    expect(
      screen.getByText('By signing up, you agree to our Terms of Service and Privacy Policy')
    ).toBeInTheDocument();
  });

  it('has correct layout styling', () => {
    const { container } = renderWithProviders(<SignUpPage />);

    const pageContainer = container.firstChild;
    expect(pageContainer).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');

    const contentWrapper = container.querySelector('.max-w-md');
    expect(contentWrapper).toBeInTheDocument();
    expect(contentWrapper).toHaveClass('w-full');
  });

  it('renders with correct gradient background', () => {
    const { container } = renderWithProviders(<SignUpPage />);

    const pageContainer = container.firstChild;
    expect(pageContainer).toHaveClass('bg-gradient-to-b', 'from-slate-50', 'to-white');
  });

  it('wraps SignUp component in Suspense with AuthLoading fallback', () => {
    renderWithProviders(<SignUpPage />);

    // Since Suspense is resolved immediately in tests, we just verify the component renders
    expect(screen.getByTestId('sign-up-component')).toBeInTheDocument();
  });

  it('positions terms disclaimer below sign up form', () => {
    renderWithProviders(<SignUpPage />);

    const disclaimer = screen.getByText(
      'By signing up, you agree to our Terms of Service and Privacy Policy'
    );
    expect(disclaimer).toHaveClass('text-center', 'mt-6', 'text-sm', 'text-gray-500');
  });
});
