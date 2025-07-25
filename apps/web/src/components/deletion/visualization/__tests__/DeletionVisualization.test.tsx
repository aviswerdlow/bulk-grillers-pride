import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeletionVisualization } from '../DeletionVisualization';
import { DeletionImpactItem, DeletionImpactSummary } from '../types';

import { renderWithProviders } from '@/__tests__/test-helpers';

// Mock the accessibility context
jest.mock('@/contexts/accessibility', () => ({
  useAnnouncement: () => ({
    announce: jest.fn(),
  }),
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock UI components
interface MockComponentProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: MockComponentProps) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: MockComponentProps) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children }: MockComponentProps) => <div data-testid="card-content">{children}</div>,
  CardTitle: ({ children }: MockComponentProps) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: MockComponentProps) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: MockComponentProps) => <div>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: MockComponentProps) => <span data-testid="badge">{children}</span>,
}));

interface TabsProps extends MockComponentProps {
  value?: string;
  onValueChange?: (value: string) => void;
}

interface TabsListProps extends MockComponentProps {
  currentValue?: string;
  onValueChange?: (value: string) => void;
}

interface TabsTriggerProps extends MockComponentProps {
  value: string;
  currentValue?: string;
  onValueChange?: (value: string) => void;
}

interface TabsContentProps extends MockComponentProps {
  value: string;
  currentValue?: string;
}

jest.mock('@/components/ui/tabs', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Tabs: ({ children, value, onValueChange }: TabsProps) => {
      const childrenWithProps = React.Children.map(children, (child: React.ReactElement) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { currentValue: value, onValueChange });
        }
        return child;
      });
      return <div data-testid="tabs">{childrenWithProps}</div>;
    },
    TabsList: ({ children, currentValue, onValueChange }: TabsListProps) => {
      const childrenWithProps = React.Children.map(children, (child: React.ReactElement) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { currentValue, onValueChange });
        }
        return child;
      });
      return <div data-testid="tabs-list">{childrenWithProps}</div>;
    },
    TabsTrigger: ({ children, value, onValueChange }: TabsTriggerProps) => (
      <button 
        role="tab" 
        aria-label={`${children} View`}
        onClick={() => onValueChange?.(value)}
      >
        {children}
      </button>
    ),
    TabsContent: ({ children, value, currentValue }: TabsContentProps) => {
      if (value === currentValue) {
        return <div>{children}</div>;
      }
      return null;
    },
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <span>AlertTriangle</span>,
  Info: () => <span>Info</span>,
  Package: () => <span>Package</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  Clock: () => <span>Clock</span>,
  Layers: () => <span>Layers</span>,
  TreePine: () => <span>TreePine</span>,
  Network: () => <span>Network</span>,
  List: () => <span>List</span>,
}));

// Mock the individual view components
interface ViewProps {
  items: DeletionImpactItem[];
  selectedItems: Set<string>;
  onItemToggle: (id: string) => void;
}

jest.mock('../DeletionTreeView', () => ({
  DeletionTreeView: ({ items, selectedItems, onItemToggle }: ViewProps) => (
    <div data-testid="tree-view">
      Tree View - {items.length} items, {selectedItems.size} selected
      <button onClick={() => onItemToggle('item-1')}>Toggle Item 1</button>
    </div>
  )
}));

jest.mock('../DeletionListView', () => ({
  DeletionListView: ({ items, selectedItems }: Omit<ViewProps, 'onItemToggle'>) => (
    <div data-testid="list-view">
      List View - {items.length} items, {selectedItems.size} selected
    </div>
  )
}));

jest.mock('../DeletionGraphView', () => ({
  DeletionGraphView: ({ items, selectedItems }: Omit<ViewProps, 'onItemToggle'>) => (
    <div data-testid="graph-view">
      Graph View - {items.length} items, {selectedItems.size} selected
    </div>
  )
}));

const mockItems: DeletionImpactItem[] = [
  {
    id: 'item-1',
    type: 'product',
    name: 'Product 1',
    impact: 'direct',
    severity: 'high',
    children: [
      {
        id: 'item-2',
        type: 'variant',
        name: 'Variant 1',
        parentId: 'item-1',
        impact: 'cascade',
        severity: 'medium'
      }
    ]
  },
  {
    id: 'item-3',
    type: 'category',
    name: 'Category 1',
    impact: 'reference',
    severity: 'low',
    canExclude: false
  }
];

const mockSummary: DeletionImpactSummary = {
  totalItems: 3,
  directItems: 1,
  cascadeItems: 1,
  referenceItems: 1,
  byType: {
    product: 1,
    variant: 1,
    category: 1
  },
  bySeverity: {
    low: 1,
    medium: 1,
    high: 1
  },
  estimatedTime: 120,
  warnings: ['Some items cannot be recovered']
};

describe('DeletionVisualization', () => {
  it('renders with default tree view', () => {
    renderWithProviders(<DeletionVisualization items={mockItems} summary={mockSummary} />
    );
    
    expect(screen.getByText('Impact Analysis')).toBeInTheDocument();
    expect(screen.getByTestId('tree-view')).toBeInTheDocument();
    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('graph-view')).not.toBeInTheDocument();
  });

  it('switches between views', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DeletionVisualization items={mockItems} summary={mockSummary} />
    );
    
    // Switch to list view
    await user.click(screen.getByRole('tab', { name: /list view/i }));
    expect(screen.getByTestId('list-view')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-view')).not.toBeInTheDocument();
    
    // Switch to graph view
    await user.click(screen.getByRole('tab', { name: /graph view/i }));
    expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
  });

  it('handles item selection', async () => {
    const onSelectionChange = jest.fn();
    renderWithProviders(<DeletionVisualization 
        items={mockItems} 
        summary={mockSummary}
        onSelectionChange={onSelectionChange}
      />
    );
    
    // Click toggle button in tree view
    fireEvent.click(screen.getByText('Toggle Item 1'));
    
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['item-1']));
    });
  });

  it('displays impact summary', () => {
    renderWithProviders(<DeletionVisualization items={mockItems} summary={mockSummary} />
    );
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Total items
    expect(screen.getByText('1')).toBeInTheDocument(); // Direct items
    expect(screen.getByText('Some items cannot be recovered')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithProviders(<DeletionVisualization 
        items={[]} 
        summary={mockSummary}
        loading={true}
      />
    );
    
    expect(screen.getByText('Loading impact analysis...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderWithProviders(<DeletionVisualization 
        items={[]} 
        summary={mockSummary}
        error="Failed to load impact analysis"
      />
    );
    
    expect(screen.getByText('Failed to load impact analysis')).toBeInTheDocument();
  });

  it('respects default view prop', () => {
    renderWithProviders(<DeletionVisualization 
        items={mockItems} 
        summary={mockSummary}
        defaultView="list"
      />
    );
    
    expect(screen.getByTestId('list-view')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-view')).not.toBeInTheDocument();
  });
});