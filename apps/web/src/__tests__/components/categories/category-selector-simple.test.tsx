import React from 'react';
import { screen } from '@testing-library/react';
import { CategorySelector } from '@/components/categories/category-selector';
import { render } from '../../test-utils';
import { useQuery } from 'convex/react';

// Mock the convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}));

// Import the mocked API
import { api } from '@convex/_generated/api';

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('CategorySelector - Simple Tests', () => {
  const defaultProps = {
    organizationId: 'org1' as any,
    projectId: 'proj1' as any,
    selectedCategories: [],
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when data is not loaded', () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<CategorySelector {...defaultProps} />);

    expect(screen.getByText('Loading categories...')).toBeInTheDocument();
  });

  it('renders category selector when data is loaded', () => {
    // Mock basic data
    mockUseQuery.mockImplementation((query: unknown, args: unknown) => {
      if (query === 'getCategoryTree' || (query && (query.toString().includes('getCategoryTree') || query._functionName?.includes('getCategoryTree')))) {
        return [];
      }
      if (query === 'getCategoryLevels' || (query && (query.toString().includes('getCategoryLevels') || query._functionName?.includes('getCategoryLevels')))) {
        return [];
      }
      return undefined;
    });

    render(<CategorySelector {...defaultProps} />);

    // Should show the trigger button
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Select categories...')).toBeInTheDocument();
  });
});
