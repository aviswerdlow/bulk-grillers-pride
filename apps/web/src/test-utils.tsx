
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ConvexProvider } from 'convex/react';
import { ClerkProvider } from '@clerk/nextjs';
import userEvent from '@testing-library/user-event';

// Create a mock Convex client
const mockClient = {
  registerMutation: jest.fn(),
  registerQuery: jest.fn(),
  registerAction: jest.fn(),
  mutation: jest.fn(),
  query: jest.fn(),
  action: jest.fn(),
};

// Create a test wrapper with all providers
export function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProvider client={mockClient as any}>
        {children}
      </ConvexProvider>
    </ClerkProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: TestProviders, ...options });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { userEvent };
