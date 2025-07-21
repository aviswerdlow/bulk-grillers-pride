# Cascade Deletion Implementation Guide

**Agent**: design-agent  
**Task**: #59 - Implementation Guidelines  
**Date**: 2025-07-19

## Overview

This guide provides developers with step-by-step implementation instructions for the cascade deletion visualization feature, including component structure, state management, and integration patterns.

## Component Architecture

### Directory Structure
```
/components/products/deletion/
├── cascade-visualization/
│   ├── index.tsx                    // Main export
│   ├── CascadeVisualizationDialog.tsx
│   ├── types.ts                     // TypeScript definitions
│   ├── hooks/
│   │   ├── useCascadeData.ts
│   │   ├── useSelectionState.ts
│   │   └── useVisualizationMode.ts
│   ├── components/
│   │   ├── ImpactSummary.tsx
│   │   ├── VisualizationModeTabs.tsx
│   │   ├── SelectionControls.tsx
│   │   └── ConfirmationStep.tsx
│   ├── views/
│   │   ├── TreeView/
│   │   │   ├── TreeView.tsx
│   │   │   ├── TreeNode.tsx
│   │   │   └── TreeControls.tsx
│   │   ├── GraphView/
│   │   │   ├── GraphView.tsx
│   │   │   ├── ForceGraph.tsx
│   │   │   └── GraphLegend.tsx
│   │   └── ListView/
│   │       ├── ListView.tsx
│   │       ├── ListItem.tsx
│   │       └── ListFilters.tsx
│   └── utils/
│       ├── calculateImpacts.ts
│       ├── filterHelpers.ts
│       └── selectionHelpers.ts
```

## Core Components

### 1. Main Dialog Component
```tsx
// CascadeVisualizationDialog.tsx
import { Dialog } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { useCascadeData } from './hooks/useCascadeData'
import type { DeletionImpactGraph, VisualizationMode } from './types'

interface CascadeVisualizationDialogProps {
  items: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selectedItems: string[]) => void
}

export function CascadeVisualizationDialog({
  items,
  open,
  onOpenChange,
  onConfirm
}: CascadeVisualizationDialogProps) {
  const [mode, setMode] = useState<VisualizationMode>('tree')
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const { data, loading, error } = useCascadeData(items)
  
  // Reset selections when items change
  useEffect(() => {
    setSelectedNodes(new Set(items))
  }, [items])
  
  if (!open) return null
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Cascade Deletion Impact</DialogTitle>
        </DialogHeader>
        
        {loading && <LoadingState />}
        {error && <ErrorState error={error} />}
        {data && (
          <>
            <ImpactSummary data={data} selected={selectedNodes} />
            <VisualizationModeTabs 
              mode={mode} 
              onModeChange={setMode}
              itemCount={data.affectedCount}
            />
            <VisualizationArea
              mode={mode}
              data={data}
              selected={selectedNodes}
              onSelectionChange={setSelectedNodes}
            />
            <SelectionControls
              data={data}
              selected={selectedNodes}
              onSelectionChange={setSelectedNodes}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => onConfirm(Array.from(selectedNodes))}
                disabled={selectedNodes.size === 0}
              >
                Delete {selectedNodes.size} items
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

### 2. Type Definitions
```tsx
// types.ts
export interface DeletionNode {
  id: string
  type: 'product' | 'category' | 'variant' | 'image' | 'reference'
  name: string
  status: 'will-delete' | 'will-orphan' | 'will-update' | 'unaffected'
  impact: 'critical' | 'high' | 'medium' | 'low' | 'none'
  children: DeletionNode[]
  metadata: {
    count?: number
    size?: number
    lastModified?: Date
    owner?: string
    warnings?: string[]
  }
}

export interface DeletionImpactGraph {
  root: DeletionNode
  affectedCount: number
  cascadeDepth: number
  estimatedDuration: number
  summary: {
    totalAffected: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    storageFreed: number
    orphanedItems: string[]
    brokenReferences: string[]
  }
  warnings: ImpactWarning[]
}

export interface ImpactWarning {
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'data-loss' | 'broken-reference' | 'orphaned-data' | 'permission'
  message: string
  affectedItems: string[]
  mitigation?: string
}

export type VisualizationMode = 'tree' | 'graph' | 'list'

