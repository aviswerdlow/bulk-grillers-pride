'use client';

import React, { useMemo, useState, useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { 
  ChevronRight, 
  ChevronDown, 
  Package, 
  AlertTriangle,
  Layers,
  AlertCircle
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { DeletionImpactItem, VisualizationProps } from './types';
import { useAnnouncement } from '@/contexts/accessibility';

const ITEM_HEIGHT = 48;
const INDENT_SIZE = 24;

interface TreeNode extends DeletionImpactItem {
  isOpen?: boolean;
  nestingLevel?: number;
}

interface RowData {
  items: TreeNode[];
  onToggle: (node: TreeNode) => void;
  selectedItems: Set<string>;
  onItemToggle?: (itemId: string) => void;
}

const impactIcons = {
  direct: Package,
  cascade: Layers,
  reference: AlertCircle
};

const severityColors = {
  low: 'text-blue-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600'
};

// Tree node row component
const TreeRow = memo(({ index, style, data }: {
  index: number;
  style: React.CSSProperties;
  data: RowData;
}) => {
  const { items, onToggle, selectedItems, onItemToggle } = data;
  const node = items[index];
  
  if (!node) return null;
  
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedItems.has(node.id);
  const Icon = impactIcons[node.impact];
  const indent = (node.nestingLevel || 0) * INDENT_SIZE;

  return (
    <div 
      style={style}
      className="flex items-center px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <div 
        className="flex items-center w-full h-full"
        style={{ paddingLeft: `${indent}px` }}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={() => hasChildren && onToggle(node)}
          className={cn(
            'p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 mr-2',
            !hasChildren && 'invisible'
          )}
          aria-label={node.isOpen ? 'Collapse' : 'Expand'}
        >
          {node.isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Selection checkbox */}
        {node.canExclude !== false && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onItemToggle?.(node.id)}
            className="mr-3"
            aria-label={`Select ${node.name}`}
          />
        )}

        {/* Icon */}
        <Icon className={cn('h-4 w-4 mr-2', severityColors[node.severity])} />

        {/* Name */}
        <span className="flex-1 truncate font-medium">{node.name}</span>

        {/* Type badge */}
        <Badge variant="outline" className="mr-2 text-xs">
          {node.type}
        </Badge>

        {/* Impact indicator */}
        <Badge 
          variant={node.impact === 'direct' ? 'default' : 'secondary'}
          className="mr-2 text-xs"
        >
          {node.impact}
        </Badge>

        {/* Item count for folders */}
        {node.metadata?.count && (
          <span className="text-sm text-muted-foreground mr-2">
            ({node.metadata.count} items)
          </span>
        )}

        {/* Severity indicator for critical items */}
        {node.severity === 'critical' && (
          <AlertTriangle className="h-4 w-4 text-red-600" />
        )}
      </div>
    </div>
  );
});

TreeRow.displayName = 'TreeRow';

export function DeletionTreeView({
  items,
  selectedItems = new Set(),
  onItemToggle,
  onSelectAll,
  onDeselectAll,
  loading,
  error,
  className
}: VisualizationProps) {
  const { announce } = useAnnouncement();
  const [openNodes, setOpenNodes] = useState<Set<string>>(new Set());

  // Build tree structure with open state
  const treeData = useMemo(() => {
    const addMetadata = (items: DeletionImpactItem[], level = 0): TreeNode[] => {
      return items.map(item => ({
        ...item,
        isOpen: openNodes.has(item.id),
        nestingLevel: level,
        children: item.children ? addMetadata(item.children, level + 1) : undefined
      }));
    };

    return addMetadata(items);
  }, [items, openNodes]);

  // Flatten tree for virtual scrolling
  const flattenTree = useCallback((nodes: TreeNode[], result: TreeNode[] = []): TreeNode[] => {
    nodes.forEach(node => {
      result.push(node);
      if (node.isOpen && node.children) {
        flattenTree(node.children, result);
      }
    });
    return result;
  }, []);

  const flatItems = useMemo(() => flattenTree(treeData), [treeData, flattenTree]);

  // Toggle node open/closed
  const handleToggle = useCallback((node: TreeNode) => {
    setOpenNodes(prev => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
        announce(`Collapsed ${node.name}`, 'polite');
      } else {
        next.add(node.id);
        announce(`Expanded ${node.name}`, 'polite');
      }
      return next;
    });
  }, [announce]);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <div className="text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading impact analysis...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4', className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedCount = selectedItems.size;
  const totalSelectableItems = flatItems.filter(item => item.canExclude !== false).length;

  const itemData: RowData = {
    items: flatItems,
    onToggle: handleToggle,
    selectedItems,
    onItemToggle
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Selection controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <span className="text-sm text-muted-foreground">
          {selectedCount} of {totalSelectableItems} items selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="text-sm text-blue-600 hover:text-blue-700"
            disabled={selectedCount === totalSelectableItems}
          >
            Select All
          </button>
          <button
            onClick={onDeselectAll}
            className="text-sm text-blue-600 hover:text-blue-700"
            disabled={selectedCount === 0}
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-hidden">
        <List
          height={600}
          itemCount={flatItems.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
          itemData={itemData}
        >
          {TreeRow}
        </List>
      </div>
    </div>
  );
}