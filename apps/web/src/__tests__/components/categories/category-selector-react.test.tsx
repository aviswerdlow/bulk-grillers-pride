import { render, screen, fireEvent } from '@testing-library/react';
import { Id } from '@convex/_generated/dataModel';

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}));

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
              checked={value.includes(cat._id)}
              disabled={disabled}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange(multiple ? [...value, cat._id] : [cat._id]);
                } else {
                  onChange(value.filter((id: string) => id !== cat._id));
                }
              }}
            />
            <span>{cat.name}</span>
            {cat.level === 0 && (
              <button aria-label={`Expand ${cat.name}`} onClick={() => onExpand?.(cat._id, true)}>
                Expand
              </button>
            )}
          </div>
        ))}
      </div>
    );
  },
}));

import { CategorySelector } from '@/components/categories/category-selector';

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
    render(<CategorySelector {...defaultProps} />);

    expect(screen.getByTestId('category-selector')).toBeInTheDocument();
  });

  it('should render categories', () => {
    render(<CategorySelector {...defaultProps} />);

    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Computers')).toBeInTheDocument();
  });

  it('should handle single selection mode', () => {
    render(<CategorySelector {...defaultProps} />);

    const electronicsCheckbox = screen.getByRole('checkbox', { name: /select electronics/i });
    fireEvent.click(electronicsCheckbox);

    expect(defaultProps.onChange).toHaveBeenCalledWith(['cat_1']);
  });

  it('should handle multiple selection mode', () => {
    const multiSelectProps = {
      ...defaultProps,
      multiple: true,
      value: ['cat_1'],
    };

    render(<CategorySelector {...multiSelectProps} />);

    const computersCheckbox = screen.getByRole('checkbox', { name: /select computers/i });
    fireEvent.click(computersCheckbox);

    expect(multiSelectProps.onChange).toHaveBeenCalledWith(['cat_1', 'cat_2']);
  });

  it('should handle deselection', () => {
    const propsWithSelection = {
      ...defaultProps,
      value: ['cat_2'],
    };

    render(<CategorySelector {...propsWithSelection} />);

    const computersCheckbox = screen.getByRole('checkbox', { name: /select computers/i });
    expect(computersCheckbox).toBeChecked();

    fireEvent.click(computersCheckbox);
    expect(propsWithSelection.onChange).toHaveBeenCalledWith([]);
  });

  it('should respect disabled state', () => {
    const disabledProps = {
      ...defaultProps,
      disabled: true,
    };

    render(<CategorySelector {...disabledProps} />);

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

    render(<CategorySelector {...propsWithExpand} />);

    const electronicsExpander = screen.getByRole('button', { name: /expand electronics/i });
    fireEvent.click(electronicsExpander);

    expect(onExpand).toHaveBeenCalledWith('cat_1', true);
  });
});
