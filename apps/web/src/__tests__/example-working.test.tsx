import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/test-helpers';

// This is a simple working test to verify your test setup
describe('Basic Test Setup', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Hello Test</div>;
    
    renderWithProviders(<TestComponent />);
    
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });

  it('should handle basic math', () => {
    expect(2 + 2).toBe(4);
  });

  it('should work with React Testing Library', () => {
    renderWithProviders(<div>
        <button>Click me</button>
        <span>Test content</span>
      </div>
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});

// Example with mocks
describe('Component with Mocks', () => {
  // Mock a hook
  const useCustomHook = jest.fn(() => ({ data: 'test data' }));

  it('should use mocked data', () => {
    const Component = () => {
      const { data } = useCustomHook();
      return <div>{data}</div>;
    };

    renderWithProviders(<Component />);
    
    expect(screen.getByText('test data')).toBeInTheDocument();
    expect(useCustomHook).toHaveBeenCalled();
  });
});