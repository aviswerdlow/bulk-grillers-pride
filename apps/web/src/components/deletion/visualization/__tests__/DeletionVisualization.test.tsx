import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeletionVisualization } from '../DeletionVisualization';
import { DeletionImpactItem, DeletionImpactSummary } from '../types';

// Mock the accessibility context
jest.mock('@/contexts/accessibility', () => ({
  useAnnouncement: () => ({
    announce: jest.fn(),
  }),
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the individual view components
jest.mock('../DeletionTreeView', () => ({
  DeletionTreeView: ({ items, selectedItems, onItemToggle }: any) => (
    <div data-testid="tree-view">
      Tree View - {items.length} items, {selectedItems.size} selected
      <button onClick={() => onItemToggle('item-1')}>Toggle Item 1</button>
    </div>
  )
}));

jest.mock('../DeletionListView', () => ({
  DeletionListView: ({ items, selectedItems }: any) => (
    <div data-testid="list-view">
      List View - {items.length} items, {selectedItems.size} selected
    </div>
  )
}));

jest.mock('../DeletionGraphView', () => ({
  DeletionGraphView: ({ items, selectedItems }: any) => (
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
    renderWithProvider(
      <DeletionVisualization items={mockItems} summary={mockSummary} />
    );
    
    expect(screen.getByText('Impact Analysis')).toBeInTheDocument();
    expect(screen.getByTestId('tree-view')).toBeInTheDocument();
    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('graph-view')).not.toBeInTheDocument();
  });

  it('switches between views', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <DeletionVisualization items={mockItems} summary={mockSummary} />
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
    renderWithProvider(
      <DeletionVisualization 
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
    renderWithProvider(
      <DeletionVisualization items={mockItems} summary={mockSummary} />
    );
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Total items
    expect(screen.getByText('1')).toBeInTheDocument(); // Direct items
    expect(screen.getByText('Some items cannot be recovered')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithProvider(
      <DeletionVisualization 
        items={[]} 
        summary={mockSummary}
        loading={true}
      />
    );
    
    expect(screen.getByText('Loading impact analysis...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    renderWithProvider(
      <DeletionVisualization 
        items={[]} 
        summary={mockSummary}
        error="Failed to load impact analysis"
      />
    );
    
    expect(screen.getByText('Failed to load impact analysis')).toBeInTheDocument();
  });

  it('respects default view prop', () => {
    renderWithProvider(
      <DeletionVisualization 
        items={mockItems} 
        summary={mockSummary}
        defaultView="list"
      />
    );
    
    expect(screen.getByTestId('list-view')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-view')).not.toBeInTheDocument();
  });
});