export interface SelectionState {
  selected: Set<string>
  expanded: Set<string>
  filtered: DeletionNode[]
}
```

### 3. Custom Hooks

#### useCascadeData Hook
```tsx
// hooks/useCascadeData.ts
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import type { DeletionImpactGraph } from '../types'

export function useCascadeData(items: string[]) {
  const [data, setData] = useState<DeletionImpactGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    if (items.length === 0) {
      setData(null)
      return
    }
    
    const abortController = new AbortController()
    
    async function fetchImpactData() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await api.post('/deletion/analyze', {
          items,
          options: {
            includeOrphans: true,
            maxDepth: 5,
            includeMetadata: true
          }
        }, {
          signal: abortController.signal
        })
        
        setData(response.data)
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(err as Error)
        }
      } finally {
        setLoading(false)
      }
    }
    
    fetchImpactData()
    
    return () => abortController.abort()
  }, [items])
  
  return { data, loading, error }
}
```

#### useSelectionState Hook
```tsx
// hooks/useSelectionState.ts
import { useReducer, useCallback } from 'react'
import type { DeletionNode } from '../types'

type SelectionAction = 
  | { type: 'toggle'; id: string }
  | { type: 'select'; ids: string[] }
  | { type: 'deselect'; ids: string[] }
  | { type: 'selectAll' }
  | { type: 'deselectAll' }
  | { type: 'invert' }
  | { type: 'selectByType'; nodeType: string }
  | { type: 'selectByStatus'; status: string }

function selectionReducer(
  state: Set<string>, 
  action: SelectionAction,
  nodes: DeletionNode[]
): Set<string> {
  switch (action.type) {
    case 'toggle': {
      const newSet = new Set(state)
      if (newSet.has(action.id)) {
        newSet.delete(action.id)
      } else {
        newSet.add(action.id)
      }
      return newSet
    }
    
    case 'select':
      return new Set([...state, ...action.ids])
      
    case 'deselect': {
      const newSet = new Set(state)
      action.ids.forEach(id => newSet.delete(id))
      return newSet
    }
    
    case 'selectAll':
      return new Set(getAllNodeIds(nodes))
      
    case 'deselectAll':
      return new Set()
      
    case 'invert': {
      const allIds = getAllNodeIds(nodes)
      return new Set(allIds.filter(id => !state.has(id)))
    }
    
    case 'selectByType': {
      const ids = getNodeIdsByType(nodes, action.nodeType)
      return new Set([...state, ...ids])
    }
    
    case 'selectByStatus': {
      const ids = getNodeIdsByStatus(nodes, action.status)
      return new Set([...state, ...ids])
    }
    
    default:
      return state
  }
}

export function useSelectionState(initialItems: string[], nodes: DeletionNode[]) {
  const [selected, dispatch] = useReducer(
    (state: Set<string>, action: SelectionAction) => 
      selectionReducer(state, action, nodes),
    new Set(initialItems)
  )
  
  const toggle = useCallback((id: string) => {
    dispatch({ type: 'toggle', id })
  }, [])
  
  const selectMultiple = useCallback((ids: string[]) => {
    dispatch({ type: 'select', ids })
  }, [])
  
  // ... other action methods
  
  return {
    selected,
    toggle,
    selectMultiple,
    // ... other methods
  }
}
```

### 4. Tree View Implementation
```tsx
// views/TreeView/TreeView.tsx
import { useMemo } from 'react'
import { TreeNode } from './TreeNode'
import { TreeControls } from './TreeControls'
import { useTreeNavigation } from '../../hooks/useTreeNavigation'
import type { DeletionNode } from '../../types'

interface TreeViewProps {
  data: DeletionNode
  selected: Set<string>
  onSelectionChange: (selected: Set<string>) => void
  onNodeClick?: (node: DeletionNode) => void
}

