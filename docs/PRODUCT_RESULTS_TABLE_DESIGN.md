# Product Results Table Design Specification (T101)

## Overview
The Product Results Table is a comprehensive data display component for viewing AI categorization job results. It provides a scannable, filterable interface with expandable rows for detailed AI reasoning insights.

## Visual Design

### Desktop Layout (1200px+)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Product Categorization Results                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐  ┌────────────────────┐  ┌────────────┐│
│ │ 🔍 Search products...           │  │ Category ▼ [All]   │  │ Status ▼   ││
│ └─────────────────────────────────┘  └────────────────────┘  └────────────┘│
│                                                                              │
│ ┌──────────┐ ┌──────────────────────┐                      ┌──────────────┐│
│ │ □ Select │ │ Bulk Actions ▼      │                      │ Export CSV   ││
│ └──────────┘ └──────────────────────┘                      └──────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│ □ │ Product Name         │ SKU      │ Category           │ Score │ Status  │
├───┼─────────────────────┼──────────┼────────────────────┼───────┼─────────┤
│ □ │ Weber Grill Brush    │ WB-12345 │ Accessories > ...  │ 92%   │ ✓       │
│ □ │ Premium Gas Grill    │ PG-67890 │ Grills > Gas       │ 88%   │ ✓       │
│ □ │ BBQ Sauce Set        │ BS-11111 │ Sauces & Rubs      │ 76%   │ ⚠       │
│ □ │ Charcoal Starter     │ CS-22222 │ Uncategorized      │ 45%   │ ✗       │
├───┴─────────────────────┴──────────┴────────────────────┴───────┴─────────┤
│ Showing 1-20 of 157 results          [← Previous] [1] 2 3 ... 8 [Next →]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Expanded Row Detail View
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ▼ Weber Grill Brush (#WB-12345)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Assigned Category: Accessories > Cleaning Tools                             │
│ Confidence Score: 92%                                                       │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ AI Reasoning                                                             ││
│ ├─────────────────────────────────────────────────────────────────────────┤│
│ │ • Product type identified as cleaning accessory                         ││
│ │ • Brand "Weber" strongly associated with grilling products              ││
│ │ • Keywords "brush" and "grill" indicate maintenance tool category       ││
│ │ • Similar products in database mostly categorized under                 ││
│ │   Accessories > Cleaning Tools (87% match rate)                         ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Alternative Suggestions:                                                    │
│ • Tools > Maintenance (78% confidence)                                      │
│ • Accessories > Other (65% confidence)                                      │
│                                                                             │
│ Actions: [✓ Approve] [↻ Change Category] [🚩 Flag for Review]              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 768px)
```
┌──────────────────────────┐
│ Categorization Results   │
├──────────────────────────┤
│ 🔍 Search...             │
│ ┌──────────┐ ┌─────────┐│
│ │Filter ▼ │ │Export ▼ ││
│ └──────────┘ └─────────┘│
├──────────────────────────┤
│ ┌──────────────────────┐│
│ │ Weber Grill Brush    ││
│ │ SKU: WB-12345        ││
│ │ ├ Accessories > ...  ││
│ │ 92% confidence       ││
│ │ Status: ✓ Approved   ││
│ │ [View Details ▼]     ││
│ └──────────────────────┘│
│ ┌──────────────────────┐│
│ │ Premium Gas Grill    ││
│ │ SKU: PG-67890        ││
│ │ ├ Grills > Gas       ││
│ │ 88% confidence       ││
│ │ Status: ✓ Approved   ││
│ │ [View Details ▼]     ││
│ └──────────────────────┘│
└──────────────────────────┘
```

## Component Structure

### TypeScript Interfaces
```typescript
interface ProductResult {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  assignedCategory: {
    id: string;
    name: string;
    path: string;
  };
  confidence: number;
  status: 'approved' | 'pending' | 'rejected';
  reasoning: string;
  alternatives: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }>;
  timestamp: number;
}

interface ProductResultsTableProps {
  jobId: string;
  results: ProductResult[];
  onApprove: (productIds: string[]) => void;
  onReject: (productIds: string[]) => void;
  onChangeCategory: (productId: string, categoryId: string) => void;
  onExport: () => void;
}
```

### Component Architecture
```tsx
// Main component structure
<ProductResultsTable>
  <TableHeader>
    <SearchBar />
    <FilterDropdowns />
    <BulkActions />
    <ExportButton />
  </TableHeader>
  
  <Table>
    <TableHead>
      <SelectAllCheckbox />
      <SortableColumns />
    </TableHead>
    
    <TableBody>
      {results.map(result => (
        <CollapsibleRow key={result.id}>
          <ProductSummary />
          <ExpandedDetails />
        </CollapsibleRow>
      ))}
    </TableBody>
  </Table>
  
  <TableFooter>
    <ResultsCount />
    <Pagination />
  </TableFooter>
</ProductResultsTable>
```

## Design Tokens

### Colors
```css
/* Status Indicators */
--status-approved: oklch(0.6 0.118 184.704);      /* Success blue */
--status-pending: oklch(0.828 0.189 84.429);      /* Warning yellow */
--status-rejected: oklch(0.577 0.245 27.325);     /* Error red */

/* Confidence Score Gradient */
--confidence-high: oklch(0.6 0.118 184.704);      /* 80-100% */
--confidence-medium: oklch(0.828 0.189 84.429);   /* 60-79% */
--confidence-low: oklch(0.577 0.245 27.325);      /* 0-59% */

/* Table Colors */
--table-header-bg: var(--muted);
--table-row-hover: var(--accent);
--table-border: var(--border);
```

