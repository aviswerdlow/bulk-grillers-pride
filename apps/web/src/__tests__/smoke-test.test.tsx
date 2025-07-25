import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/__tests__/test-helpers';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ConvexClientProvider } from '@/components/convex-client-provider';

describe('Smoke Tests for Mock Imports', () => {
  it('should render Select components without errors', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Test" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="test">Test Item</SelectItem>
        </SelectContent>
      </Select>
    );
    
    expect(screen.getByTestId('select-trigger')).toBeInTheDocument();
  });

  it('should render ConvexClientProvider without errors', () => {
    render(
      <ConvexClientProvider>
        <div>Test Child</div>
      </ConvexClientProvider>
    );
    
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should render with test helpers without errors', () => {
    renderWithProviders(<div>Test Component</div>);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});