export function TreeView({ 
  data, 
  selected, 
  onSelectionChange,
  onNodeClick 
}: TreeViewProps) {
  const [expanded, toggleExpanded] = useTreeNavigation(data)
  
  const flatNodes = useMemo(() => 
    flattenTree(data, expanded), 
    [data, expanded]
  )
  
  return (
    <div className="flex flex-col h-full">
      <TreeControls
        onExpandAll={() => expandAll(data, toggleExpanded)}
        onCollapseAll={() => collapseAll(toggleExpanded)}
        onSearch={(query) => handleSearch(query, data)}
      />
      
      <div 
        className="flex-1 overflow-auto"
        role="tree"
        aria-label="Deletion impact hierarchy"
        aria-multiselectable="true"
      >
        {flatNodes.map((node, index) => (
          <TreeNode
            key={node.id}
            node={node}
            level={node.level}
            isExpanded={expanded.has(node.id)}
            isSelected={selected.has(node.id)}
            onToggleExpand={() => toggleExpanded(node.id)}
            onToggleSelect={() => handleNodeSelect(node.id)}
            onClick={() => onNodeClick?.(node)}
            tabIndex={index === 0 ? 0 : -1}
          />
        ))}
      </div>
    </div>
  )
}
```

### 5. Mobile Responsive Wrapper
```tsx
// components/MobileWrapper.tsx
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Drawer } from '@/components/ui/drawer'
import { Dialog } from '@/components/ui/dialog'

