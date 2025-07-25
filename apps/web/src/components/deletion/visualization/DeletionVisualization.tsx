'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TreePine, Network, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DeletionImpactItem, DeletionImpactSummary, ViewMode } from './types';
import { DeletionTreeView } from './DeletionTreeView';
import { DeletionListView } from './DeletionListView';
import { DeletionGraphView } from './DeletionGraphView';
import { ImpactSummary } from './ImpactSummary';
import { useAnnouncement } from '@/contexts/accessibility';

interface DeletionVisualizationProps {
  items: DeletionImpactItem[];
  summary: DeletionImpactSummary;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  defaultView?: ViewMode;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function DeletionVisualization({
  items,
  summary,
  onSelectionChange,
  defaultView = 'tree',
  loading = false,
  error = null,
  className
}: DeletionVisualizationProps) {
  const { announce } = useAnnouncement();
  const [currentView, setCurrentView] = useState<ViewMode>(defaultView);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Get all selectable item IDs
  const selectableIds = useMemo(() => {
    const ids = new Set<string>();
    const collectIds = (items: DeletionImpactItem[]) => {
      items.forEach(item => {
        if (item.canExclude !== false) {
          ids.add(item.id);
        }
        if (item.children) {
          collectIds(item.children);
        }
      });
    };
    collectIds(items);
    return ids;
  }, [items]);

  // Handle item toggle
  const handleItemToggle = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      
      // Notify parent
      if (onSelectionChange) {
        onSelectionChange(next);
      }
      
      return next;
    });
  }, [onSelectionChange]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const allSelected = new Set(selectableIds);
    setSelectedItems(allSelected);
    if (onSelectionChange) {
      onSelectionChange(allSelected);
    }
    announce('Selected all items', 'assertive');
  }, [selectableIds, onSelectionChange, announce]);

  // Handle deselect all
  const handleDeselectAll = useCallback(() => {
    setSelectedItems(new Set());
    if (onSelectionChange) {
      onSelectionChange(new Set());
    }
    announce('Deselected all items', 'assertive');
  }, [onSelectionChange, announce]);

  // Handle view change
  const handleViewChange = useCallback((view: string) => {
    setCurrentView(view as ViewMode);
    announce(`Switched to ${view} view`, 'polite');
  }, [announce]);

  const viewIcons = {
    tree: TreePine,
    graph: Network,
    list: List
  };

  const viewLabels = {
    tree: 'Tree View',
    graph: 'Graph View',
    list: 'List View'
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Left panel - Summary */}
      <div className="w-80 border-r overflow-y-auto">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4">Impact Analysis</h3>
          <ImpactSummary summary={summary} />
        </div>
      </div>

      {/* Right panel - Visualization */}
      <div className="flex-1 flex flex-col">
        <Tabs value={currentView} onValueChange={handleViewChange} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            {(['tree', 'graph', 'list'] as ViewMode[]).map(view => {
              const Icon = viewIcons[view];
              return (
                <TabsTrigger key={view} value={view} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{viewLabels[view]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex-1">
            <TabsContent value="tree" className="h-full m-0">
              <DeletionTreeView
                items={items}
                summary={summary}
                selectedItems={selectedItems}
                onItemToggle={handleItemToggle}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                loading={loading}
                error={error}
              />
            </TabsContent>

            <TabsContent value="graph" className="h-full m-0">
              <DeletionGraphView
                items={items}
                summary={summary}
                selectedItems={selectedItems}
                onItemToggle={handleItemToggle}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                loading={loading}
                error={error}
              />
            </TabsContent>

            <TabsContent value="list" className="h-full m-0">
              <DeletionListView
                items={items}
                summary={summary}
                selectedItems={selectedItems}
                onItemToggle={handleItemToggle}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                loading={loading}
                error={error}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// Export individual components for flexibility
export { DeletionTreeView, DeletionListView, DeletionGraphView, ImpactSummary };
export type { DeletionImpactItem, DeletionImpactSummary, ViewMode };