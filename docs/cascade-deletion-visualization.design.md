# Cascade Deletion Visualization Design

**Agent**: design-agent  
**Task**: #59 - Design Cascade Deletion Visualization and Consequence Architecture  
**Date**: 2025-07-19  
**Status**: In Progress

## Executive Summary

This document presents a comprehensive UI/UX design for visualizing cascade deletion impacts in the Bulk Grillers Pride application. The design focuses on providing clear, intuitive visualization of deletion consequences while maintaining accessibility and mobile responsiveness.

## Design Philosophy

### Core Principles
1. **Progressive Disclosure**: Start with summary, allow drilling into details
2. **Visual Clarity**: Use consistent visual language for impact severity
3. **User Control**: Provide granular control over cascade behavior
4. **Accessibility First**: Ensure all information is perceivable without color
5. **Performance**: Handle large datasets without UI degradation

## Visual Design System

### Color Palette for Impact Severity

```scss
// Severity Colors with Accessibility
$severity-critical: #DC2626; // Red-600 (AA compliant)
$severity-high: #EA580C;     // Orange-600
$severity-medium: #CA8A04;   // Yellow-600
$severity-low: #16A34A;      // Green-600
$severity-info: #2563EB;     // Blue-600

// Background variants (lighter for better contrast)
$severity-critical-bg: #FEE2E2;
$severity-high-bg: #FED7AA;
$severity-medium-bg: #FEF3C7;
$severity-low-bg: #D1FAE5;
$severity-info-bg: #DBEAFE;

// Dark mode variants
$severity-critical-dark: #EF4444;
$severity-high-dark: #F97316;
$severity-medium-dark: #EAB308;
$severity-low-dark: #22C55E;
$severity-info-dark: #3B82F6;
```

### Icon System

```tsx
// Impact Type Icons
const impactIcons = {
  delete: Trash2,        // Item will be deleted
  orphan: LinkBreak,     // Item will be orphaned
  update: RefreshCw,     // Item will be updated
  reference: Link2,      // Reference will be broken
  cascade: GitBranch,    // Cascade deletion
  warning: AlertTriangle // General warning
}

// Severity Indicators (non-color dependent)
const severityShapes = {
  critical: 'octagon',    // Stop sign shape
  high: 'triangle',       // Warning triangle
  medium: 'diamond',      // Caution diamond
  low: 'circle',         // Information circle
  info: 'square'         // Neutral square
}
```

### Typography Scale

```scss
// Heading hierarchy for impact information
.impact-title { 
  font-size: 1.125rem; // 18px
  font-weight: 600;
  line-height: 1.75rem;
}

.impact-subtitle {
  font-size: 0.875rem; // 14px
  font-weight: 500;
  color: var(--text-muted);
}

.impact-metric {
  font-size: 2rem; // 32px
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.impact-label {
  font-size: 0.75rem; // 12px
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

## Component Architecture

### 1. Impact Summary Card

```tsx
interface ImpactSummaryProps {
  totalAffected: number
  criticalItems: number
  storageFreed: string
  estimatedTime: string
  canProceed: boolean
}

// Visual Design:
// +----------------------------------+
// | 🗑️ Deletion Impact Summary       |
// +----------------------------------+
// | [32] Total Items     [2] Critical|
// | [1.2GB] Storage     [~5s] Time   |
// +----------------------------------+
// | ⚠️ 2 items require attention     |
// +----------------------------------+
```

### 2. Visualization Mode Selector

```tsx
interface VisualizationModeSelectorProps {
  mode: 'tree' | 'graph' | 'list'
  onChange: (mode: string) => void
  itemCount: number
}

// Visual Design:
// +--------+--------+--------+
// | [Tree] | Graph  | List   |
// +--------+--------+--------+
// Tree view recommended for 25 items
```

### 3. Tree View Component

```tsx
// Hierarchical tree visualization
// 
// 📦 Product: "Premium Grill Set"
// ├─ 🏷️ Category: "Outdoor Cooking" (will update)
// ├─ 📸 Images (3 items)
// │  ├─ main-image.jpg (450KB)
// │  ├─ thumbnail.jpg (45KB)
// │  └─ gallery-1.jpg (380KB)
// └─ 🔗 References (2 items)
//    ├─ Homepage Feature
//    └─ Summer Sale Collection

interface TreeNodeDesign {
  // Visual properties
  indentWidth: 24 // pixels per level
  lineStyle: 'solid' | 'dashed' | 'dotted'
  expandIcon: ChevronRight | ChevronDown
  
  // Interaction states
  hover: { backgroundColor: 'var(--hover-bg)' }
  selected: { borderLeft: '3px solid var(--primary)' }
  disabled: { opacity: 0.5 }
}
```

### 4. Graph View Component

```tsx
// Force-directed graph visualization
// Uses D3.js for rendering

