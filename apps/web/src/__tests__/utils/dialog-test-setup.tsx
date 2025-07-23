// Dialog test setup helper
import React from 'react';
import { render as rtlRender } from '@testing-library/react';

// Mock the DialogPortal to render children directly in tests
jest.mock('@radix-ui/react-dialog', () => {
  const actual = jest.requireActual('@radix-ui/react-dialog');
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => children,
  };
});

export const renderWithPortal = (ui: React.ReactElement) => {
  const container = document.createElement('div');
  container.setAttribute('id', 'portal-root');
  document.body.appendChild(container);
  
  const result = rtlRender(ui, { container });
  
  return {
    ...result,
    cleanup: () => {
      result.unmount();
      document.body.removeChild(container);
    }
  };
};
