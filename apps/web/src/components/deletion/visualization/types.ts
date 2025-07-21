// Type definitions for deletion visualization components

export interface DeletionImpactItem {
  id: string;
  type: 'product' | 'variant' | 'category' | 'assignment' | 'image' | 'import';
  name: string;
  parentId?: string;
  children?: DeletionImpactItem[];
  impact: 'direct' | 'cascade' | 'reference';
  severity: 'low' | 'medium' | 'high' | 'critical';
  canExclude?: boolean;
  metadata?: {
    count?: number;
    size?: number;
    lastModified?: Date;
    [key: string]: any;
  };
}

export interface DeletionImpactSummary {
  totalItems: number;
  directItems: number;
  cascadeItems: number;
  referenceItems: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  estimatedTime?: number;
  warnings?: string[];
}

export type ViewMode = 'tree' | 'graph' | 'list';

export interface VisualizationProps {
  items: DeletionImpactItem[];
  summary: DeletionImpactSummary;
  selectedItems?: Set<string>;
  onItemToggle?: (itemId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export interface ViewControlsProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onSearch: (query: string) => void;
  onFilter: (filters: FilterOptions) => void;
  itemCount: number;
}

export interface FilterOptions {
  types?: string[];
  severities?: string[];
  impacts?: string[];
  search?: string;
}