interface GraphNodeDesign {
  // Node appearance
  radius: (node) => 10 + Math.log(node.childCount) * 5
  color: (node) => severityColors[node.impact]
  stroke: (node) => node.selected ? '#000' : '#999'
  
  // Edge appearance  
  edgeWidth: 2
  edgeColor: '#999'
  edgeStyle: (edge) => edge.critical ? 'solid' : 'dashed'
}
```

### 5. List View Component

```tsx
// Tabular view with grouping and filtering

interface ListViewDesign {
  columns: [
    { key: 'name', header: 'Item', sortable: true },
    { key: 'type', header: 'Type', filterable: true },
    { key: 'impact', header: 'Impact', sortable: true },
    { key: 'size', header: 'Size', sortable: true },
    { key: 'action', header: 'Action', editable: true }
  ],
  
  groupBy: 'type' | 'impact' | 'none',
  
  rowStates: {
    willDelete: { background: '#FEE2E2' },
    willOrphan: { background: '#FEF3C7' },
    willUpdate: { background: '#DBEAFE' }
  }
}
```

### 6. Interactive Selection Controls

```tsx
// Bulk selection interface
// +------------------------------------------+
// | Select: [All] [None] [Invert]            |
// | By Type: □ Products □ Images □ Refs      |
// | By Impact: □ Delete □ Orphan □ Update    |
// +------------------------------------------+

interface SelectionControlsDesign {
  layout: 'horizontal' | 'vertical'
  grouping: true
  showCounts: true
  animateChanges: true
}
```

### 7. Confirmation Interface

```tsx
// Final confirmation with summary
// +------------------------------------------+
// | ⚠️ Confirm Cascade Deletion              |
// +------------------------------------------+
// | You are about to:                        |
// | • Delete 15 items permanently            |
// | • Orphan 8 items (can be relinked)      |
// | • Update 3 category references           |
// |                                          |
// | This will free 1.2GB of storage         |
// |                                          |
// | [Cancel] [Proceed with Deletion]         |
// +------------------------------------------+
```

## Interaction Patterns

### 1. Progressive Loading
```tsx
// Initial: Show impact summary
// User clicks "View Details" → Load tree view
// User expands node → Load children asynchronously
// Visual feedback: Skeleton loaders for pending data
```

### 2. Hover States
```tsx
// Tree/List items:
onHover: {
  backgroundColor: 'var(--hover-bg)',
  showActions: true, // Quick actions appear
  previewTooltip: true // Show full path/details
}

// Graph nodes:
onHover: {
  scale: 1.2,
  showLabel: true,
  highlightConnections: true
}
```

### 3. Selection Behavior
```tsx
// Click: Toggle single item
// Shift+Click: Range selection
// Ctrl/Cmd+Click: Add to selection
// Click group header: Toggle all children
```

### 4. Keyboard Navigation
```tsx
// Arrow keys: Navigate tree/list
// Space: Toggle selection
// Enter: Expand/collapse node
// Tab: Move between sections
// Escape: Cancel operation
```

## Mobile Design

### Responsive Breakpoints
```scss
// Mobile: < 640px
// Tablet: 640px - 1024px  
// Desktop: > 1024px

@media (max-width: 640px) {
  // Stack visualization modes vertically
  .viz-mode-selector {
    flex-direction: column;
  }
  
  // Simplify tree to single column
  .tree-view {
    .node-metadata {
      display: block; // Stack metadata
    }
  }
  
  // Hide graph view option on mobile
  .graph-view-option {
    display: none;
  }
}
```

### Touch Interactions
```tsx
// Swipe right: Expand node
// Swipe left: Collapse node
// Long press: Multi-select mode
// Pinch: Zoom graph view (tablet only)
// Pull to refresh: Recalculate impacts
```

### Mobile-Specific Components
```tsx
// Collapsible summary for space saving
<CollapsibleSection defaultOpen={false}>
  <ImpactSummary compact={true} />
</CollapsibleSection>

// Bottom sheet for actions
<BottomSheet>
  <SelectionControls orientation="vertical" />
  <ConfirmationButton fullWidth />
</BottomSheet>
```

## Accessibility Features

### 1. Screen Reader Support
```tsx
// Announce impact summary
aria-live="polite"
aria-label="25 items will be affected by this deletion"

// Tree structure
role="tree"
aria-multiselectable="true"
aria-label="Cascade deletion impact tree"

// Node descriptions
aria-label="Product Premium Grill Set, will be deleted, has 5 child items"
```

### 2. Focus Management
```tsx
// Trap focus within dialog
// Return focus to trigger on close
// Visible focus indicators
:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
}
```

### 3. Alternative Representations
```tsx
// Text-only summary option
<TextSummary>
  <h3>Deletion Impact Report</h3>
  <ul>
    <li>15 products will be deleted</li>
    <li>23 images will be removed</li>
    <li>8 items will become orphaned</li>
  </ul>
