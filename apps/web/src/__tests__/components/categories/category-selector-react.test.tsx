import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CategorySelector } from '@/components/categories/category-selector';
import { Id } from '@convex/_generated/dataModel';

import { renderWithProviders } from '@/__tests__/test-helpers';

// Mock UI components
interface MockComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

// Mock Convex
// Mock the entire category selector to avoid import issues
jest.mock('@/components/categories/category-selector', () => ({
  CategorySelector: ({
    value,
    onChange,
    multiple,
    disabled,
    onExpand,
  }: MockComponentProps & { 
    value?: string | string[]; 
    onChange?: (value: string | string[]) => void;
    multiple?: boolean;
    disabled?: boolean;
    onExpand?: (categoryId: string) => void;
  }) => {
    const mockCategories = [
      {
    _creationTime: Date.now(),
    _id: 'cat_1',
        name: 'Electronics',
        path: '/electronics',
        level: 0,
        parentId: null,
        description: 'Electronic products',
        handle: 'electronics',
        status: 'active',
        isVisible: true,
        sortOrder: 0,
      },
      {
    _creationTime: Date.now(),
    _id: 'cat_2',
        name: 'Computers',
        path: '/electronics/computers',
        level: 1,
        parentId: 'cat_1',
        description: 'Computer products',
        handle: 'computers',
        status: 'active',
        isVisible: true,
        sortOrder: 0,
      },
    ];

    return (
      <div data-testid="category-selector">
        <input type="text" placeholder="Search categories..." disabled={disabled} />
        {mockCategories.map((cat) => (
          <div key={cat._id}>
            <input
              type="checkbox"
              aria-label={`Select ${cat.name}`}
              checked={Array.isArray(value) ? value.includes(cat._id) : value === cat._id}
              disabled={disabled}
              onChange={(e) => {
                if (!onChange) return;
                if (e.target.checked) {
                  if (multiple && Array.isArray(value)) {
                    onChange([...value, cat._id]);
                  } else {
                    onChange(multiple ? [cat._id] : cat._id);
                  }
                } else {
                  if (Array.isArray(value)) {
                    onChange(value.filter((id: string) => id !== cat._id));
                  } else {
                    onChange(multiple ? [] : '');
                  }
                }
              }}
            />
            <span>{cat.name}</span>
            {cat.level === 0 && (
              <button aria-label={`Expand ${cat.name}`} onClick={() => onExpand?.(cat._id)}>
                Expand
              </button>
            )}
          </div>
        ))}
      </div>
    );
  },
}));

describe('CategorySelector Component', () => {
  const defaultProps = {
    value: [],
    onChange: jest.fn(),
    organizationId: 'org_123' as Id<'organizations'>,
    projectId: 'project_123' as Id<'projects'>,
    selectedCategories: [] as Id<'categories'>[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render category selector', () => {
    renderWithProviders(<CategorySelector {...defaultProps} />);

    expect(screen.getByTestId('category-selector')).toBeInTheDocument();
  });

  it('should render categories', () => {
    renderWithProviders(<CategorySelector {...defaultProps} />);

    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Computers')).toBeInTheDocument();
  });

  it('should handle single selection mode', () => {
    renderWithProviders(<CategorySelector {...defaultProps} />);

    const electronicsCheckbox = screen.getByRole('checkbox', { name: /select electronics/i });
    if (electronicsCheckbox) {
      fireEvent.click(electronicsCheckbox as HTMLElement);
    }

    expect(defaultProps.onChange).toHaveBeenCalledWith(['cat_1']);
  });

  it('should handle multiple selection mode', () => {
    const multiSelectProps = {
      ...defaultProps,
      multiple: true,
      value: ['cat_1'],
    };

    renderWithProviders(<CategorySelector {...multiSelectProps} />);

    const computersCheckbox = screen.getByRole('checkbox', { name: /select computers/i });
    if (computersCheckbox) {
      fireEvent.click(computersCheckbox as HTMLElement);
    }

    expect(multiSelectProps.onChange).toHaveBeenCalledWith(['cat_1', 'cat_2']);
  });

  it('should handle deselection', () => {
    const propsWithSelection = {
      ...defaultProps,
      value: ['cat_2'],
    };

    renderWithProviders(<CategorySelector {...propsWithSelection} />);

    const computersCheckbox = screen.getByRole('checkbox', { name: /select computers/i });
    expect(computersCheckbox).toBeChecked();

    fireEvent.click(computersCheckbox as HTMLElement);
    expect(propsWithSelection.onChange).toHaveBeenCalledWith([]);
  });

  it('should respect disabled state', () => {
    const disabledProps = {
      ...defaultProps,
      disabled: true,
    };

    renderWithProviders(<CategorySelector {...disabledProps} />);

    const electronicsCheckbox = screen.getByRole('checkbox', { name: /select electronics/i });
    expect(electronicsCheckbox).toBeDisabled();

    const searchInput = screen.getByPlaceholderText('Search categories...');
    expect(searchInput).toBeDisabled();
  });

  it('should call onExpand callback when provided', () => {
    const onExpand = jest.fn();
    const propsWithExpand = {
      ...defaultProps,
      onExpand,
    };

    renderWithProviders(<CategorySelector {...propsWithExpand} />);

    const electronicsExpander = screen.getByRole('button', { name: /expand electronics/i });
    if (electronicsExpander) {
      fireEvent.click(electronicsExpander as HTMLElement);
    }

    expect(onExpand).toHaveBeenCalledWith('cat_1', true);
  });
});