### Spacing
```css
/* Table Spacing */
--table-padding-x: 1rem;
--table-padding-y: 0.75rem;
--table-gap: 0.5rem;

/* Mobile Spacing */
--mobile-card-gap: 1rem;
--mobile-card-padding: 1rem;
```

### Typography
```css
/* Table Typography */
--table-header-font: 600 0.875rem var(--font-sans);
--table-cell-font: 400 0.875rem var(--font-sans);
--confidence-font: 500 0.875rem var(--font-mono);
```

## Interactions

### Search & Filter
- **Real-time search**: Debounced 300ms search across product names and SKUs
- **Category filter**: Hierarchical dropdown with category tree
- **Status filter**: Multi-select for approved/pending/rejected
- **Confidence filter**: Range slider (0-100%)

### Sorting
- **Sortable columns**: Product Name, SKU, Category, Confidence Score, Status
- **Default sort**: By confidence score (descending)
- **Multi-column sort**: Hold Shift for secondary sort

### Selection & Bulk Actions
- **Row selection**: Checkbox per row + select all
- **Bulk actions dropdown**:
  - Approve Selected
  - Reject Selected
  - Change Category
  - Export Selected

### Row Expansion
- **Click interaction**: Chevron icon or row click expands details
- **Animation**: Smooth height transition (200ms ease-out)
- **Multiple expanded**: Allow multiple rows expanded simultaneously

## Responsive Behavior

### Breakpoints
```css
/* Desktop */
@media (min-width: 1200px) {
  /* Full table view with all columns */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1199px) {
  /* Hide SKU column, compact spacing */
}

/* Mobile */
@media (max-width: 767px) {
  /* Card-based layout */
}
```

### Mobile Adaptations
- Table converts to stacked cards
- Filters move to collapsible panel
- Bulk actions in bottom sheet
- Horizontal scroll for category paths

## Accessibility

### ARIA Labels
```html
<table role="table" aria-label="Product categorization results">
  <thead role="rowgroup">
    <tr role="row">
      <th role="columnheader" aria-sort="none">Product Name</th>
    </tr>
  </thead>
</table>
```

### Keyboard Navigation
- **Tab**: Navigate through interactive elements
- **Space**: Toggle row selection/expansion
- **Enter**: Trigger primary action (approve)
- **Arrow keys**: Navigate table cells (when focused)

### Screen Reader Support
- Announce row count and current position
- Read confidence scores as percentages
- Describe status with meaningful text
- Provide context for AI reasoning

## Implementation with Existing Components

### Using UI Components
```tsx
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const variants = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive'
  };
  
  return (
    <Badge variant={variants[status]}>
      {status}
    </Badge>
  );
}

// Confidence Score Component
function ConfidenceScore({ score }: { score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <span className={`font-mono font-medium ${getColor(score)}`}>
      {score}%
    </span>
  );
}
```

## Performance Optimizations

### Virtualization
- Use React Virtual for tables > 100 rows
- Lazy load expanded content
- Debounce search and filter operations

### Data Management
- Paginate results (20-50 per page)
- Cache filter results
- Optimistic UI updates for status changes

### Loading States
```tsx
// Skeleton loader for table rows
function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-muted rounded mb-2" />
      ))}
    </div>
  );
}
```

## Export Functionality

### CSV Export Format
```csv
Product Name,SKU,Assigned Category,Confidence Score,Status,AI Reasoning
"Weber Grill Brush","WB-12345","Accessories > Cleaning Tools",92,"Approved","Product type identified as cleaning accessory..."
```

### Export Options
- Current view (filtered/sorted)
- Selected rows only
- All results
- Include AI reasoning (optional)

## Error Handling

### Empty States
```tsx
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-12">
      {hasFilters ? (
        <>
          <p className="text-muted-foreground">No products match your filters</p>
          <Button variant="link" onClick={clearFilters}>Clear filters</Button>
        </>
      ) : (
        <p className="text-muted-foreground">No categorization results yet</p>
      )}
    </div>
  );
}
```

### Error States
- Network errors: Show retry button
- Validation errors: Inline error messages
- Permission errors: Appropriate messaging

## Integration Points

### With AI Categorization System
- Real-time updates via Convex subscriptions
- Optimistic updates for user actions
- Batch operations for bulk changes

### With Category Management
- Category selector for reassignment
- Link to category details
- Show category hierarchy breadcrumbs

### With Product Catalog
- Link to product detail pages
- Show product images on hover
- Quick edit product info

## Future Enhancements

1. **Advanced Filtering**
   - Multi-category selection
   - Date range filters
   - Custom confidence thresholds

2. **AI Insights Dashboard**
   - Categorization accuracy metrics
   - Common misclassifications
   - Improvement suggestions

3. **Collaboration Features**
   - Comments on categorizations
   - Assignment to team members
   - Approval workflows

4. **Machine Learning Integration**
   - Learn from user corrections
   - Improve confidence scoring
   - Suggest category merges