</TextSummary>
```

### 4. High Contrast Mode
```scss
@media (prefers-contrast: high) {
  // Increase border widths
  .impact-node {
    border: 2px solid currentColor;
  }
  
  // Use patterns instead of colors
  .severity-critical {
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      currentColor 10px,
      currentColor 20px
    );
  }
}
```

## Performance Optimizations

### 1. Virtualization
```tsx
// Use react-window for large lists
<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={48}
>
  {TreeNode}
</FixedSizeList>
```

### 2. Lazy Loading
```tsx
// Load child nodes on demand
const loadChildren = async (nodeId) => {
  // Show loading state
  setNodeLoading(nodeId, true)
  
  // Fetch children
  const children = await fetchNodeChildren(nodeId)
  
  // Update tree
  updateTree(nodeId, children)
}
```

### 3. Debounced Updates
```tsx
// Debounce selection changes
const debouncedRecalculate = debounce((selections) => {
  recalculateImpacts(selections)
}, 300)
```

## Animation Guidelines

### Micro-interactions
```scss
// Node expansion
.tree-node {
  transition: all 0.2s ease-out;
  
  &.expanding {
    .node-children {
      animation: slideDown 0.3s ease-out;
    }
  }
}

// Selection changes
.selection-checkbox {
  transition: transform 0.1s ease-out;
  
  &:active {
    transform: scale(0.95);
  }
}
```

### Loading States
```tsx
// Skeleton loaders for tree nodes
<Skeleton className="h-12 w-full mb-2" />

// Pulsing animation for calculations
<div className="animate-pulse">
  Calculating impacts...
</div>
```

## Implementation Guidelines

### Component Structure
```
/components/deletion/
  ├── cascade-visualization/
  │   ├── ImpactSummary.tsx
  │   ├── VisualizationModeSelector.tsx
  │   ├── TreeView/
  │   │   ├── TreeNode.tsx
  │   │   ├── TreeControls.tsx
  │   │   └── useTreeNavigation.ts
  │   ├── GraphView/
  │   │   ├── ForceGraph.tsx
  │   │   └── GraphControls.tsx
  │   ├── ListView/
  │   │   ├── ImpactTable.tsx
  │   │   └── TableFilters.tsx
  │   └── SelectionControls.tsx
```

### State Management
```tsx
// Use Zustand for complex state
interface CascadeVisualizationStore {
  // View state
  mode: 'tree' | 'graph' | 'list'
  expandedNodes: Set<string>
  selectedNodes: Set<string>
  
  // Data state
  impactGraph: DeletionImpactGraph | null
  loading: boolean
  error: string | null
  
  // Actions
  setMode: (mode: string) => void
  toggleNode: (nodeId: string) => void
  selectNodes: (nodeIds: string[]) => void
  loadImpacts: (items: string[]) => Promise<void>
}
```

### Testing Considerations
```tsx
// Visual regression tests
// - Tree expansion/collapse
// - Selection states
// - Mobile layouts
// - Loading states
// - Error states

// Accessibility tests
// - Keyboard navigation
// - Screen reader announcements
// - Focus management
// - Color contrast

// Performance tests
// - Large dataset rendering (1000+ nodes)
// - Selection performance
// - Scroll performance
```

## Design Tokens

```scss
// Spacing
$cascade-spacing-xs: 0.25rem;
$cascade-spacing-sm: 0.5rem;
$cascade-spacing-md: 1rem;
$cascade-spacing-lg: 1.5rem;
$cascade-spacing-xl: 2rem;

// Border radius
$cascade-radius-sm: 0.25rem;
$cascade-radius-md: 0.375rem;
$cascade-radius-lg: 0.5rem;

// Shadows
$cascade-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$cascade-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
$cascade-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

// Transitions
$cascade-transition-fast: 150ms ease-out;
$cascade-transition-base: 200ms ease-out;
$cascade-transition-slow: 300ms ease-out;
```

## Success Metrics

1. **Comprehension**: Users understand impacts within 10 seconds
2. **Accuracy**: 0% accidental data loss
3. **Efficiency**: Complete deletion flow in <60 seconds
4. **Accessibility**: WCAG AA compliance
5. **Performance**: <100ms interaction response time
6. **Mobile**: 95% task completion rate on mobile

## Next Steps

1. Create interactive prototypes for user testing
2. Implement accessibility audit tools
3. Develop performance benchmarks
4. Create component library documentation
5. Design error recovery flows
6. Build animation style guide

## Conclusion

This cascade deletion visualization design provides a comprehensive, accessible, and performant solution for communicating deletion impacts. The multi-mode visualization accommodates different user preferences and data scales while maintaining consistency with the existing design system.