export function ResponsiveDialog({ children, ...props }) {
  const isMobile = useMediaQuery('(max-width: 640px)')
  
  if (isMobile) {
    return (
      <Drawer {...props}>
        <DrawerContent className="h-[80vh]">
          {children}
        </DrawerContent>
      </Drawer>
    )
  }
  
  return (
    <Dialog {...props}>
      <DialogContent className="max-w-4xl h-[80vh]">
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

## State Management

### Global State (if using Zustand)
```tsx
// stores/cascadeVisualizationStore.ts
import { create } from 'zustand'
import type { DeletionImpactGraph, VisualizationMode } from '../types'

interface CascadeVisualizationStore {
  // View state
  mode: VisualizationMode
  expandedNodes: Set<string>
  selectedNodes: Set<string>
  filters: {
    types: string[]
    statuses: string[]
    search: string
  }
  
  // Data state
  impactGraph: DeletionImpactGraph | null
  loading: boolean
  error: string | null
  
  // Actions
  setMode: (mode: VisualizationMode) => void
  toggleNode: (nodeId: string) => void
  selectNodes: (nodeIds: string[]) => void
  deselectNodes: (nodeIds: string[]) => void
  setFilters: (filters: Partial<CascadeVisualizationStore['filters']>) => void
  loadImpacts: (items: string[]) => Promise<void>
  reset: () => void
}

export const useCascadeVisualizationStore = create<CascadeVisualizationStore>((set, get) => ({
  // Initial state
  mode: 'tree',
  expandedNodes: new Set(),
  selectedNodes: new Set(),
  filters: {
    types: [],
    statuses: [],
    search: ''
  },
  impactGraph: null,
  loading: false,
  error: null,
  
  // Actions implementation
  setMode: (mode) => set({ mode }),
  
  toggleNode: (nodeId) => set((state) => {
    const expanded = new Set(state.expandedNodes)
    if (expanded.has(nodeId)) {
      expanded.delete(nodeId)
    } else {
      expanded.add(nodeId)
    }
    return { expandedNodes: expanded }
  }),
  
  selectNodes: (nodeIds) => set((state) => ({
    selectedNodes: new Set([...state.selectedNodes, ...nodeIds])
  })),
  
  // ... other actions
}))
```

## API Integration

### Backend API Contract
```tsx
// API endpoint definitions
interface DeletionAnalysisRequest {
  items: string[]
  options?: {
    includeOrphans?: boolean
    maxDepth?: number
    includeMetadata?: boolean
    preview?: boolean
  }
}

interface DeletionAnalysisResponse {
  impact: DeletionImpactGraph
  visualization: {
    format: 'tree' | 'graph' | 'list'
    data: any
  }
  cacheable: boolean
  ttl: number
}

// API client
class DeletionAPI {
  async analyzeImpact(request: DeletionAnalysisRequest): Promise<DeletionAnalysisResponse> {
    return api.post('/api/deletion/analyze', request)
  }
  
  async confirmDeletion(items: string[], options: CascadeOptions): Promise<void> {
    return api.post('/api/deletion/execute', { items, options })
  }
  
  async previewDeletion(items: string[]): Promise<DeletionPreview> {
    return api.post('/api/deletion/preview', { items })
  }
}
```

## Performance Optimizations

### 1. React.memo for Tree Nodes
```tsx
// Memoize expensive tree nodes
export const TreeNode = React.memo(({ 
  node, 
  isSelected, 
  isExpanded,
  ...props 
}: TreeNodeProps) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isExpanded === nextProps.isExpanded
  )
})
```

### 2. Virtual Scrolling
```tsx
// Use react-window for large lists
import { VariableSizeList } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

export function VirtualTreeView({ nodes }) {
  const getItemSize = (index: number) => {
    // Calculate height based on node depth and expansion
    const node = nodes[index]
    return node.hasChildren && node.isExpanded ? 56 : 48
  }
  
  return (
    <AutoSizer>
      {({ height, width }) => (
        <VariableSizeList
          height={height}
          width={width}
          itemCount={nodes.length}
          itemSize={getItemSize}
          overscanCount={5}
        >
          {({ index, style }) => (
            <div style={style}>
              <TreeNode node={nodes[index]} />
            </div>
          )}
        </VariableSizeList>
      )}
    </AutoSizer>
  )
}
```

### 3. Debounced Operations
```tsx
// Debounce expensive operations
import { useDebouncedCallback } from 'use-debounce'

export function useDebounced Selection() {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  
  const debouncedRecalculate = useDebouncedCallback(
    async (nodes: Set<string>) => {
      // Expensive recalculation
      const impacts = await calculateSelectionImpacts(nodes)
      updateImpactSummary(impacts)
    },
    300
  )
  
  const handleSelectionChange = (nodes: Set<string>) => {
    setSelectedNodes(nodes)
    debouncedRecalculate(nodes)
  }
  
  return { selectedNodes, handleSelectionChange }
}
```

## Testing Strategy

### Unit Tests
```tsx
// TreeNode.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { TreeNode } from './TreeNode'

describe('TreeNode', () => {
  const mockNode = {
    id: '1',
    name: 'Test Product',
    type: 'product',
    status: 'will-delete',
    children: []
  }
  
  it('renders node information', () => {
    render(<TreeNode node={mockNode} />)
    expect(screen.getByText('Test Product')).toBeInTheDocument()
  })
  
  it('handles selection toggle', () => {
    const onToggleSelect = jest.fn()
    render(<TreeNode node={mockNode} onToggleSelect={onToggleSelect} />)
    
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onToggleSelect).toHaveBeenCalledWith('1')
  })
  
  it('announces selection state to screen readers', () => {
    render(<TreeNode node={mockNode} isSelected={true} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
  })
})
```

### Integration Tests
```tsx
// CascadeVisualization.integration.test.tsx
import { renderWithProviders, waitFor } from '@/test-utils'
import { CascadeVisualizationDialog } from './CascadeVisualizationDialog'
import { server } from '@/mocks/server'
import { rest } from 'msw'

describe('CascadeVisualizationDialog Integration', () => {
  it('loads and displays impact data', async () => {
    server.use(
      rest.post('/api/deletion/analyze', (req, res, ctx) => {
        return res(ctx.json(mockImpactData))
      })
    )
    
    const { getByText, getByRole } = renderWithProviders(
      <CascadeVisualizationDialog 
        items={['product-1']}
        open={true}
        onOpenChange={() => {}}
        onConfirm={() => {}}
      />
    )
    
    await waitFor(() => {
      expect(getByText('25 items will be affected')).toBeInTheDocument()
    })
    
    expect(getByRole('tree')).toBeInTheDocument()
  })
})
```

## Deployment Checklist

### Pre-deployment
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Accessibility audit passed (aXe)
- [ ] Performance metrics met
- [ ] Mobile testing completed
- [ ] Cross-browser testing done
- [ ] Error boundaries in place
- [ ] Loading states implemented
- [ ] Analytics events added

### Feature Flags
```tsx
// Enable progressive rollout
if (features.cascadeVisualization) {
  return <CascadeVisualizationDialog {...props} />
}
return <LegacyDeletionDialog {...props} />
```

### Monitoring
```tsx
// Add analytics tracking
const trackVisualizationUsage = (event: string, data?: any) => {
  analytics.track('cascade_visualization', {
    event,
    mode: currentMode,
    itemCount: selectedNodes.size,
    ...data
  })
}
```

## Conclusion

This implementation guide provides a comprehensive foundation for building the cascade deletion visualization feature. Follow the component structure, use the provided hooks and utilities, and ensure all performance and accessibility requirements are met during implementation.