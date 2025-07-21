'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { 
  Package, 
  AlertTriangle,
  Layers,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  X
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DeletionImpactItem, VisualizationProps, FilterOptions } from './types';
import { useAnnouncement } from '@/contexts/accessibility';

const ITEM_HEIGHT = 56;

interface ListItemData {
  items: DeletionImpactItem[];
  selectedItems: Set<string>;
  onItemToggle?: (itemId: string) => void;
}

const impactIcons = {
  direct: Package,
  cascade: Layers,
  reference: AlertCircle
};

const severityColors = {
  low: 'text-blue-600 bg-blue-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50'
};

type SortField = 'name' | 'type' | 'impact' | 'severity';
type SortDirection = 'asc' | 'desc';

// List row component
const ListRow = React.memo(({ index, style, data }: {
  index: number;
  style: React.CSSProperties;
  data: ListItemData;
}) => {
  const { items, selectedItems, onItemToggle } = data;
  const item = items[index];
  
  if (!item) return null;
  
  const isSelected = selectedItems.has(item.id);
  const Icon = impactIcons[item.impact];

  return (
    <div 
      style={style}
      className="flex items-center px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b"
    >
      {/* Selection checkbox */}
      {item.canExclude !== false && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onItemToggle?.(item.id)}
          className="mr-4"
          aria-label={`Select ${item.name}`}
        />
      )}

      {/* Main content */}
      <div className="flex-1 py-2">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn('p-2 rounded', severityColors[item.severity])}>
            <Icon className="h-4 w-4" />
          </div>

          {/* Name and type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{item.name}</span>
              <Badge variant="outline" className="text-xs">
                {item.type}
              </Badge>
            </div>
            {item.metadata?.count && (
              <p className="text-sm text-muted-foreground">
                Contains {item.metadata.count} items
              </p>
            )}
          </div>

          {/* Impact and severity badges */}
          <div className="flex items-center gap-2">
            <Badge 
              variant={item.impact === 'direct' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {item.impact}
            </Badge>
            
            {item.severity === 'critical' && (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ListRow.displayName = 'ListRow';

export function DeletionListView({
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Flatten all items
  const allItems = useMemo(() => {
    const flatten = (items: DeletionImpactItem[]): DeletionImpactItem[] => {
      return items.reduce((acc, item) => {
        acc.push(item);
        if (item.children) {
          acc.push(...flatten(item.children));
        }
        return acc;
      }, [] as DeletionImpactItem[]);
    };
    return flatten(items);
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    let filtered = allItems;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filters.types?.length) {
      filtered = filtered.filter(item => filters.types!.includes(item.type));
    }

    // Severity filter
    if (filters.severities?.length) {
      filtered = filtered.filter(item => filters.severities!.includes(item.severity));
    }

    // Impact filter
    if (filters.impacts?.length) {
      filtered = filtered.filter(item => filters.impacts!.includes(item.impact));
    }

    return filtered;
  }, [allItems, searchQuery, filters]);

  // Sort items
  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'impact':
          const impactOrder = { direct: 3, cascade: 2, reference: 1 };
          comparison = impactOrder[a.impact] - impactOrder[b.impact];
          break;
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredItems, sortField, sortDirection]);

  // Handle sort change
  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    announce(`Sorted by ${field} ${sortDirection === 'asc' ? 'descending' : 'ascending'}`, 'polite');
  }, [sortField, sortDirection, announce]);

  // Get unique values for filters
  const uniqueTypes = useMemo(() => 
    [...new Set(allItems.map(item => item.type))], [allItems]
  );
  const uniqueSeverities = ['low', 'medium', 'high', 'critical'];
  const uniqueImpacts = ['direct', 'cascade', 'reference'];

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
  const totalSelectableItems = sortedItems.filter(item => item.canExclude !== false).length;

  const itemData: ListItemData = {
    items: sortedItems,
    selectedItems,
    onItemToggle
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Controls */}
      <div className="p-4 border-b space-y-4">
        {/* Search and filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
              {uniqueTypes.map(type => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filters.types?.includes(type)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      types: checked 
                        ? [...(prev.types || []), type]
                        : prev.types?.filter(t => t !== type)
                    }));
                  }}
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Severity</DropdownMenuLabel>
              {uniqueSeverities.map(severity => (
                <DropdownMenuCheckboxItem
                  key={severity}
                  checked={filters.severities?.includes(severity)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      severities: checked 
                        ? [...(prev.severities || []), severity]
                        : prev.severities?.filter(s => s !== severity)
                    }));
                  }}
                >
                  {severity}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Filter by Impact</DropdownMenuLabel>
              {uniqueImpacts.map(impact => (
                <DropdownMenuCheckboxItem
                  key={impact}
                  checked={filters.impacts?.includes(impact)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      impacts: checked 
                        ? [...(prev.impacts || []), impact]
                        : prev.impacts?.filter(i => i !== impact)
                    }));
                  }}
                >
                  {impact}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by:</span>
          {(['severity', 'impact', 'type', 'name'] as SortField[]).map(field => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={cn(
                'px-2 py-1 rounded capitalize',
                sortField === field 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {field}
              {sortField === field && (
                <ChevronDown 
                  className={cn(
                    'inline ml-1 h-3 w-3',
                    sortDirection === 'asc' && 'rotate-180'
                  )}
                />
              )}
            </button>
          ))}
        </div>

        {/* Selection controls */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedCount} of {totalSelectableItems} items selected
            {filteredItems.length < allItems.length && 
              ` (${allItems.length - filteredItems.length} filtered)`
            }
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
      </div>

      {/* List view */}
      <div className="flex-1 overflow-hidden">
        <List
          height={600}
          itemCount={sortedItems.length}
          itemSize={ITEM_HEIGHT}
          width="100%"
          itemData={itemData}
        >
          {ListRow}
        </List>
      </div>
    </div>
  );
}